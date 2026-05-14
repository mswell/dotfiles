/**
 * Gemini Auto Router Extension
 *
 * Automatically routes between Google Gemini models based on prompt complexity,
 * saving API costs by only using Pro when truly needed.
 *
 * Routing tiers:
 *   Ultra-simple  → gemini-3.1-flash-lite  (thinking: off)      — $0.4/1M out
 *   Simple        → gemini-3.1-flash-lite  (thinking: low)      — $0.4/1M out
 *   Medium        → gemini-3-flash-preview  (thinking: medium)  — $2.5/1M out
 *   Complex       → gemini-3.1-pro-preview (thinking: high)     — $12/1M out
 *   Critical      → gemini-3.1-pro-preview (thinking: high)     — $12/1M out
 *
 * Only activates when the current model is from the "google" provider.
 * Other providers are completely unaffected.
 *
 * Commands:
 *   /gem-route          - Show current routing info and cost savings
 *   /gem-route auto     - Enable auto-routing
 *   /gem-route manual   - Disable auto-routing (keep current model)
 *   /gem-route <tier>   - Force a specific tier (lite, flash, pro)
 *
 * Shortcut:
 *   Ctrl+Shift+E        - Toggle auto-routing on/off
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";

// ─── Configuration ────────────────────────────────────────────────────────────

const GEMINI_MODELS = {
	lite: "gemini-3.1-flash-lite-preview",      // ultra-cheap with reasoning
	flash: "gemini-3-flash-preview",    // balanced workhorse
	pro: "gemini-3.1-pro-preview",      // $2/$12     — full power
} as const;

// Cost per 1M tokens (output, which dominates cost)
const OUTPUT_COST: Record<string, number> = {
	"gemini-3.1-flash-lite-preview": 0.4,
	"gemini-3-flash-preview": 2.5,
	"gemini-3.1-pro-preview": 12,
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
	ultra_simple: "⚡ ultra-simples → lite (off)",
	simple: "🪶 simples → lite (low)",
	medium: "💎 médio → flash (medium)",
	complex: "🧠 complexo → pro (high)",
	critical: "🔥 crítico → pro (high)",
};

const ROUTE_EMOJI: Record<RouteReason, string> = {
	ultra_simple: "⚡",
	simple: "🪶",
	medium: "💎",
	complex: "🧠",
	critical: "🔥",
};

// ─── Detection patterns ──────────────────────────────────────────────────────

const ULTRA_SIMPLE_PATTERNS = [
	/^(yes|no|sim|não|ok|okay|thanks|obrigado|valeu|beleza|sure|yep|nope|nah|s|n|y)\.?$/i,
	/^(continua|continue|go|vai|próximo|next|done|feito|pronto)\.?$/i,
	/^(show|mostra|lista|list)\s+\w+$/i,
];

const SIMPLE_KEYWORDS = [
	"what is", "o que é", "what's", "define", "explain",
	"explica", "resumo", "summary", "translate", "traduzir",
	"format", "formata", "formate", "rename", "renomear",
	"add import", "remove import", "adicionar import",
	"change the name", "muda o nome", "trocar o nome",
	"read the file", "lê o arquivo", "cat", "show me",
	"mostra o arquivo", "print", "echo",
];

const CRITICAL_KEYWORDS = [
	"system design", "design do sistema", "microservices", "microsserviços",
	"distributed", "distribuído", "event sourcing", "cqrs",
	"domain driven", "ddd", "hexagonal", "clean architecture",
	"arquitetura limpa",
	"race condition", "condição de corrida", "deadlock", "memory leak",
	"vazamento de memória", "heap", "stack overflow",
	"core dump", "segfault", "undefined behavior",
	"vulnerability", "vulnerabilidade", "exploit", "cve",
	"injection", "injeção", "xss", "csrf", "auth bypass",
	"rewrite", "reescrever", "migrate entire", "migrar todo",
	"full refactor", "refatorar tudo", "redesign",
	"from scratch", "do zero",
];

const COMPLEX_KEYWORDS = [
	"implement", "refactor", "debug", "fix bug", "architecture",
	"optimize", "algorithm", "data structure", "design pattern",
	"test suite", "integration test", "migration", "deploy",
	"pipeline", "ci/cd", "security audit",
	"reverse engineer", "performance", "profiling",
	"concurrent", "async pattern", "error handling strategy",
	"implementar", "implementa", "refatorar", "refatora",
	"corrigir", "corrige", "depurar", "depura",
	"otimizar", "otimiza", "criar teste", "criar testes",
	"criar módulo", "novo módulo", "new module",
	"analisar código", "code review", "revisar código",
];

// ─── Extension ────────────────────────────────────────────────────────────────

export default function geminiAutoRouter(pi: ExtensionAPI) {
	let autoRouting = true;
	let lastRoute: RouteResult | undefined;
	let recentToolCalls = 0;
	let turnsSinceReset = 0;

	let routeStats: Record<RouteReason, number> = {
		ultra_simple: 0,
		simple: 0,
		medium: 0,
		complex: 0,
		critical: 0,
	};

	/**
	 * Check if the current model belongs to google provider.
	 */
	function isGoogleActive(ctx: ExtensionContext): boolean {
		const model = ctx.model;
		if (!model) return false;
		return model.provider === "google";
	}

	/**
	 * Analyze prompt complexity and return routing decision.
	 */
	function analyzeRoute(prompt: string, _ctx: ExtensionContext): RouteResult {
		const promptLower = prompt.toLowerCase().trim();
		const promptLength = prompt.length;

		// ── Rule 1: Ultra-simple ──
		if (promptLength < 30) {
			for (const pattern of ULTRA_SIMPLE_PATTERNS) {
				if (pattern.test(promptLower)) {
					return { reason: "ultra_simple", model: GEMINI_MODELS.lite, thinking: "off" };
				}
			}
			if (promptLength < 15) {
				return { reason: "ultra_simple", model: GEMINI_MODELS.lite, thinking: "off" };
			}
		}

		// ── Rule 2: Critical complexity ──
		const criticalScore = CRITICAL_KEYWORDS.reduce((score, kw) => {
			return score + (promptLower.includes(kw.toLowerCase()) ? 1 : 0);
		}, 0);

		if (criticalScore >= 2 || (criticalScore >= 1 && promptLength > 500)) {
			return { reason: "critical", model: GEMINI_MODELS.pro, thinking: "high" };
		}

		// ── Rule 3: Simple tasks ──
		if (promptLength < 80) {
			const isSimple = SIMPLE_KEYWORDS.some((kw) => promptLower.includes(kw));
			if (isSimple) {
				return { reason: "simple", model: GEMINI_MODELS.lite, thinking: "low" };
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

		// Complex: strong coding signals
		if (effectiveCodingScore >= 5 || (effectiveCodingScore >= 3 && promptLength > 300)) {
			return { reason: "complex", model: GEMINI_MODELS.pro, thinking: "high" };
		}

		// Medium: moderate coding signals → Flash
		if (effectiveCodingScore >= 2 || hasCodeBlocks || promptLength > 200) {
			return { reason: "medium", model: GEMINI_MODELS.flash, thinking: "medium" };
		}

		// ── Rule 5: High tool-call activity ──
		if (recentToolCalls >= 8 && turnsSinceReset <= 3) {
			return { reason: "medium", model: GEMINI_MODELS.flash, thinking: "medium" };
		}

		// ── Rule 6: Long prompts ──
		if (promptLength > 500) {
			return { reason: "complex", model: GEMINI_MODELS.pro, thinking: "high" };
		}

		if (promptLength > 150) {
			return { reason: "medium", model: GEMINI_MODELS.flash, thinking: "medium" };
		}

		// ── Default: simple → lite ──
		return { reason: "simple", model: GEMINI_MODELS.lite, thinking: "low" };
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

		pi.setThinkingLevel(route.thinking);

		if (currentModel && currentModel.provider === "google" && currentModel.id === targetModelId) {
			lastRoute = route;
			routeStats[route.reason]++;
			updateStatus(ctx);
			return true;
		}

		const model = ctx.modelRegistry.find("google", targetModelId);
		if (!model) {
			return false;
		}

		const success = await pi.setModel(model);
		if (success) {
			pi.setThinkingLevel(route.thinking);
			lastRoute = route;
			routeStats[route.reason]++;
			updateStatus(ctx);
		}
		return success;
	}

	/**
	 * Estimate savings compared to always using Pro on high.
	 */
	function estimateSavings(): { percentage: number; totalRoutes: number } {
		const totalRoutes = Object.values(routeStats).reduce((a, b) => a + b, 0);
		if (totalRoutes === 0) return { percentage: 0, totalRoutes: 0 };

		const baselineCostPerRoute = OUTPUT_COST[GEMINI_MODELS.pro]; // 12
		let actualCost = 0;
		actualCost += routeStats.ultra_simple * OUTPUT_COST[GEMINI_MODELS.lite];
		actualCost += routeStats.simple * OUTPUT_COST[GEMINI_MODELS.lite];
		actualCost += routeStats.medium * OUTPUT_COST[GEMINI_MODELS.flash];
		actualCost += routeStats.complex * OUTPUT_COST[GEMINI_MODELS.pro];
		actualCost += routeStats.critical * OUTPUT_COST[GEMINI_MODELS.pro];

		const baselineCost = totalRoutes * baselineCostPerRoute;
		const percentage = Math.round(((baselineCost - actualCost) / baselineCost) * 100);

		return { percentage, totalRoutes };
	}

	/**
	 * Update footer status.
	 */
	function updateStatus(ctx: ExtensionContext) {
		const theme = ctx.ui.theme;
		
		if (!autoRouting) {
			ctx.ui.setStatus("gem-router", theme.fg("dim", "gem:manual"));
			return;
		}

		if (lastRoute) {
			const emoji = ROUTE_EMOJI[lastRoute.reason] || "🤖";
			const modelShort = lastRoute.model
				.replace("gemini-", "")
				.replace("-preview", "");
			const savings = estimateSavings();
			const savingsStr = savings.totalRoutes > 0 ? ` ↓${savings.percentage}%` : "";
			
			const text = `${emoji}gem→${modelShort}:${lastRoute.thinking}${savingsStr}`;
			ctx.ui.setStatus("gem-router", theme.fg("accent", text));
		} else if (isGoogleActive(ctx)) {
			// Se o Google está ativo mas ainda não roteamos, mostra que está pronto
			ctx.ui.setStatus("gem-router", theme.fg("dim", "gem:auto-ready"));
		} else {
			ctx.ui.setStatus("gem-router", undefined);
		}
	}

	// ─── Events ───────────────────────────────────────────────────────────────

	pi.on("before_agent_start", async (event, ctx) => {
		if (!autoRouting || !isGoogleActive(ctx)) return;

		const prompt = event.prompt ?? "";
		const route = analyzeRoute(prompt, ctx);

		await applyRoute(route, ctx);
	});

	pi.on("turn_end", async (event, ctx) => {
		if (!isGoogleActive(ctx)) return;

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
			updateStatus(ctx);
		}
	});

	pi.on("session_start", async (_event, ctx) => {
		// Register the missing Gemini 3 models on session start
		if (typeof (ctx.modelRegistry as any).register === "function") {
			(ctx.modelRegistry as any).register({
				provider: "google",
				id: "gemini-3-flash-preview",
				maxTokens: 1048576,
				contextWindow: 1048576,
				supportsImages: true,
				supportsThinking: true,
			});

			(ctx.modelRegistry as any).register({
				provider: "google",
				id: "gemini-3.1-flash-lite-preview",
				maxTokens: 1048576,
				contextWindow: 1048576,
				supportsImages: true,
				supportsThinking: true,
			});
		}

		for (const entry of ctx.sessionManager.getEntries()) {
			if (
				entry.type === "custom" &&
				(entry as { customType?: string }).customType === "gem-router-state"
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

	pi.registerCommand("gem-route", {
		description: "Show/control Gemini auto-routing (auto|manual|<tier>)",
		handler: async (args, ctx) => {
			const arg = args?.trim().toLowerCase();

			if (!arg) {
				const status = autoRouting ? "✅ auto" : "⏸️  manual";
				const model = ctx.model?.id ?? "none";
				const provider = ctx.model?.provider ?? "—";
				const reason = lastRoute ? ROUTE_LABELS[lastRoute.reason] : "—";
				const thinking = lastRoute ? lastRoute.thinking : pi.getThinkingLevel();
				const isGoogle = isGoogleActive(ctx);
				const savings = estimateSavings();

				let info = `Gemini Auto Router (Google API)\n`;
				info += `\n`;
				info += `  Status: ${status}\n`;
				info += `  Provider: ${isGoogle ? "google ✓" : `${provider} (router inativo)`}\n`;
				info += `  Modelo: ${model}\n`;
				info += `  Thinking: ${thinking}\n`;
				info += `  Último roteamento: ${reason}\n`;
				info += `  Tool calls recentes: ${recentToolCalls} (${turnsSinceReset} turns)\n`;
				info += `\n`;
				info += `  📊 Estatísticas da sessão:\n`;
				info += `    ⚡ Ultra-simples: ${routeStats.ultra_simple}\n`;
				info += `    🪶 Simples:       ${routeStats.simple}\n`;
				info += `    💎 Médio:         ${routeStats.medium}\n`;
				info += `    🧠 Complexo:      ${routeStats.complex}\n`;
				info += `    🔥 Crítico:       ${routeStats.critical}\n`;
				if (savings.totalRoutes > 0) {
					info += `    ─────────────────────\n`;
					info += `    💰 Economia estimada: ~${savings.percentage}% vs Pro fixo\n`;
				}
				info += `\n`;
				info += `  Roteamento:\n`;
				info += `    ⚡ ultra-simples → ${GEMINI_MODELS.lite} (off)     — $${OUTPUT_COST[GEMINI_MODELS.lite]}/1M out\n`;
				info += `    🪶 simples       → ${GEMINI_MODELS.lite} (low)     — $${OUTPUT_COST[GEMINI_MODELS.lite]}/1M out\n`;
				info += `    💎 médio         → ${GEMINI_MODELS.flash} (medium)  — $${OUTPUT_COST[GEMINI_MODELS.flash]}/1M out\n`;
				info += `    🧠 complexo      → ${GEMINI_MODELS.pro} (high) — $${OUTPUT_COST[GEMINI_MODELS.pro]}/1M out\n`;
				info += `    🔥 crítico       → ${GEMINI_MODELS.pro} (high) — $${OUTPUT_COST[GEMINI_MODELS.pro]}/1M out\n`;
				info += `\n`;
				info += `  Uso: /gem-route auto|manual|lite|flash|pro`;

				ctx.ui.notify(info, "info");
				return;
			}

			if (arg === "auto") {
				autoRouting = true;
				pi.appendEntry("gem-router-state", { autoRouting: true, routeStats });
				ctx.ui.notify("Gemini auto-routing ativado ✅", "info");
				updateStatus(ctx);
				return;
			}

			if (arg === "manual") {
				autoRouting = false;
				pi.appendEntry("gem-router-state", { autoRouting: false, routeStats });
				ctx.ui.notify("Gemini auto-routing desativado ⏸️", "info");
				updateStatus(ctx);
				return;
			}

			if (arg === "reset" || arg === "stats") {
				routeStats = { ultra_simple: 0, simple: 0, medium: 0, complex: 0, critical: 0 };
				pi.appendEntry("gem-router-state", { autoRouting, routeStats });
				ctx.ui.notify("Estatísticas resetadas 📊", "info");
				return;
			}

			const tierMap: Record<string, { model: string; thinking: ThinkingLevel }> = {
				lite: { model: GEMINI_MODELS.lite, thinking: "low" },
				leve: { model: GEMINI_MODELS.lite, thinking: "low" },
				"flash-lite": { model: GEMINI_MODELS.lite, thinking: "low" },
				flash: { model: GEMINI_MODELS.flash, thinking: "medium" },
				medio: { model: GEMINI_MODELS.flash, thinking: "medium" },
				balanced: { model: GEMINI_MODELS.flash, thinking: "medium" },
				pro: { model: GEMINI_MODELS.pro, thinking: "high" },
				max: { model: GEMINI_MODELS.pro, thinking: "high" },
				full: { model: GEMINI_MODELS.pro, thinking: "high" },
			};

			const tier = tierMap[arg];
			if (!tier) {
				ctx.ui.notify(
					`Tier "${arg}" não encontrado. Use: lite, flash, pro, auto, manual, reset`,
					"error",
				);
				return;
			}

			autoRouting = false;
			const model = ctx.modelRegistry.find("google", tier.model);
			if (!model) {
				ctx.ui.notify(`Modelo ${tier.model} não encontrado no google`, "error");
				return;
			}

			const success = await pi.setModel(model);
			if (success) {
				pi.setThinkingLevel(tier.thinking);
				lastRoute = { reason: "medium", model: tier.model, thinking: tier.thinking };
				pi.appendEntry("gem-router-state", { autoRouting: false, routeStats });
				ctx.ui.notify(
					`Modelo fixado: ${tier.model} (thinking: ${tier.thinking}) — auto-routing desativado`,
					"info",
				);
			} else {
				ctx.ui.notify(`Falha ao aplicar modelo ${tier.model}`, "error");
			}
			updateStatus(ctx);
		},
	});

	// ─── Shortcut ─────────────────────────────────────────────────────────────

	pi.registerShortcut(Key.ctrlShift("e"), {
		description: "Toggle Gemini auto-routing",
		handler: async (ctx) => {
			autoRouting = !autoRouting;
			pi.appendEntry("gem-router-state", { autoRouting, routeStats });
			const status = autoRouting ? "ativado ✅" : "desativado ⏸️";
			ctx.ui.notify(`Gemini auto-routing ${status}`, "info");
			updateStatus(ctx);
		},
	});
}
