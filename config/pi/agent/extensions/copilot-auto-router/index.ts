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
type Workflow = "rush" | "smart" | "deep" | "search" | "vision";
type ValidationLevel = "none" | "light" | "standard" | "strict";
type SubagentRole = "search" | "oracle" | "review" | "librarian" | "handoff";

interface RoutePlan {
	purpose: Purpose;
	provider: string;
	model: string;
	thinking: ThinkingLevel;
	external: boolean;
	workflow: Workflow;
	subagents: SubagentRole[];
	requiresPlanSignoff: boolean;
	requiresReviewTour: boolean;
	validationLevel: ValidationLevel;
	reason: string;
	confidence: number;
	signals: string[];
}

const COPILOT_PROVIDER = "github-copilot";

const ROUTES: Record<Purpose, RoutePlan> = {
	fast: {
		purpose: "fast",
		provider: COPILOT_PROVIDER,
		model: "gpt-5.5",
		thinking: "low",
		external: false,
		workflow: "rush",
		subagents: [],
		requiresPlanSignoff: false,
		requiresReviewTour: false,
		validationLevel: "light",
		reason: "simple/low-overhead prompt",
		confidence: 1,
		signals: [],
	},
	main: {
		purpose: "main",
		provider: COPILOT_PROVIDER,
		model: "claude-opus-4.7",
		thinking: "medium",
		external: false,
		workflow: "smart",
		subagents: [],
		requiresPlanSignoff: false,
		requiresReviewTour: false,
		validationLevel: "standard",
		reason: "default smart coding workflow",
		confidence: 1,
		signals: [],
	},
	think: {
		purpose: "think",
		provider: COPILOT_PROVIDER,
		model: "gpt-5.5",
		thinking: "high",
		external: false,
		workflow: "deep",
		subagents: [],
		requiresPlanSignoff: false,
		requiresReviewTour: false,
		validationLevel: "strict",
		reason: "deep reasoning/debug/architecture workflow",
		confidence: 1,
		signals: [],
	},
	search: {
		purpose: "search",
		provider: COPILOT_PROVIDER,
		model: "gemini-3.5-flash",
		thinking: "low",
		external: false,
		workflow: "search",
		subagents: [],
		requiresPlanSignoff: false,
		requiresReviewTour: false,
		validationLevel: "none",
		reason: "retrieval-heavy prompt",
		confidence: 1,
		signals: [],
	},
	vision: {
		purpose: "vision",
		provider: COPILOT_PROVIDER,
		model: "gemini-3.5-flash",
		thinking: "medium",
		external: false,
		workflow: "vision",
		subagents: [],
		requiresPlanSignoff: false,
		requiresReviewTour: false,
		validationLevel: "standard",
		reason: "image/visual prompt",
		confidence: 1,
		signals: [],
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

const RISKY_KEYWORDS = [
	"auth", "authentication", "authorization", "oauth", "token", "secret", "password",
	"segurança", "security", "permission", "permissão", "encrypt", "criptografia",
	"migration", "migração", "schema", "database", "produção", "production",
];

const LARGE_CHANGE_KEYWORDS = [
	"refactor", "refatorar", "reestruture", "restructure", "rewrite", "reescrever",
	"migrate", "migrar", "large", "amplo", "todos os arquivos", "whole codebase",
];

const EXTERNAL_RESEARCH_KEYWORDS = [
	"docs", "documentação", "library", "biblioteca", "api externa", "framework",
	"versão", "release notes", "changelog", "github", "npm", "pypi",
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

function stripRouterArtifacts(text: string): string {
	return text
		.replace(/# Copilot Route Plan[\s\S]*?Guidance:.*?(?:\n|$)/gi, "\n")
		.replace(/^\s*(Purpose|Reason|Model|Suggested subagents|Plan sign-off|Validation level|Review tour):.*$/gim, "")
		.replace(/Guidance: treat this as a workflow route.*$/gim, "")
		.trim();
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

function routeForCopilotModel(modelId: string | undefined): RoutePlan | undefined {
	if (!modelId) return undefined;
	return (Object.values(ROUTES) as RoutePlan[]).find((route) => {
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
	let lastRoute: RoutePlan | undefined;
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
	let workflowStats = {
		autoSearchHints: 0,
		oracleHints: 0,
		reviewTourHints: 0,
		planSignoffHints: 0,
		manualOverrides: 0,
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
			if (entry.customType === "copilot-router-plan") continue;

			if (entry.type === "message" && entry.message) {
				const role = entry.message.role ?? "";
				const text = stripRouterArtifacts(textFromContent(entry.message.content));
				if ((role === "user" || role === "assistant") && text) texts.push(text);
				if (entry.message.errorMessage || entry.message.stopReason === "error") sawToolFailure = true;
				continue;
			}

			const entryText = stripRouterArtifacts([entry.content, entry.result, entry.output, entry.data]
				.map((value) => typeof value === "string" ? value : "")
				.filter(Boolean)
				.join("\n"));
			if (entry.type?.includes("tool") || entry.toolName || entry.name) {
				toolCalls++;
				if (entryText) texts.push(entryText.slice(0, 2000));
				if (FAILURE_PATTERN.test(entryText)) sawToolFailure = true;
			}
		}

		return { text: texts.join("\n").slice(-8000), sawToolFailure, toolCalls };
	}

	function withReason(route: RoutePlan, reason: string, overrides: Partial<RoutePlan> = {}): RoutePlan {
		return {
			...route,
			...overrides,
			subagents: overrides.subagents ?? [...route.subagents],
			reason,
			confidence: overrides.confidence ?? route.confidence,
			signals: overrides.signals ?? [...route.signals],
		};
	}

	function analyzeRoute(prompt: string, hasImages: boolean, ctx: ExtensionContext): RoutePlan {
		if (hasImages) return withReason(ROUTES.vision, "image attachment/path detected", { confidence: 1, signals: ["image"] });

		const recent = getRecentContext(ctx);
		const cleanPrompt = stripRouterArtifacts(prompt);
		const promptLower = cleanPrompt.toLowerCase().trim();
		const continuation = isContinuation(cleanPrompt || prompt);

		if (continuation && lastRoute && lastRoute.purpose !== "vision") {
			return withReason(lastRoute, "short continuation; preserving previous route", { confidence: 0.9, signals: ["continuation"] });
		}

		const scores: Record<Purpose, number> = { fast: 0, main: 1.5, think: 0, search: 0, vision: 0 };
		const signals: string[] = [];
		const add = (purpose: Purpose, points: number, signal: string) => {
			scores[purpose] += points;
			signals.push(`${purpose}+${points}:${signal}`);
		};

		const hasPromptArchitecture = includesAny(cleanPrompt, ARCHITECT_KEYWORDS);
		const hasRecentArchitecture = includesAny(recent.text, ARCHITECT_KEYWORDS);
		const hasPromptFailure = FAILURE_PATTERN.test(cleanPrompt);
		const hasRecentFailure = FAILURE_PATTERN.test(recent.text) || recent.sawToolFailure;
		const hasPromptThink = includesAny(cleanPrompt, THINK_KEYWORDS);
		const hasRecentThink = includesAny(recent.text, THINK_KEYWORDS);
		const risky = includesAny(cleanPrompt, RISKY_KEYWORDS);
		const recentRisky = includesAny(recent.text, RISKY_KEYWORDS);
		const largeChange = includesAny(cleanPrompt, LARGE_CHANGE_KEYWORDS);
		const recentLargeChange = includesAny(recent.text, LARGE_CHANGE_KEYWORDS);
		const externalResearch = includesAny(cleanPrompt, EXTERNAL_RESEARCH_KEYWORDS);
		const recentExternalResearch = includesAny(recent.text, EXTERNAL_RESEARCH_KEYWORDS);
		const hasSearchIntent = includesAny(cleanPrompt, SEARCH_KEYWORDS);
		const recentSearchIntent = includesAny(recent.text, SEARCH_KEYWORDS);
		const hasEditIntent = /\b(implement|implementar|implemente|edit|editar|altere|alterar|ajuste|ajustar|change|fix|corrigir|write|crie|criar|refactor|refatorar|seguir|siga|pode seguir)\b/i.test(cleanPrompt);
		const hasCode = cleanPrompt.includes("```") || CODE_FILE_PATTERN.test(cleanPrompt) || CODE_TOKEN_PATTERN.test(cleanPrompt);
		const lightDiscussion = !hasEditIntent && !hasPromptFailure && !risky && !largeChange && /[?？]|\b(como|quanto|what|how|why|por que|poder[ií]amos|could|should|vale a pena)\b/i.test(cleanPrompt);

		if (hasPromptArchitecture) add("think", lightDiscussion ? 1.25 : 3, lightDiscussion ? "architecture discussion" : "architecture signal");
		if (hasRecentArchitecture) add("think", continuation ? 1 : 0.35, "recent architecture signal");
		if (hasPromptFailure) add("think", 4, "failure/log in prompt");
		if (hasRecentFailure) add("think", continuation ? 2.5 : 1, "recent failure/tool error");
		if (hasPromptThink) add("think", 3, "debug/deep-reasoning signal");
		if (hasRecentThink) add("think", continuation ? 1.25 : 0.4, "recent debug signal");
		if (risky) add("think", 3.5, "security/data/production risk");
		if (recentRisky) add("think", continuation ? 1.5 : 0.4, "recent risk signal");
		if (largeChange) add("think", 3, "large-change signal");
		if (recentLargeChange) add("think", continuation ? 1.25 : 0.35, "recent large-change signal");
		if (cleanPrompt.includes("```") && cleanPrompt.length > 500) add("think", 2, "large code block");
		if (recent.toolCalls >= 8 && turnsSinceReset <= 3) add("think", 2, "many recent tool calls");

		if (hasSearchIntent && !hasEditIntent) add("search", 3, "search/exploration intent without edit");
		if (recentSearchIntent && continuation && !hasEditIntent) add("search", 1, "recent search intent");
		if (externalResearch) add("main", 2, "external docs/library signal");
		if (recentExternalResearch && continuation) add("main", 0.75, "recent external docs/library signal");
		if (hasEditIntent) add("main", 1.75, "edit/implementation intent");
		if (hasCode) add("main", 1, "code/file signal");
		if (lightDiscussion) add("main", 2, "light discussion/question");
		if (!hasCode && cleanPrompt.length < 90 && (includesAny(promptLower, FAST_KEYWORDS) || cleanPrompt.length < 25)) add("fast", 3, "short/simple prompt");

		const ranked = (Object.keys(scores) as Purpose[])
			.filter((purpose) => purpose !== "vision")
			.sort((a, b) => scores[b] - scores[a]);
		let best = ranked[0];
		const second = ranked[1];
		const margin = scores[best] - scores[second];

		if (best === "think" && lightDiscussion && !hasPromptFailure && !risky && !largeChange && margin < 1.5) {
			best = "main";
			signals.push("main override: light discussion avoided deep route");
		}
		if (best === "search" && hasEditIntent) {
			best = "main";
			signals.push("main override: edit intent beats search-only route");
		}

		const confidence = Math.max(0.35, Math.min(0.99, 0.55 + Math.max(0, margin) / 6));
		const scoreSummary = `scores fast=${scores.fast.toFixed(1)} main=${scores.main.toFixed(1)} think=${scores.think.toFixed(1)} search=${scores.search.toFixed(1)} margin=${margin.toFixed(1)}`;
		const reason = `${best} selected by scored heuristics (${scoreSummary})`;

		if (best === "think") return withReason(ROUTES.think, reason, { confidence, signals });
		if (best === "search") return withReason(ROUTES.search, reason, { confidence, signals });
		if (best === "fast") return withReason(ROUTES.fast, reason, { confidence, signals });
		return withReason(ROUTES.main, reason, { confidence, signals });
	}

	async function applyRoute(route: RoutePlan, ctx: ExtensionContext, options: { manual?: boolean } = {}): Promise<boolean> {
		const model = ctx.modelRegistry.find(route.provider, route.model);
		if (!model) {
			ctx.ui.notify(`Modelo não encontrado no Pi registry: ${route.provider}/${route.model}`, "warning");
			return false;
		}

		pi.setThinkingLevel(route.thinking);

		if (ctx.model?.provider === route.provider && ctx.model.id === route.model) {
			lastRoute = route;
			if (route.provider === COPILOT_PROVIDER) copilotRoutingActive = true;
			if (!options.manual) routeStats[route.purpose]++; else workflowStats.manualOverrides++;
			updateStatus(ctx);
			return true;
		}

		const success = await pi.setModel(model);
		if (success) {
			pi.setThinkingLevel(route.thinking);
			lastRoute = route;
			if (route.provider === COPILOT_PROVIDER) copilotRoutingActive = true;
			if (!options.manual) routeStats[route.purpose]++; else workflowStats.manualOverrides++;
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

		const route = analyzeRoute(prompt, hasImages, ctx);
		const success = await applyRoute(route, ctx);
		if (!success) return;

		// Keep routing lightweight: model/thinking selection is reflected in the status bar.
		// Do not inject workflow-plan messages by default; they add noise and can encourage
		// expensive subagent behavior on infrastructure that is not optimized for it.
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
					workflowStats?: typeof workflowStats;
					copilotRoutingActive?: boolean;
				} | undefined;
				if (data) {
					if (typeof data.autoRouting === "boolean") autoRouting = data.autoRouting;
					if (typeof data.routeStats === "object" && data.routeStats) {
						const s = data.routeStats as Record<string, number>;
						routeStats = { fast: s.fast ?? 0, main: s.main ?? 0, think: (s.think ?? 0) + (s.architect ?? 0), search: s.search ?? 0, vision: s.vision ?? 0 };
					}
					if (typeof data.workflowStats === "object" && data.workflowStats) workflowStats = { ...workflowStats, ...data.workflowStats };
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
			info += `  Tool calls recentes: ${recentToolCalls} (${turnsSinceReset} turns)\n`;
			if (lastRoute) {
				info += `  Confiança: ${Math.round(lastRoute.confidence * 100)}%\n`;
				info += `  Motivo: ${lastRoute.reason}\n`;
				info += `  Sinais: ${lastRoute.signals.slice(0, 6).join("; ") || "default"}\n`;
			}
			info += `\n`;
			info += `  Purposes:\n`;
			for (const purpose of ["fast", "main", "think", "search", "vision"] as Purpose[]) {
				const route = ROUTES[purpose];
				info += `    ${EMOJI[purpose]} ${purpose.padEnd(9)} → ${route.provider}/${route.model} (${route.thinking}) [${routeStats[purpose]}]\n`;
			}
			info += `\n  Manual overrides: ${workflowStats.manualOverrides}\n`;
			info += `\n  Uso: /copilot-route auto|manual|status|rush|smart|deep|fast|main|think|search|vision|reset`; 
			ctx.ui.notify(info, "info");
			return;
		}

		if (cmd === "auto") {
			autoRouting = true;
			copilotRoutingActive = true;
			pi.appendEntry("copilot-router-state", { autoRouting, routeStats, workflowStats, copilotRoutingActive });
			ctx.ui.notify("Copilot auto-routing ativado ✅", "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "manual") {
			autoRouting = false;
			pi.appendEntry("copilot-router-state", { autoRouting, routeStats, workflowStats, copilotRoutingActive });
			ctx.ui.notify("Copilot auto-routing desativado ⏸️", "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "reset" || cmd === "stats") {
			routeStats = { fast: 0, main: 0, think: 0, search: 0, vision: 0 };
			workflowStats = { autoSearchHints: 0, oracleHints: 0, reviewTourHints: 0, planSignoffHints: 0, manualOverrides: 0 };
			pi.appendEntry("copilot-router-state", { autoRouting, routeStats, workflowStats, copilotRoutingActive });
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
			pi.appendEntry("copilot-router-state", { autoRouting, routeStats, workflowStats, copilotRoutingActive: true });
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
