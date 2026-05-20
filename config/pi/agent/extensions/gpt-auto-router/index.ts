/**
 * GPT Auto Router Extension
 *
 * Automatically routes GPT-5.5 reasoning levels based on prompt complexity,
 * preserving subscription quota by avoiding high reasoning when it is not needed.
 *
 * Routing tiers:
 *   Ultra-simple  → gpt-5.5  (thinking: low)     — "yes", "ok", <20 chars
 *   Simple        → gpt-5.5  (thinking: low)     — short questions, list, explain
 *   Medium        → gpt-5.5  (thinking: medium)  — multi-step coding, code blocks
 *   Complex       → gpt-5.5  (thinking: high)    — architecture, debugging
 *   Critical      → gpt-5.5  (thinking: high)    — system design, massive refactors
 *
 * Only activates when the current model is from the "openai-codex" provider.
 * Other providers are completely unaffected.
 *
 * Commands:
 *   /gpt-route          - Show current routing info and cost savings
 *   /gpt-route auto     - Enable auto-routing
 *   /gpt-route manual   - Disable auto-routing (keep current model)
 *   /gpt-route <tier>   - Force a reasoning tier (low, medium, high)
 *
 * Shortcut:
 *   Ctrl+Shift+G        - Toggle auto-routing on/off
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";

// ─── Configuration ────────────────────────────────────────────────────────────

const GPT_MODELS = {
	low: "gpt-5.5",
	medium: "gpt-5.5",
	high: "gpt-5.5",
} as const;

// Rough relative quota pressure by reasoning level. This is intentionally
// heuristic because ChatGPT subscription quotas are not token-billed like API.
const REASONING_WEIGHT: Record<string, number> = {
	off: 0.2,
	minimal: 0.3,
	low: 0.45,
	medium: 0.7,
	high: 1,
	xhigh: 1.3,
};

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteReason =
	| "ultra_simple"
	| "simple"
	| "medium"
	| "complex"
	| "critical";

interface RouteResult {
	reason: RouteReason;
	model: string;
	thinking: ThinkingLevel;
}

const ROUTE_LABELS: Record<RouteReason, string> = {
	ultra_simple: "⚡ ultra-simples → GPT-5.5 (low)",
	simple: "🪶 simples → GPT-5.5 (low)",
	medium: "💰 médio → GPT-5.5 (medium)",
	complex: "🧠 complexo → GPT-5.5 (high)",
	critical: "🔥 crítico → GPT-5.5 (high)",
};

const ROUTE_EMOJI: Record<RouteReason, string> = {
	ultra_simple: "⚡",
	simple: "🪶",
	medium: "💰",
	complex: "🧠",
	critical: "🔥",
};

// ─── Detection patterns ──────────────────────────────────────────────────────

// Ultra-simple: yes/no/ok/thanks and very short prompts
const ULTRA_SIMPLE_PATTERNS = [
	/^(yes|no|sim|não|ok|okay|thanks|obrigado|valeu|beleza|sure|yep|nope|nah|s|n|y)\.?$/i,
	/^(continua|continue|go|vai|próximo|next|done|feito|pronto)\.?$/i,
	/^(show|mostra|lista|list)\s+\w+$/i,
];

// Simple keywords (bounded, specific tasks)
const SIMPLE_KEYWORDS = [
	"what is", "o que é", "what's", "define", "explain",
	"explica", "resumo", "summary", "translate", "traduzir",
	"format", "formata", "formate", "rename", "renomear",
	"add import", "remove import", "adicionar import",
	"change the name", "muda o nome", "trocar o nome",
	"read the file", "lê o arquivo", "cat", "show me",
	"mostra o arquivo", "print", "echo",
];

// Critical complexity keywords (system-level, deep, multi-system)
const CRITICAL_KEYWORDS = [
	// Architecture & Design
	"system design", "design do sistema", "microservices", "microsserviços",
	"distributed", "distribuído", "event sourcing", "cqrs",
	"domain driven", "ddd", "hexagonal", "clean architecture",
	"arquitetura limpa",
	// Deep debugging
	"race condition", "condição de corrida", "deadlock", "memory leak",
	"vazamento de memória", "heap", "stack overflow",
	"core dump", "segfault", "undefined behavior",
	// Security
	"vulnerability", "vulnerabilidade", "exploit", "cve",
	"injection", "injeção", "xss", "csrf", "auth bypass",
	// Large-scale
	"rewrite", "reescrever", "migrate entire", "migrar todo",
	"full refactor", "refatorar tudo", "redesign",
	"from scratch", "do zero",
];

// Complex coding keywords (multi-step, needs planning)
const COMPLEX_KEYWORDS = [
	// English
	"implement", "refactor", "debug", "fix bug", "architecture",
	"optimize", "algorithm", "data structure", "design pattern",
	"test suite", "integration test", "migration", "deploy",
	"pipeline", "ci/cd", "security audit",
	"reverse engineer", "performance", "profiling",
	"concurrent", "async pattern", "error handling strategy",
	// Portuguese
	"implementar", "implementa", "refatorar", "refatora",
	"corrigir", "corrige", "depurar", "depura",
	"otimizar", "otimiza", "criar teste", "criar testes",
	"criar módulo", "novo módulo", "new module",
	"analisar código", "code review", "revisar código",
];

// ─── Extension ────────────────────────────────────────────────────────────────

export default function gptAutoRouter(pi: ExtensionAPI) {
	let autoRouting = true;
	let lastRoute: RouteResult | undefined;
	let recentToolCalls = 0;
	let turnsSinceReset = 0;

	// Stats for cost tracking
	let routeStats: Record<RouteReason, number> = {
		ultra_simple: 0,
		simple: 0,
		medium: 0,
		complex: 0,
		critical: 0,
	};

	/**
	 * Check if the current model belongs to openai-codex provider.
	 */
	function isCodexActive(ctx: ExtensionContext): boolean {
		const model = ctx.model;
		if (!model) return false;
		return model.provider === "openai-codex";
	}

	/**
	 * Analyze prompt complexity and return routing decision.
	 */
	function analyzeRoute(prompt: string, _ctx: ExtensionContext): RouteResult {
		const promptLower = prompt.toLowerCase().trim();
		const promptLength = prompt.length;

		// ── Rule 1: Ultra-simple (acknowledgements, very short) ──
		if (promptLength < 30) {
			for (const pattern of ULTRA_SIMPLE_PATTERNS) {
				if (pattern.test(promptLower)) {
					return { reason: "ultra_simple", model: GPT_MODELS.low, thinking: "low" };
				}
			}
			// Very short but not matching patterns — still simple
			if (promptLength < 15) {
				return { reason: "ultra_simple", model: GPT_MODELS.low, thinking: "low" };
			}
		}

		// ── Rule 2: Critical complexity indicators ──
		const criticalScore = CRITICAL_KEYWORDS.reduce((score, kw) => {
			return score + (promptLower.includes(kw.toLowerCase()) ? 1 : 0);
		}, 0);

		if (criticalScore >= 2 || (criticalScore >= 1 && promptLength > 500)) {
			return { reason: "critical", model: GPT_MODELS.high, thinking: "high" };
		}

		// ── Rule 3: Simple tasks ──
		if (promptLength < 80) {
			const isSimple = SIMPLE_KEYWORDS.some((kw) => promptLower.includes(kw));
			if (isSimple) {
				return { reason: "simple", model: GPT_MODELS.low, thinking: "low" };
			}
		}

		// ── Rule 4: Code indicators ──
		const hasCodeBlocks = prompt.includes("```") || prompt.includes("~~~");
		const hasFilePaths = /[\w-]+\.(ts|js|py|rs|go|java|cpp|c|h|tsx|jsx|vue|svelte|rb|php|sh|yaml|yml|json|toml|sql|md)\b/.test(prompt);
		const hasCodePatterns = /\b(function|const|let|var|import|export|class|interface|def |fn |func |pub |async |await)\b/.test(prompt);

		const codingScore = COMPLEX_KEYWORDS.reduce((score, kw) => {
			return score + (promptLower.includes(kw.toLowerCase()) ? 1 : 0);
		}, 0);

		const effectiveCodingScore = codingScore
			+ (hasCodeBlocks ? 3 : 0)
			+ (hasFilePaths ? 2 : 0)
			+ (hasCodePatterns ? 2 : 0);

		// Complex: strong coding signals + length
		if (effectiveCodingScore >= 5 || (effectiveCodingScore >= 3 && promptLength > 300)) {
			return { reason: "complex", model: GPT_MODELS.high, thinking: "high" };
		}

		// Medium: moderate coding signals
		if (effectiveCodingScore >= 2 || hasCodeBlocks || promptLength > 200) {
			return { reason: "medium", model: GPT_MODELS.medium, thinking: "medium" };
		}

		// ── Rule 5: High tool-call activity → needs more reasoning, same GPT-5.5 model ──
		if (recentToolCalls >= 8 && turnsSinceReset <= 3) {
			return { reason: "medium", model: GPT_MODELS.medium, thinking: "medium" };
		}

		// ── Rule 6: Long prompts without strong coding signals ──
		if (promptLength > 500) {
			return { reason: "complex", model: GPT_MODELS.high, thinking: "high" };
		}

		if (promptLength > 150) {
			return { reason: "medium", model: GPT_MODELS.medium, thinking: "medium" };
		}

		// ── Default: simple ──
		return { reason: "simple", model: GPT_MODELS.low, thinking: "low" };
	}

	/**
	 * Apply the routed model and thinking level.
	 */
	async function applyRoute(
		route: RouteResult,
		ctx: ExtensionContext,
	): Promise<boolean> {
		const currentModel = ctx.model;
		const targetModelId = route.model;

		// Set thinking level regardless of model change
		pi.setThinkingLevel(route.thinking);

		// Don't switch if already on the target model
		if (currentModel && currentModel.provider === "openai-codex" && currentModel.id === targetModelId) {
			lastRoute = route;
			routeStats[route.reason]++;
			updateStatus(ctx);
			return true;
		}

		const model = ctx.modelRegistry.find("openai-codex", targetModelId);
		if (!model) {
			return false;
		}

		const success = await pi.setModel(model);
		if (success) {
			// Re-set thinking level after model switch (setModel may reset it)
			pi.setThinkingLevel(route.thinking);
			lastRoute = route;
			routeStats[route.reason]++;
			updateStatus(ctx);
		}
		return success;
	}

	/**
	 * Estimate quota preservation compared to always using GPT-5.5 high.
	 */
	function estimateSavings(): { percentage: number; totalRoutes: number } {
		const totalRoutes = Object.values(routeStats).reduce((a, b) => a + b, 0);
		if (totalRoutes === 0) return { percentage: 0, totalRoutes: 0 };

		const baseline = totalRoutes * REASONING_WEIGHT.high;
		let actual = 0;
		actual += routeStats.ultra_simple * REASONING_WEIGHT.low;
		actual += routeStats.simple * REASONING_WEIGHT.low;
		actual += routeStats.medium * REASONING_WEIGHT.medium;
		actual += routeStats.complex * REASONING_WEIGHT.high;
		actual += routeStats.critical * REASONING_WEIGHT.high;

		const percentage = Math.round(((baseline - actual) / baseline) * 100);

		return { percentage, totalRoutes };
	}

	/**
	 * Update footer status.
	 */
	function updateStatus(ctx: ExtensionContext) {
		const theme = ctx.ui.theme;

		if (!isCodexActive(ctx)) {
			ctx.ui.setStatus("gpt-router", undefined);
			return;
		}

		// GPT router is active; hide statuses from sibling routers that may have
		// been left behind after a manual provider/router switch.
		ctx.ui.setStatus("gem-router", undefined);
		ctx.ui.setStatus("zai-router", undefined);

		if (!autoRouting) {
			ctx.ui.setStatus(
				"gpt-router",
				theme.fg("dim", "gpt:manual"),
			);
			return;
		}

		if (lastRoute) {
			const emoji = ROUTE_EMOJI[lastRoute.reason] || "🤖";
			const modelShort = lastRoute.model.replace("gpt-", "");
			const savings = estimateSavings();
			const savingsStr = savings.totalRoutes > 0 ? ` ↓${savings.percentage}%` : "";
			
			const text = `${emoji}gpt→${modelShort}:${lastRoute.thinking}${savingsStr}`;
			ctx.ui.setStatus("gpt-router", theme.fg("accent", text));
		} else if (isCodexActive(ctx)) {
			// Se o codex está ativo mas ainda não roteamos, mostra pronto
			ctx.ui.setStatus("gpt-router", theme.fg("dim", "gpt:auto-ready"));
		} else {
			ctx.ui.setStatus("gpt-router", undefined);
		}
	}

	// ─── Events ───────────────────────────────────────────────────────────────

	/**
	 * Before agent starts: analyze prompt and route.
	 */
	pi.on("before_agent_start", async (event, ctx) => {
		if (!autoRouting || !isCodexActive(ctx)) return;

		const prompt = event.prompt ?? "";
		const route = analyzeRoute(prompt, ctx);

		await applyRoute(route, ctx);
	});

	/**
	 * Track tool calls per turn.
	 */
	pi.on("turn_end", async (event, ctx) => {
		if (!isCodexActive(ctx)) return;

		const toolCount = event.toolResults?.length ?? 0;
		recentToolCalls += toolCount;
		turnsSinceReset++;

		if (turnsSinceReset > 5) {
			recentToolCalls = toolCount;
			turnsSinceReset = 1;
		}

		updateStatus(ctx);
	});

	/**
	 * React to manual model changes.
	 */
	pi.on("model_select", async (event, ctx) => {
		if (event.source === "set" || event.source === "cycle") {
			updateStatus(ctx);
		}
	});

	/**
	 * Session start: initialize.
	 */
	pi.on("session_start", async (_event, ctx) => {
		// Restore state
		for (const entry of ctx.sessionManager.getEntries()) {
			if (
				entry.type === "custom" &&
				(entry as { customType?: string }).customType === "gpt-router-state"
			) {
				const data = (entry as { data?: {
					autoRouting?: boolean;
					routeStats?: Record<RouteReason, number>;
				} }).data;
				if (data) {
					if (typeof data.autoRouting === "boolean") autoRouting = data.autoRouting;
					if (data.routeStats) routeStats = { ...routeStats, ...data.routeStats };
				}
			}
		}

		recentToolCalls = 0;
		turnsSinceReset = 0;

		updateStatus(ctx);
	});

	// ─── Commands ─────────────────────────────────────────────────────────────

	pi.registerCommand("gpt-route", {
		description: "Show/control GPT auto-routing for openai-codex (auto|manual|<tier>)",
		handler: async (args, ctx) => {
			const arg = args?.trim().toLowerCase();

			if (!arg) {
				// Show current info
				const status = autoRouting ? "✅ auto" : "⏸️  manual";
				const model = ctx.model?.id ?? "none";
				const provider = ctx.model?.provider ?? "—";
				const reason = lastRoute ? ROUTE_LABELS[lastRoute.reason] : "—";
				const thinking = lastRoute ? lastRoute.thinking : pi.getThinkingLevel();
				const isCodex = isCodexActive(ctx);
				const savings = estimateSavings();

				let info = `GPT Auto Router (OpenAI Codex)\n`;
				info += `\n`;
				info += `  Status: ${status}\n`;
				info += `  Provider: ${isCodex ? "openai-codex ✓" : `${provider} (router inativo)`}\n`;
				info += `  Modelo: ${model}\n`;
				info += `  Thinking: ${thinking}\n`;
				info += `  Último roteamento: ${reason}\n`;
				info += `  Tool calls recentes: ${recentToolCalls} (${turnsSinceReset} turns)\n`;
				info += `\n`;
				info += `  📊 Estatísticas da sessão:\n`;
				info += `    ⚡ Ultra-simples: ${routeStats.ultra_simple}\n`;
				info += `    🪶 Simples:       ${routeStats.simple}\n`;
				info += `    💰 Médio:         ${routeStats.medium}\n`;
				info += `    🧠 Complexo:      ${routeStats.complex}\n`;
				info += `    🔥 Crítico:       ${routeStats.critical}\n`;
				if (savings.totalRoutes > 0) {
					info += `    ─────────────────────\n`;
					info += `    💰 Preservação estimada: ~${savings.percentage}% vs GPT-5.5 high fixo\n`;
				}
				info += `\n`;
				info += `  Roteamento:\n`;
				info += `    ⚡ ultra-simples → ${GPT_MODELS.low} (thinking: low)\n`;
				info += `    🪶 simples       → ${GPT_MODELS.low} (thinking: low)\n`;
				info += `    💰 médio         → ${GPT_MODELS.medium} (thinking: medium)\n`;
				info += `    🧠 complexo      → ${GPT_MODELS.high} (thinking: high)\n`;
				info += `    🔥 crítico       → ${GPT_MODELS.high} (thinking: high)\n`;
				info += `\n`;
				info += `  Uso: /gpt-route auto|manual|low|medium|high`;

				ctx.ui.notify(info, "info");
				return;
			}

			if (arg === "auto") {
				autoRouting = true;
				pi.appendEntry("gpt-router-state", { autoRouting: true, routeStats });
				ctx.ui.notify("GPT auto-routing ativado ✅", "info");
				updateStatus(ctx);
				return;
			}

			if (arg === "manual") {
				autoRouting = false;
				pi.appendEntry("gpt-router-state", { autoRouting: false, routeStats });
				ctx.ui.notify("GPT auto-routing desativado ⏸️", "info");
				updateStatus(ctx);
				return;
			}

			if (arg === "reset" || arg === "stats") {
				routeStats = { ultra_simple: 0, simple: 0, medium: 0, complex: 0, critical: 0 };
				pi.appendEntry("gpt-router-state", { autoRouting, routeStats });
				ctx.ui.notify("Estatísticas resetadas 📊", "info");
				return;
			}

			// Force a specific reasoning tier. Legacy aliases are preserved.
			const tierMap: Record<string, { model: string; thinking: ThinkingLevel }> = {
				low: { model: GPT_MODELS.low, thinking: "low" },
				mini: { model: GPT_MODELS.low, thinking: "low" },
				light: { model: GPT_MODELS.low, thinking: "low" },
				leve: { model: GPT_MODELS.low, thinking: "low" },
				medium: { model: GPT_MODELS.medium, thinking: "medium" },
				balanced: { model: GPT_MODELS.medium, thinking: "medium" },
				balanceado: { model: GPT_MODELS.medium, thinking: "medium" },
				medio: { model: GPT_MODELS.medium, thinking: "medium" },
				high: { model: GPT_MODELS.high, thinking: "high" },
				flagship: { model: GPT_MODELS.high, thinking: "high" },
				max: { model: GPT_MODELS.high, thinking: "high" },
				full: { model: GPT_MODELS.high, thinking: "high" },
			};

			const tier = tierMap[arg];
			if (!tier) {
				ctx.ui.notify(
					`Tier "${arg}" não encontrado. Use: low, medium, high, auto, manual, reset`,
					"error",
				);
				return;
			}

			autoRouting = false;
			const model = ctx.modelRegistry.find("openai-codex", tier.model);
			if (!model) {
				ctx.ui.notify(`Modelo ${tier.model} não encontrado no openai-codex`, "error");
				return;
			}

			const success = await pi.setModel(model);
			if (success) {
				pi.setThinkingLevel(tier.thinking);
				lastRoute = { reason: "medium", model: tier.model, thinking: tier.thinking };
				pi.appendEntry("gpt-router-state", { autoRouting: false, routeStats });
				ctx.ui.notify(
					`GPT-5.5 fixado com thinking: ${tier.thinking} — auto-routing desativado`,
					"info",
				);
			} else {
				ctx.ui.notify(`Falha ao aplicar modelo ${tier.model}`, "error");
			}
			updateStatus(ctx);
		},
	});

	// ─── Shortcut ─────────────────────────────────────────────────────────────

	pi.registerShortcut(Key.ctrlShift("g"), {
		description: "Toggle GPT auto-routing",
		handler: async (ctx) => {
			autoRouting = !autoRouting;
			pi.appendEntry("gpt-router-state", { autoRouting, routeStats });
			const status = autoRouting ? "ativado ✅" : "desativado ⏸️";
			ctx.ui.notify(`GPT auto-routing ${status}`, "info");
			updateStatus(ctx);
		},
	});
}
