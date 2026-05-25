/**
 * Copilot Auto Router Extension
 *
 * Provider-specific router for GitHub Copilot models, inspired by Amp's
 * purpose-based model table while staying inside the `github-copilot` provider.
 *
 * Amp-style modes:
 *   fast/rush    → gpt-5.5                 (thinking: low)
 *   main/smart   → claude-opus-4.7         (thinking: medium)
 *   think/deep   → gpt-5.5                 (thinking: high)
 *   search       → gemini-3.5-flash        (thinking: low)
 *   vision       → gemini-3.5-flash        (thinking: medium)
 *
 * Only activates when the current model is from `github-copilot`.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
type Purpose = "fast" | "main" | "think" | "search" | "vision";
type PurposeAlias = Purpose | "rush" | "smart" | "deep";

interface RouteResult {
	purpose: Purpose;
	provider: string;
	model: string;
	thinking: ThinkingLevel;
	external: boolean;
}

const COPILOT_PROVIDER = "github-copilot";

const ROUTES: Record<Purpose, RouteResult> = {
	fast: {
		purpose: "fast",
		provider: COPILOT_PROVIDER,
		model: "gpt-5.5",
		thinking: "low",
		external: false,
	},
	main: {
		purpose: "main",
		provider: COPILOT_PROVIDER,
		model: "claude-opus-4.7",
		thinking: "medium",
		external: false,
	},
	think: {
		purpose: "think",
		provider: COPILOT_PROVIDER,
		model: "gpt-5.5",
		thinking: "high",
		external: false,
	},
	search: {
		purpose: "search",
		provider: COPILOT_PROVIDER,
		model: "gemini-3.5-flash",
		thinking: "low",
		external: false,
	},
	vision: {
		purpose: "vision",
		provider: COPILOT_PROVIDER,
		model: "gemini-3.5-flash",
		thinking: "medium",
		external: false,
	},
};

const LABELS: Record<Purpose, string> = {
	fast: "⚡ rush/fast → GPT-5.5 low",
	main: "✳️ smart/main → Opus 4.7",
	think: "🧠 deep/think → GPT-5.5 high",
	search: "🔎 search → Gemini 3.5 Flash",
	vision: "🖼️ vision → Gemini 3.5 Flash",
};

const EMOJI: Record<Purpose, string> = {
	fast: "⚡",
	main: "✳️",
	think: "🧠",
	search: "🔎",
	vision: "🖼️",
};

const CONTINUATION_PATTERNS = [
	/^(continua|continue|segue|go on|vai|pr[óo]ximo|next|ok|okay|faz isso|do it|sim|yes|feito|done|pode|beleza)\.?$/i,
];

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico|avif)\b/i;
const CLIPBOARD_IMAGE_PATTERN = /\/tmp\/pi-clipboard-[a-f0-9-]+\.(png|jpg|jpeg|gif|webp)/i;

const ARCHITECT_KEYWORDS = [
	"architecture", "arquitetura", "system design", "design do sistema",
	"adr", "tradeoff", "trade-off", "decisão", "decision", "refactor amplo",
	"large refactor", "clean architecture", "ddd", "domain driven", "boundary",
	"fronteira", "monorepo", "microservices", "microsserviços",
];

const THINK_KEYWORDS = [
	"debug", "diagnose", "diagnóstico", "diagnosticar", "bug", "erro", "error",
	"stack trace", "traceback", "exception", "falha", "failing", "failed",
	"quebrou", "broken", "race condition", "deadlock", "memory leak",
	"regression", "regressão", "flaky", "hipótese", "hypothesis",
];

const SEARCH_KEYWORDS = [
	"find", "search", "grep", "rg", "procure", "procurar", "ache", "achar",
	"onde está", "onde fica", "where is", "locate", "localize", "explore",
	"explorar", "mapear", "liste arquivos", "list files",
];

const FAST_KEYWORDS = [
	"what is", "o que é", "define", "explique", "explain", "resuma", "summary",
	"traduz", "translate", "formata", "format", "lista", "list", "mostra", "show",
];

const CODE_FILE_PATTERN = /[\w./-]+\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|cpp|c|h|rb|php|sh|yaml|yml|json|toml|sql|md|vue|svelte)\b/i;
const CODE_TOKEN_PATTERN = /\b(function|const|let|var|import|export|class|interface|def |fn |func |pub |async |await|type |enum )\b/i;
const FAILURE_PATTERN = /(exit code\s+[1-9]|failed|failing|error:|exception|traceback|stack trace|segmentation fault|panic:|npm ERR!|tests? failed|falhou|erro)/i;

type LooseEntry = {
	type?: string;
	message?: { role?: string; content?: unknown[]; model?: string; provider?: string; stopReason?: string; errorMessage?: string };
	content?: unknown;
	toolName?: string;
	name?: string;
	result?: unknown;
	output?: unknown;
	data?: unknown;
	customType?: string;
};

function textFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((part) => {
			if (part && typeof part === "object" && "text" in part) {
				return String((part as { text?: unknown }).text ?? "");
			}
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

function includesAny(text: string, keywords: string[]): boolean {
	const lower = text.toLowerCase();
	return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function isContinuation(prompt: string): boolean {
	const trimmed = prompt.trim();
	if (trimmed.length > 40) return false;
	return CONTINUATION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function detectImages(prompt: string, eventImages?: unknown[]): boolean {
	if (eventImages && Array.isArray(eventImages) && eventImages.length > 0) return true;
	if (CLIPBOARD_IMAGE_PATTERN.test(prompt)) return true;

	for (const line of prompt.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("<!--")) {
			continue;
		}
		if (IMAGE_EXTENSIONS.test(trimmed) && /(?:^|\s|@|\/)[\w./-]+\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico|avif)\b/i.test(trimmed)) {
			return true;
		}
	}

	return false;
}

function shortModel(model: string): string {
	return model
		.replace("claude-", "")
		.replace("gemini-", "gem-")
		.replace("-preview", "")
		.replace("-flash", "-fl");
}

function routeForCopilotModel(modelId: string | undefined): RouteResult | undefined {
	if (!modelId) return undefined;
	return (Object.values(ROUTES) as RouteResult[]).find((route) => {
		return route.provider === COPILOT_PROVIDER && route.model === modelId;
	});
}

function normalizePurposeAlias(value: string): Purpose | undefined {
	const alias = value as PurposeAlias;
	if (alias === "rush") return "fast";
	if (alias === "smart") return "main";
	if (alias === "deep") return "think";
	if (alias in ROUTES) return alias as Purpose;
	return undefined;
}

export default function copilotAutoRouter(pi: ExtensionAPI) {
	if (process.env.COPILOT_SUBAGENT_CHILD === "1") return;

	let autoRouting = true;
	let lastRoute: RouteResult | undefined;
	let copilotRoutingActive = false;
	let recentToolCalls = 0;
	let turnsSinceReset = 0;
	let routeStats: Record<Purpose, number> = {
		fast: 0,
		main: 0,
		think: 0,
		search: 0,
		vision: 0,
	};

	function isCopilotActive(ctx: ExtensionContext): boolean {
		return ctx.model?.provider === COPILOT_PROVIDER;
	}

	function shouldRoute(ctx: ExtensionContext): boolean {
		return isCopilotActive(ctx);
	}

	function getRecentContext(ctx: ExtensionContext, maxEntries = 16): { text: string; sawToolFailure: boolean; toolCalls: number } {
		const entries = (ctx.sessionManager.getEntries() as LooseEntry[]).slice(-maxEntries);
		const texts: string[] = [];
		let sawToolFailure = false;
		let toolCalls = 0;

		for (const entry of entries) {
			if (entry.type === "message" && entry.message) {
				const role = entry.message.role ?? "";
				const text = textFromContent(entry.message.content);
				if (role === "user" || role === "assistant") texts.push(text);
				if (entry.message.errorMessage || entry.message.stopReason === "error") sawToolFailure = true;
				continue;
			}

			const entryText = [entry.content, entry.result, entry.output, entry.data]
				.map((value) => typeof value === "string" ? value : "")
				.filter(Boolean)
				.join("\n");
			if (entry.type?.includes("tool") || entry.toolName || entry.name) {
				toolCalls++;
				texts.push(entryText.slice(0, 2000));
				if (FAILURE_PATTERN.test(entryText)) sawToolFailure = true;
			}
		}

		return { text: texts.join("\n").slice(-8000), sawToolFailure, toolCalls };
	}

	function analyzeRoute(prompt: string, hasImages: boolean, ctx: ExtensionContext): RouteResult {
		if (hasImages) return ROUTES.vision;

		const recent = getRecentContext(ctx);
		const promptLower = prompt.toLowerCase().trim();
		const contextText = `${prompt}\n${recent.text}`;
		const continuation = isContinuation(prompt);

		if (continuation && lastRoute && lastRoute.purpose !== "vision") {
			return lastRoute;
		}

		// Priority order: think/architecture → search → fast → main.
		if (includesAny(contextText, ARCHITECT_KEYWORDS)) return ROUTES.think;

		if (
			recent.sawToolFailure ||
			FAILURE_PATTERN.test(contextText) ||
			includesAny(contextText, THINK_KEYWORDS) ||
			(prompt.includes("```") && prompt.length > 500)
		) {
			return ROUTES.think;
		}

		const hasSearchIntent = includesAny(contextText, SEARCH_KEYWORDS);
		const hasEditIntent = /\b(implement|implementar|edit|editar|altere|alterar|change|fix|corrigir|write|crie|criar|refactor|refatorar)\b/i.test(prompt);
		if (hasSearchIntent && !hasEditIntent) return ROUTES.search;

		const hasCode = prompt.includes("```") || CODE_FILE_PATTERN.test(prompt) || CODE_TOKEN_PATTERN.test(prompt);
		if (!hasCode && prompt.length < 90 && (includesAny(promptLower, FAST_KEYWORDS) || prompt.length < 25)) {
			return ROUTES.fast;
		}

		if (recent.toolCalls >= 8 && turnsSinceReset <= 3) return ROUTES.think;

		return ROUTES.main;
	}

	async function applyRoute(route: RouteResult, ctx: ExtensionContext, options: { manual?: boolean } = {}): Promise<boolean> {
		const model = ctx.modelRegistry.find(route.provider, route.model);
		if (!model) {
			ctx.ui.notify(`Modelo não encontrado no Pi registry: ${route.provider}/${route.model}`, "warning");
			return false;
		}

		pi.setThinkingLevel(route.thinking);

		if (ctx.model?.provider === route.provider && ctx.model.id === route.model) {
			lastRoute = route;
			if (route.provider === COPILOT_PROVIDER) copilotRoutingActive = true;
			if (!options.manual) routeStats[route.purpose]++;
			updateStatus(ctx);
			return true;
		}

		const success = await pi.setModel(model);
		if (success) {
			pi.setThinkingLevel(route.thinking);
			lastRoute = route;
			if (route.provider === COPILOT_PROVIDER) copilotRoutingActive = true;
			if (!options.manual) routeStats[route.purpose]++;
			updateStatus(ctx);
		}
		return success;
	}

	function updateStatus(ctx: ExtensionContext) {
		const theme = ctx.ui.theme;
		if (!shouldRoute(ctx) && !copilotRoutingActive) {
			ctx.ui.setStatus("copilot-router", undefined);
			return;
		}

		// Hide sibling provider-router statuses while Copilot routing is active.
		ctx.ui.setStatus("gpt-router", undefined);
		ctx.ui.setStatus("gem-router", undefined);
		ctx.ui.setStatus("zai-router", undefined);

		if (!autoRouting) {
			ctx.ui.setStatus("copilot-router", theme.fg("dim", "copilot:manual"));
			return;
		}

		if (lastRoute) {
			const text = lastRoute.external
				? `copilot→${EMOJI[lastRoute.purpose]} ${lastRoute.provider}/${lastRoute.model}`
				: `${EMOJI[lastRoute.purpose]}cop→${lastRoute.purpose}:${shortModel(lastRoute.model)}:${lastRoute.thinking}`;
			ctx.ui.setStatus("copilot-router", theme.fg(lastRoute.external ? "warning" : "accent", text));
		} else if (isCopilotActive(ctx)) {
			ctx.ui.setStatus("copilot-router", theme.fg("dim", "copilot:auto-ready"));
		}
	}

	pi.on("before_agent_start", async (event, ctx) => {
		if (!autoRouting || !shouldRoute(ctx)) return;

		const prompt = event.prompt ?? "";
		const hasImages = detectImages(prompt, event.images as unknown[]);

		if (hasImages) {
			await applyRoute(ROUTES.vision, ctx);
			return;
		}

		const route = analyzeRoute(prompt, hasImages, ctx);
		await applyRoute(route, ctx);
	});

	pi.on("turn_end", async (event, ctx) => {
		if (!shouldRoute(ctx)) return;

		const toolCount = event.toolResults?.length ?? 0;
		recentToolCalls += toolCount;
		turnsSinceReset++;
		if (turnsSinceReset > 5) {
			recentToolCalls = toolCount;
			turnsSinceReset = 1;
		}
		updateStatus(ctx);
	});

	pi.on("model_select", async (event, ctx) => {
		if (event.source === "set" || event.source === "cycle") {
			if (event.model.provider === COPILOT_PROVIDER) {
				copilotRoutingActive = true;
			} else {
				copilotRoutingActive = false;
				ctx.ui.setStatus("copilot-router", undefined);
			}
			updateStatus(ctx);
		}
	});

	pi.on("session_start", async (_event, ctx) => {
		for (const entry of ctx.sessionManager.getEntries() as LooseEntry[]) {
			if (entry.type === "custom" && entry.customType === "copilot-router-state") {
				const data = entry.data as {
					autoRouting?: boolean;
					routeStats?: Record<Purpose, number>;
					copilotRoutingActive?: boolean;
				} | undefined;
				if (data) {
					if (typeof data.autoRouting === "boolean") autoRouting = data.autoRouting;
					if (typeof data.routeStats === "object" && data.routeStats) {
						const s = data.routeStats as Record<string, number>;
						routeStats = { fast: s.fast ?? 0, main: s.main ?? 0, think: (s.think ?? 0) + (s.architect ?? 0), search: s.search ?? 0, vision: s.vision ?? 0 };
					}
					if (typeof data.copilotRoutingActive === "boolean") copilotRoutingActive = data.copilotRoutingActive;
				}
			}
		}

		recentToolCalls = 0;
		turnsSinceReset = 0;

		if (isCopilotActive(ctx)) {
			copilotRoutingActive = true;
		}
		updateStatus(ctx);
	});

	async function commandHandler(args: string | undefined, ctx: ExtensionContext) {
		const argLine = args?.trim() ?? "";
		const [cmd, value] = argLine.toLowerCase().split(/\s+/, 2);

		if (!cmd || cmd === "status") {
			const provider = ctx.model?.provider ?? "—";
			const model = ctx.model?.id ?? "none";
			const route = lastRoute ? LABELS[lastRoute.purpose] : "—";
			let info = `Copilot Auto Router\n\n`;
			info += `  Status: ${autoRouting ? "✅ auto" : "⏸️ manual"}\n`;
			info += `  Provider atual: ${isCopilotActive(ctx) ? "github-copilot ✓" : provider}\n`;
			info += `  Modelo atual: ${model}\n`;

			info += `  Última rota: ${route}\n`;
			info += `  Tool calls recentes: ${recentToolCalls} (${turnsSinceReset} turns)\n\n`;
			info += `  Purposes:\n`;
			for (const purpose of ["fast", "main", "think", "search", "vision"] as Purpose[]) {
				const route = ROUTES[purpose];
				info += `    ${EMOJI[purpose]} ${purpose.padEnd(9)} → ${route.provider}/${route.model} (${route.thinking}) [${routeStats[purpose]}]\n`;
			}
			info += `\n  Uso: /copilot-route auto|manual|status|rush|smart|deep|fast|main|think|search|vision|reset`; 
			ctx.ui.notify(info, "info");
			return;
		}

		if (cmd === "auto") {
			autoRouting = true;
			copilotRoutingActive = true;
			pi.appendEntry("copilot-router-state", { autoRouting, routeStats, copilotRoutingActive });
			ctx.ui.notify("Copilot auto-routing ativado ✅", "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "manual") {
			autoRouting = false;
			pi.appendEntry("copilot-router-state", { autoRouting, routeStats, copilotRoutingActive });
			ctx.ui.notify("Copilot auto-routing desativado ⏸️", "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "reset" || cmd === "stats") {
			routeStats = { fast: 0, main: 0, think: 0, search: 0, vision: 0 };
			pi.appendEntry("copilot-router-state", { autoRouting, routeStats, copilotRoutingActive });
			ctx.ui.notify("Estatísticas do Copilot router resetadas 📊", "info");
			return;
		}

		const purpose = normalizePurposeAlias(cmd);
		if (!purpose) {
			ctx.ui.notify("Purpose não encontrado. Use: rush/smart/deep, fast/main/think, search, vision, auto, manual, status, reset", "error");
			return;
		}

		autoRouting = false;
		const success = await applyRoute(ROUTES[purpose], ctx, { manual: true });
		if (success) {
			pi.appendEntry("copilot-router-state", { autoRouting, routeStats, copilotRoutingActive: true });
			ctx.ui.notify(`${LABELS[purpose]} aplicado; auto-routing desativado`, "info");
		}
		updateStatus(ctx);
	}

	pi.registerCommand("copilot-route", {
		description: "Show/control GitHub Copilot Amp-style routing",
		handler: commandHandler,
	});

	pi.registerCommand("cop-route", {
		description: "Alias for /copilot-route",
		handler: commandHandler,
	});
}
