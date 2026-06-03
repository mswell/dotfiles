import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
type Tier = "cheap" | "daily" | "hard" | "premium";
type Mode = "auto" | "manual" | "off";

interface RouteChoice {
	tier: Tier;
	role: string;
	models: string[];
	thinking: Exclude<ThinkingLevel, "off" | "minimal">;
	confidence: number;
	reason: string;
	premium?: boolean;
}

interface PersistedState {
	mode?: Mode;
	allowPremium?: boolean;
}

const STATE_ENTRY = "copilot-auto-router-state";
const STATUS_KEY = "copilot-auto-router";

// Catálogo baseado em `pi --list-models github-copilot` (2026-06-03)
// gemini-2.5-pro REMOVIDO das rotas automáticas (limite de 10 imagens, legado)
// gpt-5.5 só em premium com confirmação
// xhigh nunca automático
const MODEL_ROLES = {
	cheap:         ["claude-haiku-4.5", "gpt-5.4-mini", "gpt-5-mini", "gemini-3.5-flash", "gemini-3-flash-preview", "grok-code-fast-1", "gpt-4.1", "gpt-4o"],
	dailyCoding:   ["gpt-5.3-codex", "gpt-5.2-codex", "gpt-5.4", "gpt-5.2", "claude-sonnet-4.6"],
	dailyAnalysis: ["gpt-5.4", "gpt-5.2", "gemini-3.1-pro-preview", "claude-sonnet-4.6", "gpt-5.2-codex"],
	vision:        ["gemini-3.5-flash", "gemini-3-flash-preview", "claude-sonnet-4.6", "gpt-5-mini", "gpt-4.1"],
	hard:          ["claude-sonnet-4.6", "gpt-5.4", "gpt-5.2", "gemini-3.1-pro-preview", "claude-opus-4.5"],
	premium:       ["claude-opus-4.8", "claude-opus-4.7", "claude-opus-4.6", "claude-opus-4.5", "gpt-5.5"],
} as const;

const ACK_RE     = /^(yes|no|sim|não|nao|ok|okay|thanks|obrigado|valeu|beleza|sure|yep|nope|nah|s|n|y|continua|continue|vai|next|feito|pronto)\.?$/i;
const CODE_RE    = /\b(implement|implementation|fix|debug|test|tests|refactor|code|patch|typescript|javascript|python|go|rust|implementar|implementa|corrigir|corrige|depurar|testar|testes|refatorar|ajustar|editar)\b/i;
const PATH_RE    = /[\w./-]+\.(ts|tsx|js|jsx|py|rs|go|java|cpp|c|h|rb|php|sh|ya?ml|json|toml|sql|md|css|scss|html)\b/i;
const HARD_RE    = /\b(architecture|arquitetura|diagnose|diagnosticar|hard bug|bug dif[ií]cil|race condition|deadlock|memory leak|performance regression|security|vulnerability|exploit|auth bypass|migration|rewrite|system design|distributed|concurrency|decis[aã]o cr[ií]tica)\b/i;
const PREMIUM_RE = /\b(premium|opus|gpt-5\.5|max quality|melhor modelo|stuck|travou|último recurso|ultimo recurso|critical review|revis[aã]o final)\b/i;
const SUMMARY_RE = /\b(summary|summarize|resumo|resumir|explain|explica|translate|traduz|format|formata|list|lista)\b/i;
// "print" e "tela" removidos — causavam falso positivo em PT-BR sem imagem real
const VISION_RE  = /\b(image|screenshot|vision|imagem|captura|ui visual)\b/i;

// Prompts de resumo/lista simples ficam em cheap até 180 chars (evita escalar por palavra "lista")
const SIMPLE_SUMMARY_MAX_CHARS = 180;

function isCopilot(ctx: ExtensionContext): boolean {
	return ctx.model?.provider === "github-copilot";
}

function hasImages(images: unknown): boolean {
	return Array.isArray(images) && images.length > 0;
}

function modelLabel(modelId: string | undefined): string {
	return modelId ? modelId.replace(/^claude-/, "c-").replace(/^gemini-/, "g-").replace(/^gpt-/, "g") : "?";
}

function resolveCopilotModel(ctx: ExtensionContext, ids: readonly string[]) {
	for (const id of ids) {
		const model = ctx.modelRegistry.find("github-copilot", id);
		if (model) return { id, model };
	}
	return undefined;
}

function chooseRoute(prompt: string, images: unknown, recentToolCalls: number): RouteChoice {
	const text   = prompt.trim();
	const lower  = text.toLowerCase();
	const length = text.length;

	// Só considera visão se há imagem REAL no payload — sem inferência por texto
	const image   = hasImages(images);
	const hasCode = CODE_RE.test(lower) || PATH_RE.test(text) || text.includes("```");
	const hard    = HARD_RE.test(lower) || recentToolCalls >= 8 || (hasCode && length > 1200);
	const premium = PREMIUM_RE.test(lower) || (hard && /\b(stuck|travou|falhou de novo|failed again)\b/i.test(lower));

	if (premium) {
		return { tier: "premium", role: "premium", models: [...MODEL_ROLES.premium], thinking: "high", confidence: 0.95, reason: "premium/stuck/critical-review signal", premium: true };
	}
	if (image) {
		return { tier: "daily", role: "vision", models: [...MODEL_ROLES.vision], thinking: hasCode ? "medium" : "low", confidence: 0.93, reason: "imagem real no payload; Gemini 3.5 Flash preferred" };
	}
	if (ACK_RE.test(text) || (length < SIMPLE_SUMMARY_MAX_CHARS && SUMMARY_RE.test(lower))) {
		return { tier: "cheap", role: "cheap", models: [...MODEL_ROLES.cheap], thinking: "low", confidence: 0.9, reason: "short/simple/ack prompt" };
	}
	if (hard) {
		return { tier: "hard", role: "hard", models: [...MODEL_ROLES.hard], thinking: "high", confidence: 0.91, reason: "hard debugging/security/architecture or tool-heavy work" };
	}
	if (hasCode) {
		return { tier: "daily", role: "daily-coding", models: [...MODEL_ROLES.dailyCoding], thinking: length > 500 ? "medium" : "low", confidence: 0.88, reason: "normal coding task; GPT-5.3-Codex preferred" };
	}
	if (length > 900 || (SUMMARY_RE.test(lower) && length >= SIMPLE_SUMMARY_MAX_CHARS)) {
		return { tier: "daily", role: "daily-analysis", models: [...MODEL_ROLES.dailyAnalysis], thinking: "medium", confidence: 0.84, reason: "analysis/large-context task" };
	}
	return { tier: "cheap", role: "cheap", models: [...MODEL_ROLES.cheap], thinking: "low", confidence: 0.82, reason: "default low-cost triage" };
}

export default function copilotAutoRouter(pi: ExtensionAPI) {
	let mode: Mode = "auto";
	let allowPremium = false;
	let lastChoice: RouteChoice | undefined;
	let recentToolCalls = 0;

	function updateStatus(ctx: ExtensionContext): void {
		if (!isCopilot(ctx) || mode === "off") return ctx.ui.setStatus(STATUS_KEY, undefined);
		if (mode === "manual") return ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("dim", "copilot-route:manual"));
		if (!lastChoice) return ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("dim", "copilot-route:auto"));
		const color = lastChoice.premium ? "warning" : "accent";
		ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg(color, `copilot:${lastChoice.tier}:${lastChoice.thinking}`));
	}

	function restoreState(ctx: ExtensionContext): void {
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "custom" || (entry as { customType?: string }).customType !== STATE_ENTRY) continue;
			const data = (entry as { data?: PersistedState }).data;
			if (data?.mode === "auto" || data?.mode === "manual" || data?.mode === "off") mode = data.mode;
			if (typeof data?.allowPremium === "boolean") allowPremium = data.allowPremium;
		}
	}

	async function applyChoice(choice: RouteChoice, ctx: ExtensionContext): Promise<void> {
		lastChoice = choice;
		if (choice.premium && !allowPremium) {
			const ok = await ctx.ui.confirm("Escalar para modelo premium do Copilot?", `${choice.reason}\nCandidates: ${choice.models.join(", ")}\nReasoning: ${choice.thinking}`);
			if (!ok) {
				const fallback: RouteChoice = { tier: "hard", role: "hard", models: [...MODEL_ROLES.hard], thinking: "high", confidence: 0.82, reason: "premium denied; using hard tier instead" };
				lastChoice = fallback;
				return applyChoice(fallback, ctx);
			}
		}

		const resolved = resolveCopilotModel(ctx, choice.models);
		if (!resolved) {
			pi.setThinkingLevel(choice.thinking);
			ctx.ui.notify(`Copilot router: no model found for ${choice.role}; adjusted reasoning to ${choice.thinking}`, "warning");
			updateStatus(ctx);
			return;
		}

		if (ctx.model?.id !== resolved.id) {
			const success = await pi.setModel(resolved.model);
			if (!success) ctx.ui.notify(`Copilot router: failed to switch to ${resolved.id}; keeping ${ctx.model?.id ?? "current model"}`, "warning");
		}
		pi.setThinkingLevel(choice.thinking);
		ctx.ui.notify(`Copilot router: ${choice.tier} → ${modelLabel(resolved.id)} / ${choice.thinking} (${choice.reason})`, "info");
		updateStatus(ctx);
	}

	pi.on("session_start", async (_event, ctx) => {
		restoreState(ctx);
		recentToolCalls = 0;
		lastChoice = undefined;
		updateStatus(ctx);
	});

	pi.on("model_select",         async (_event, ctx) => updateStatus(ctx));
	pi.on("thinking_level_select", async (_event, ctx) => updateStatus(ctx));

	pi.on("turn_end", async (event, ctx) => {
		recentToolCalls = Math.min(20, recentToolCalls + (event.toolResults?.length ?? 0));
		updateStatus(ctx);
	});

	pi.on("before_agent_start", async (event, ctx) => {
		if (mode !== "auto" || !isCopilot(ctx)) return;
		const choice = chooseRoute(event.prompt ?? "", event.images, recentToolCalls);
		recentToolCalls = Math.max(0, recentToolCalls - 2);
		await applyChoice(choice, ctx);
	});

	pi.registerCommand("copilot-route", {
		description: "GitHub Copilot model router (auto|manual|off|why|premium on|premium off)",
		handler: async (args, ctx) => {
			const arg = args?.trim().toLowerCase() ?? "";
			if (!arg || arg === "why") {
				const current = `${ctx.model?.provider ?? "?"}/${ctx.model?.id ?? "?"}`;
				const why = lastChoice ? `${lastChoice.tier}/${lastChoice.role} ${lastChoice.thinking}: ${lastChoice.reason}` : "no route yet";
				ctx.ui.notify(`Copilot route: mode=${mode}, premium=${allowPremium ? "auto" : "confirm"}, current=${current}, last=${why}`, "info");
				return;
			}
			if (arg === "auto" || arg === "manual" || arg === "off") {
				mode = arg;
				pi.appendEntry(STATE_ENTRY, { mode, allowPremium });
				ctx.ui.notify(`Copilot route mode: ${mode}`, "info");
				updateStatus(ctx);
				return;
			}
			if (arg === "premium on" || arg === "premium auto") {
				allowPremium = true;
				pi.appendEntry(STATE_ENTRY, { mode, allowPremium });
				ctx.ui.notify("Copilot premium routing: auto enabled for this session branch", "warning");
				return;
			}
			if (arg === "premium off" || arg === "premium confirm") {
				allowPremium = false;
				pi.appendEntry(STATE_ENTRY, { mode, allowPremium });
				ctx.ui.notify("Copilot premium routing: confirmation required", "info");
				return;
			}
			ctx.ui.notify("Use: /copilot-route auto|manual|off|why|premium on|premium off", "error");
		},
	});
}
