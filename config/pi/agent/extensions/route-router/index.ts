import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig, saveConfig, getConfigPath } from "./config";
import { formatStatus, formatWhy, statusChip } from "./explain";
import { MODEL_ROLE_ORDER, providerForRole, resolveModelRole, shortModel, supportsRouteBase } from "./model-catalog";
import { decideRoute } from "./policy";
import { ROUTE_MODES, isRouteMode, type RouteConfig, type RouteDecision, type RouteMode, type SupportedProvider, type ThinkingLevel } from "./types";

const STATE_ENTRY = "route-router-state";
const STATUS_KEY = "route-router";

interface PersistedState {
	mode?: RouteMode;
}

function currentProvider(ctx: ExtensionContext): string | undefined {
	return ctx.model?.provider;
}

function currentModelId(ctx: ExtensionContext): string | undefined {
	return ctx.model?.id;
}

function isCurrentSupported(ctx: ExtensionContext): boolean {
	return supportsRouteBase(currentProvider(ctx), currentModelId(ctx));
}

function isSupportedProvider(provider: string | undefined): provider is SupportedProvider {
	return provider === "google" || provider === "openai-codex" || provider === "opencode-go";
}

function hasImages(images: unknown): boolean {
	return Array.isArray(images) && images.length > 0;
}

function thinkingInitial(level: ThinkingLevel | undefined): string {
	return level ? level.slice(0, 1) : "?";
}

function restoreSessionState(ctx: ExtensionContext, config: RouteConfig): RouteConfig {
	let next = { ...config };
	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type !== "custom" || (entry as { customType?: string }).customType !== STATE_ENTRY) continue;
		const data = (entry as { data?: PersistedState }).data;
		if (typeof data?.mode === "string" && isRouteMode(data.mode)) {
			next = { ...next, mode: data.mode };
		}
	}
	return next;
}

function annotateDecision(decision: RouteDecision, patch: Partial<RouteDecision>): RouteDecision {
	return { ...decision, ...patch };
}

export default async function routeRouter(pi: ExtensionAPI) {
	let config = await loadConfig();
	let lastDecision: RouteDecision | undefined;
	let recentToolCalls = 0;
	let turnsSinceToolReset = 0;
	let promptCounter = 0;
	let lastFamilySwitchAtPrompt = -999;

	function runtimeStatus(ctx: ExtensionContext) {
		return {
			config,
			currentProvider: currentProvider(ctx),
			currentModelId: currentModelId(ctx),
			currentThinking: pi.getThinkingLevel(),
			lastDecision,
			recentToolCalls,
			promptCounter,
			configPath: getConfigPath(),
		};
	}

	function updateStatus(ctx: ExtensionContext): void {
		if (!config.showStatus || config.mode === "off" || !isCurrentSupported(ctx)) {
			ctx.ui.setStatus(STATUS_KEY, undefined);
			return;
		}

		if (config.mode === "manual") {
			ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("dim", "route:manual"));
			return;
		}

		if (!lastDecision || !lastDecision.active) {
			ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("dim", `route:${config.mode}`));
			return;
		}

		const provider = currentProvider(ctx) ?? "";
		const model = currentModelId(ctx) ?? "";
		const chip = statusChip(lastDecision, provider, model);
		const color = lastDecision.antiChurn ? "warning" : "accent";
		ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg(color, chip));
	}

	async function setMode(mode: RouteMode, ctx: ExtensionContext): Promise<void> {
		config = { ...config, mode };
		await saveConfig(config);
		pi.appendEntry(STATE_ENTRY, { mode });
		if (mode === "off") {
			ctx.ui.setStatus(STATUS_KEY, undefined);
		}
		ctx.ui.notify(`Route mode: ${mode}`, "info");
		updateStatus(ctx);
	}

	function shouldStayForAntiChurn(decision: RouteDecision, targetProvider: SupportedProvider, ctx: ExtensionContext): boolean {
		const provider = currentProvider(ctx);
		if (!isSupportedProvider(provider)) return false;
		if (provider === targetProvider) return false;
		if (decision.explicit) return false;

		const belowConfidenceThreshold = decision.confidence < config.switchConfidenceThreshold;
		const recentlySwitched = promptCounter - lastFamilySwitchAtPrompt < config.familySwitchCooldownPrompts;
		const strongPhaseSignal = decision.confidence >= 0.92;
		return belowConfidenceThreshold || (recentlySwitched && !strongPhaseSignal);
	}

	async function applyDecision(decision: RouteDecision, ctx: ExtensionContext): Promise<RouteDecision> {
		if (!decision.apply || !decision.targetRole || !decision.thinking) {
			return decision;
		}

		const resolved = resolveModelRole(ctx.modelRegistry, decision.targetRole);
		if (!resolved) {
			pi.setThinkingLevel(decision.thinking);
			return annotateDecision(decision, {
				applied: false,
				appliedThinking: pi.getThinkingLevel() as ThinkingLevel,
				applyNote: `No available model for role ${decision.targetRole}; adjusted thinking only.`,
			});
		}

		let nextDecision = annotateDecision(decision, { resolvedModel: resolved.id });
		const currentP = currentProvider(ctx);
		const currentId = currentModelId(ctx);
		const targetProvider = providerForRole(decision.targetRole);
		const targetFullName = `${targetProvider}/${resolved.id}`;

		if (shouldStayForAntiChurn(nextDecision, targetProvider, ctx)) {
			pi.setThinkingLevel(decision.thinking);
			return annotateDecision(nextDecision, {
				antiChurn: true,
				applied: false,
				appliedModel: currentP && currentId ? `${currentP}/${currentId}` : undefined,
				appliedThinking: pi.getThinkingLevel() as ThinkingLevel,
				applyNote: `Stayed on current model to avoid low-confidence/frequent family switching; target suggestion was ${targetFullName}.`,
			});
		}

		let modelChanged = false;
		if (currentP !== targetProvider || currentId !== resolved.id) {
			const success = await pi.setModel(resolved.model);
			if (!success) {
				pi.setThinkingLevel(decision.thinking);
				return annotateDecision(nextDecision, {
					applied: false,
					appliedThinking: pi.getThinkingLevel() as ThinkingLevel,
					applyNote: `Failed to apply ${targetFullName}; missing auth/API key or model unavailable. Adjusted thinking only.`,
				});
			}
			modelChanged = true;
			if (currentP !== targetProvider) {
				lastFamilySwitchAtPrompt = promptCounter;
			}
		}

		pi.setThinkingLevel(decision.thinking);
		nextDecision = annotateDecision(nextDecision, {
			applied: true,
			appliedModel: targetFullName,
			appliedThinking: pi.getThinkingLevel() as ThinkingLevel,
			applyNote: modelChanged ? `Applied ${targetFullName}.` : `Kept current model ${targetFullName}; adjusted thinking.`,
		});
		return nextDecision;
	}

	pi.on("session_start", async (_event, ctx) => {
		config = restoreSessionState(ctx, config);
		recentToolCalls = 0;
		turnsSinceToolReset = 0;
		promptCounter = 0;
		lastFamilySwitchAtPrompt = -999;
		lastDecision = undefined;
		updateStatus(ctx);
	});

	pi.on("model_select", async (_event, ctx) => {
		updateStatus(ctx);
	});

	pi.on("thinking_level_select", async (_event, ctx) => {
		updateStatus(ctx);
	});

	pi.on("turn_end", async (event, ctx) => {
		if (!isCurrentSupported(ctx)) return;
		const toolCount = event.toolResults?.length ?? 0;
		recentToolCalls += toolCount;
		turnsSinceToolReset++;
		if (turnsSinceToolReset > 5) {
			recentToolCalls = toolCount;
			turnsSinceToolReset = 1;
		}
		updateStatus(ctx);
	});

	pi.on("before_agent_start", async (event, ctx) => {
		if (config.mode === "off") {
			lastDecision = decideRoute({
				mode: config.mode,
				currentProvider: currentProvider(ctx),
				currentModelId: currentModelId(ctx),
				prompt: "",
			});
			updateStatus(ctx);
			return;
		}

		promptCounter++;
		const usage = ctx.getContextUsage();
		const decision = decideRoute({
			mode: config.mode,
			currentProvider: currentProvider(ctx),
			currentModelId: currentModelId(ctx),
			prompt: event.prompt ?? "",
			roughContextTokens: usage?.tokens ?? undefined,
			hasImages: hasImages(event.images),
			recentToolCalls,
		});

		lastDecision = decision;
		if (!decision.active) {
			updateStatus(ctx);
			return;
		}

		if (config.mode === "manual") {
			lastDecision = annotateDecision(decision, {
				apply: false,
				applyNote: "Manual mode: suggestion only; no model or thinking changes applied.",
			});
			updateStatus(ctx);
			return;
		}

		lastDecision = await applyDecision(decision, ctx);
		updateStatus(ctx);
	});

	pi.registerCommand("route", {
		description: "Show/control GPT/Gemini/OpenCode Go routing (mode [cheap|dev|bugbounty|max|manual|off] | why)",
		handler: async (args, ctx) => {
			const raw = args?.trim() ?? "";
			const [command, ...rest] = raw.split(/\s+/).filter(Boolean);
			const arg = command?.toLowerCase();

			if (!arg) {
				ctx.ui.notify(formatStatus(runtimeStatus(ctx)), "info");
				return;
			}

			if (arg === "why") {
				ctx.ui.notify(formatWhy(lastDecision, runtimeStatus(ctx)), "info");
				return;
			}

			if (arg === "status") {
				ctx.ui.notify(formatStatus(runtimeStatus(ctx)), "info");
				return;
			}

			if (arg === "mode") {
				const modeArg = rest[0]?.toLowerCase();
				if (modeArg) {
					if (!isRouteMode(modeArg)) {
						ctx.ui.notify(`Unknown route mode "${modeArg}". Use: ${ROUTE_MODES.join(", ")}`, "error");
						return;
					}
					await setMode(modeArg, ctx);
					return;
				}

				const selected = await ctx.ui.select("Route mode", [...ROUTE_MODES]);
				if (!selected) return;
				if (isRouteMode(selected)) {
					await setMode(selected, ctx);
				}
				return;
			}

			// Convenience: /route dev, /route off, etc. The public surface remains one command.
			if (isRouteMode(arg)) {
				await setMode(arg, ctx);
				return;
			}

			if (arg === "models") {
				const lines: string[] = ["Route model fallbacks:"];
				for (const role of MODEL_ROLE_ORDER) {
					const resolved = resolveModelRole(ctx.modelRegistry, role);
					const provider = providerForRole(role);
					lines.push(`  ${role}: ${resolved ? `${provider}/${resolved.id} (${shortModel(provider, resolved.id)})` : "unavailable"}`);
				}
				ctx.ui.notify(lines.join("\n"), "info");
				return;
			}

			ctx.ui.notify("Unknown /route option. Use: /route, /route mode [mode], /route why", "error");
		},
	});
}
