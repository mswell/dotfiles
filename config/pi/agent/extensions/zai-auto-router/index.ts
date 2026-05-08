/**
 * ZAI Auto Router Extension (GLM-5 Edition)
 *
 * Automatically routes between Z.ai (ZhipuAI) GLM models based on usage context:
 *
 * - Images present        → Gemini 2.5 Flash (vision fallback)
 * - Critical coding/SWE   → GLM-5.1 (flagship, 70% SWE-Bench Pro)
 * - General tasks        → GLM-5 (thinking:enabled)
 * - Simple tasks         → GLM-5 (thinking:disabled) - FAST mode
 * - Complex reasoning     → GLM-5 (thinking:enabled)
 *
 * Only activates when the current model is from the "zai" provider (or when
 * temporarily on the vision fallback model after an image prompt).
 * Other providers are completely unaffected.
 *
 * Vision fallback: When images are detected, the extension switches to
 * google/gemini-2.5-flash since GLM-5V-Turbo may not be available on all plans.
 * After the vision response, it switches back to the appropriate zai model.
 *
 * Commands:
 *   /zai-route          - Show current routing info
 *   /zai-route auto     - Enable auto-routing
 *   /zai-route manual   - Disable auto-routing (keep current model)
 *   /zai-route <model>  - Force a specific zai model
 *
 * Shortcut:
 *   Ctrl+Shift+Z        - Toggle auto-routing on/off
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Key } from "@mariozechner/pi-tui";

// ─── Configuration ────────────────────────────────────────────────────────────

// Model IDs as they appear in the zai provider
const ZAI_MODELS = {
	flagship: "glm-5.1",     // Critical coding, SWE-Bench leader
	general: "glm-5",         // General purpose with thinking enabled
	fast: "glm-5",             // Fast mode with thinking disabled
	vision: "glm-5v-turbo",    // Vision (if available)
} as const;

// Vision fallback: used when images are detected and GLM-5V-Turbo is unavailable
const VISION_FALLBACK = {
	provider: "google",
	model: "gemini-2.5-flash",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteReason =
	| "images"
	| "critical_coding"
	| "general_tasks"
	| "simple_tasks"
	| "complex_reasoning";

const ROUTE_LABELS: Record<RouteReason, string> = {
	images: "🖼️  imagens detectadas → vision fallback",
	critical_coding: "🧠 critical coding/SWE-Bench",
	general_tasks: "💰 geral com thinking",
	simple_tasks: "🪶 fast thinking disabled",
	complex_reasoning: "🤔 complex reasoning",
};

const ROUTE_MODELS: Record<RouteReason, string> = {
	images: ZAI_MODELS.vision, // Will use fallback if unavailable
	critical_coding: ZAI_MODELS.flagship,
	general_tasks: ZAI_MODELS.general,
	simple_tasks: ZAI_MODELS.fast,
	complex_reasoning: ZAI_MODELS.general,
};

// ─── Detection patterns ──────────────────────────────────────────────────────

// Image file extensions
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico|avif)\b/i;

// Pi clipboard image paths
const CLIPBOARD_IMAGE_PATTERN = /\/tmp\/pi-clipboard-[a-f0-9-]+\.(png|jpg|jpeg|gif|webp)/i;

// Keywords that signal coding/complex tasks
const CODING_KEYWORDS = [
	// English
	"implement", "refactor", "debug", "fix bug", "architecture",
	"optimize", "algorithm", "data structure", "design pattern",
	"test", "migration", "deploy", "CI/CD", "pipeline",
	"security", "vulnerability", "exploit", "reverse engineer",
	"API", "endpoint", "database", "schema", "query",
	"typescript", "javascript", "python", "rust", "golang",
	"function", "class", "interface", "module", "package",
	"error handling", "exception", "async", "concurrent",
	"performance", "memory", "cpu", "profile",
	"docker", "kubernetes", "terraform", "nginx",
	"compile", "build", "lint", "type check",
	// Portuguese
	"implementar", "implementa", "refatorar", "refatora",
	"corrigir", "corrige", "depurar", "depura",
	"otimizar", "otimiza", "arquitetura",
	"criar função", "criar classe", "criar módulo",
	"analisar código", "analisa código", "code review",
	"escrever código", "escreve código", "programa",
	"banco de dados", "consulta", "migração",
];

// Keywords that signal simple/quick questions
const SIMPLE_KEYWORDS = [
	"what is", "o que é", "what's", "define",
	"explain briefly", "explica", "resumo",
	"yes", "no", "sim", "não", "ok", "thanks",
	"obrigado", "valeu", "beleza",
	"list", "lista", "show", "mostra",
	// Portuguese specific for fast mode
	"translate", "traduzir", "resumir", "formate",
];

// ─── Extension ────────────────────────────────────────────────────────────────

export default function zaiAutoRouter(pi: ExtensionAPI) {
	let autoRouting = true;
	let lastRoute: RouteReason | undefined;
	let lastModelApplied: string | undefined;
	let lastProviderApplied: string | undefined;
	let recentToolCalls = 0;
	let turnsSinceReset = 0;

	// Track zai routing state across provider switches (vision fallback)
	let zaiRoutingActive = false; // True when we're in zai-routing mode
	let lastZaiModelId: string | undefined; // The zai model before vision fallback
	let onVisionFallback = false; // Currently on the vision fallback model

	/**
	 * Check if the current model belongs to zai provider.
	 */
	function isZaiActive(ctx: ExtensionContext): boolean {
		const model = ctx.model;
		if (!model) return false;
		return model.provider === "zai";
	}

	/**
	 * Check if we should handle routing (zai active OR on vision fallback).
	 */
	function shouldRoute(ctx: ExtensionContext): boolean {
		return isZaiActive(ctx) || (zaiRoutingActive && onVisionFallback);
	}

	/**
	 * Detect if the prompt contains images.
	 * Checks both event.images AND image paths/references in prompt text.
	 */
	function detectImages(prompt: string, eventImages?: unknown[]): boolean {
		// Check event.images array
		if (eventImages && Array.isArray(eventImages) && eventImages.length > 0) {
			return true;
		}

		// Check for clipboard image paths in prompt text
		if (CLIPBOARD_IMAGE_PATTERN.test(prompt)) {
			return true;
		}

		// Check for image file references in prompt (e.g., @image.png, ./screenshot.jpg)
		// But exclude common false positives in code (e.g., favicon.ico in HTML)
		const lines = prompt.split("\n");
		for (const line of lines) {
			const trimmed = line.trim();
			// Skip lines that look like code
			if (trimmed.startsWith("//") || trimmed.startsWith("#") ||
				trimmed.startsWith("*") || trimmed.startsWith("<!--")) {
				continue;
			}
			// Check for @file.png references or standalone image paths
			if (/(?:^|\s|@)[\w./-]+\.(png|jpg|jpeg|gif|webp)\b/i.test(trimmed)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Analyze prompt and context to determine the best route.
	 */
	function analyzeRoute(
		prompt: string,
		hasImages: boolean,
		_ctx: ExtensionContext,
	): RouteReason {
		// Rule 1: Images → vision model (highest priority)
		if (hasImages) {
			return "images";
		}

		const promptLower = prompt.toLowerCase();
		const promptLength = prompt.length;

		// Rule 2: Very short/simple prompt → FAST mode
		if (promptLength < 50) {
			const isSimple = SIMPLE_KEYWORDS.some((kw) => promptLower.includes(kw));
			if (isSimple || promptLength < 20) {
				return "simple_tasks";
			}
		}

		// Rule 3: Critical coding/SWE-Bench indicators → GLM-5.1
		const codingScore = CODING_KEYWORDS.reduce((score, kw) => {
			return score + (promptLower.includes(kw.toLowerCase()) ? 1 : 0);
		}, 0);

		// Code blocks or file paths in prompt
		const hasCodeBlocks = prompt.includes("```") || prompt.includes("~~~");
		const hasFilePaths = /[\w-]+\.(ts|js|py|rs|go|java|cpp|c|h|tsx|jsx|vue|svelte|rb|php|sh|yaml|yml|json|toml|sql|md)\b/.test(prompt);
		const hasCodePatterns = /\b(function|const|let|var|import|export|class|interface|def |fn |func |pub |async |await)\b/.test(prompt);

		const effectiveCodingScore = codingScore
			+ (hasCodeBlocks ? 3 : 0)
			+ (hasFilePaths ? 2 : 0)
			+ (hasCodePatterns ? 2 : 0);

		// Critical coding: SWE-Bench level problems, architecture, etc.
		if (effectiveCodingScore >= 4 || 
			promptLower.includes("swe-bench") ||
			promptLower.includes("architecture") ||
			promptLower.includes("system design") ||
			promptLower.includes("microservices") ||
			promptLower.includes("distributed") ||
			promptLength > 1000) {
			return "critical_coding";
		}

		// Rule 4: High tool-call rate → GLM-5 (thinking enabled)
		if (recentToolCalls >= 5 && turnsSinceReset <= 3) {
			return "general_tasks";
		}

		// Rule 5: Long/complex prompt → General tasks with thinking
		if (promptLength > 300 || effectiveCodingScore >= 2) {
			return "complex_reasoning";
		}

		// Rule 6: Medium complexity → General tasks
		if (promptLength > 150) {
			return "general_tasks";
		}

		// Default: fast mode for simple tasks
		return "simple_tasks";
	}

	/**
	 * Apply the routed model.
	 * For vision, uses cross-provider fallback (google/gemini-2.5-flash).
	 * For other routes, uses zai models with thinking mode configuration.
	 */
	async function applyRoute(
		reason: RouteReason,
		ctx: ExtensionContext,
	): Promise<boolean> {
		// ─── Vision route: cross-provider fallback ─────────────────────────
		if (reason === "images") {
			// Save current zai model before switching
			if (isZaiActive(ctx) && ctx.model) {
				lastZaiModelId = ctx.model.id;
			}

			// Try vision fallback (google/gemini-2.5-flash)
			const fallbackModel = ctx.modelRegistry.find(
				VISION_FALLBACK.provider,
				VISION_FALLBACK.model,
			);

			if (fallbackModel) {
				const success = await pi.setModel(fallbackModel);
				if (success) {
					lastRoute = reason;
					lastModelApplied = VISION_FALLBACK.model;
					lastProviderApplied = VISION_FALLBACK.provider;
					onVisionFallback = true;
					zaiRoutingActive = true;
					updateStatus(ctx);
					return true;
				}
			}

			// If fallback fails, try the zai vision model anyway
			const zaiVision = ctx.modelRegistry.find("zai", ZAI_MODELS.vision);
			if (zaiVision) {
				const success = await pi.setModel(zaiVision);
				if (success) {
					lastRoute = reason;
					lastModelApplied = ZAI_MODELS.vision;
					lastProviderApplied = "zai";
					onVisionFallback = false;
					updateStatus(ctx);
					return true;
				}
			}

			// Both failed, stay on current model
			return false;
		}

		// ─── Non-vision route: switch back to zai if on vision fallback ───
		if (onVisionFallback) {
			onVisionFallback = false;
		}

		const targetModelId = ROUTE_MODELS[reason];

		// Don't switch if already on the target model
		if (ctx.model && ctx.model.provider === "zai" && ctx.model.id === targetModelId) {
			// Update thinking mode if needed
			if (reason === "simple_tasks") {
				// For fast mode, ensure thinking is disabled
				ctx.modelRegistry.setConfig(ctx.model.id, { thinking: "disabled" });
			} else {
				// For complex tasks, ensure thinking is enabled
				ctx.modelRegistry.setConfig(ctx.model.id, { thinking: "enabled" });
			}
			
			lastRoute = reason;
			lastModelApplied = targetModelId;
			lastProviderApplied = "zai";
			updateStatus(ctx);
			return true;
		}

		const model = ctx.modelRegistry.find("zai", targetModelId);
		if (!model) {
			return false;
		}

		// Set thinking mode based on the route reason
		if (reason === "simple_tasks") {
			ctx.modelRegistry.setConfig(model.id, { thinking: "disabled" });
		} else {
			ctx.modelRegistry.setConfig(model.id, { thinking: "enabled" });
		}

		const success = await pi.setModel(model);
		if (success) {
			lastRoute = reason;
			lastModelApplied = targetModelId;
			lastProviderApplied = "zai";
			updateStatus(ctx);
		}
		return success;
	}

	/**
	 * Update footer status.
	 */
	function updateStatus(ctx: ExtensionContext) {
		if (!shouldRoute(ctx) && !zaiRoutingActive) {
			ctx.ui.setStatus("zai-router", undefined);
			return;
		}

		const theme = ctx.ui.theme;
		if (!autoRouting) {
			ctx.ui.setStatus(
				"zai-router",
				theme.fg("dim", "zai:manual"),
			);
			return;
		}

		if (lastRoute && lastModelApplied) {
			if (onVisionFallback) {
				// Show vision fallback info
				ctx.ui.setStatus(
					"zai-router",
					theme.fg("warning", `zai→🖼️ ${VISION_FALLBACK.provider}/${VISION_FALLBACK.model}`),
				);
			} else {
				const short = lastModelApplied.replace("glm-", "");
				ctx.ui.setStatus(
					"zai-router",
					theme.fg("accent", `zai→${short}`),
				);
			}
		}
	}

	// ─── Events ───────────────────────────────────────────────────────────────

	/**
	 * Before agent starts: analyze prompt and route if on zai.
	 */
	pi.on("before_agent_start", async (event, ctx) => {
		if (!autoRouting || !shouldRoute(ctx)) return;

		const prompt = event.prompt ?? "";
		const hasImages = detectImages(prompt, event.images as unknown[]);
		const reason = analyzeRoute(prompt, hasImages, ctx);

		await applyRoute(reason, ctx);
	});

	/**
	 * Track tool calls per turn for speed-routing heuristic.
	 */
	pi.on("turn_end", async (event, ctx) => {
		if (!shouldRoute(ctx)) return;

		const toolCount = event.toolResults?.length ?? 0;
		recentToolCalls += toolCount;
		turnsSinceReset++;

		// Decay: reset counter every 5 turns
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
			if (event.model.provider === "zai") {
				// User manually chose a zai model
				lastModelApplied = event.model.id;
				lastProviderApplied = "zai";
				zaiRoutingActive = true;
				onVisionFallback = false;
				updateStatus(ctx);
			} else if (!onVisionFallback) {
				// User switched to a non-zai model (not via our router)
				zaiRoutingActive = false;
				ctx.ui.setStatus("zai-router", undefined);
			}
		}
	});

	/**
	 * Session start: initialize status.
	 */
	pi.on("session_start", async (_event, ctx) => {
		// Restore state from session entries
		for (const entry of ctx.sessionManager.getEntries()) {
			if (
				entry.type === "custom" &&
				(entry as { customType?: string }).customType === "zai-router-state"
			) {
				const data = (entry as { data?: {
					autoRouting?: boolean;
					zaiRoutingActive?: boolean;
					lastZaiModelId?: string;
				} }).data;
				if (data) {
					if (typeof data.autoRouting === "boolean") autoRouting = data.autoRouting;
					if (typeof data.zaiRoutingActive === "boolean") zaiRoutingActive = data.zaiRoutingActive;
					if (typeof data.lastZaiModelId === "string") lastZaiModelId = data.lastZaiModelId;
				}
			}
		}

		recentToolCalls = 0;
		turnsSinceReset = 0;
		onVisionFallback = false;

		if (isZaiActive(ctx)) {
			lastModelApplied = ctx.model?.id;
			lastProviderApplied = "zai";
			zaiRoutingActive = true;
		}

		updateStatus(ctx);
	});

	// ─── Commands ─────────────────────────────────────────────────────────────

	pi.registerCommand("zai-route", {
		description: "Show/control Z.ai auto-routing (auto|manual|<model-name>)",
		handler: async (args, ctx) => {
			const arg = args?.trim().toLowerCase();

			if (!arg) {
				// Show current info
				const status = autoRouting ? "✅ auto" : "⏸️  manual";
				const model = lastModelApplied ?? ctx.model?.id ?? "none";
				const provider = lastProviderApplied ?? ctx.model?.provider ?? "—";
				const reason = lastRoute ? ROUTE_LABELS[lastRoute] : "—";
				const isZai = isZaiActive(ctx);

				let info = `Z.ai Auto Router (GLM-5 Edition)\n`;
				info += `  Status: ${status}\n`;
				info += `  Zai routing: ${zaiRoutingActive ? "ativo" : "inativo"}\n`;
				info += `  Provider atual: ${isZai ? "zai ✓" : provider}\n`;
				info += `  Modelo atual: ${model}\n`;
				info += `  Vision fallback: ${onVisionFallback ? "SIM" : "não"}\n`;
				info += `  Último roteamento: ${reason}\n`;
				info += `  Tool calls recentes: ${recentToolCalls} (${turnsSinceReset} turns)\n`;
				info += `\n`;
				info += `  Roteamento (GLM-5 Family):\n`;
				info += `    🧠 critical coding   → ${ZAI_MODELS.flagship} (SWE-Bench 70%)\n`;
				info += `    💰 geral com thinking → ${ZAI_MODELS.general} (habilitado)\n`;
				info += `    🪶 fast thinking     → ${ZAI_MODELS.fast} (desabilitado)\n`;
				info += `    🤔 complex reasoning → ${ZAI_MODELS.general} (habilitado)\n`;
				info += `    🖼️  imagens          → ${VISION_FALLBACK.provider}/${VISION_FALLBACK.model}\n`;
				info += `\n`;
				info += `  Custo GLM-5: $1.0/$3.2 | GLM-5.1: $1.4/$4.4 | Gemini: plano atual\n`;
				info += `\n`;
				info += `  Uso: /zai-route auto|manual|<modelo>`;

				ctx.ui.notify(info, "info");
				return;
			}

			if (arg === "auto") {
				autoRouting = true;
				zaiRoutingActive = true;
				pi.appendEntry("zai-router-state", { autoRouting: true, zaiRoutingActive: true });
				ctx.ui.notify("Z.ai auto-routing ativado ✅", "info");
				updateStatus(ctx);
				return;
			}

			if (arg === "manual") {
				autoRouting = false;
				pi.appendEntry("zai-router-state", { autoRouting: false, zaiRoutingActive });
				ctx.ui.notify("Z.ai auto-routing desativado ⏸️", "info");
				updateStatus(ctx);
				return;
			}

			// Try to find and apply specific model
			const aliasMap: Record<string, string> = {
				flagship: ZAI_MODELS.flagship,
				critical: ZAI_MODELS.flagship,
				coding: ZAI_MODELS.flagship,
				general: ZAI_MODELS.general,
				capable: ZAI_MODELS.general,
				fast: ZAI_MODELS.fast,
				simple: ZAI_MODELS.fast,
				vision: ZAI_MODELS.vision,
				turbo: ZAI_MODELS.vision,
				...Object.fromEntries(
					Object.values(ZAI_MODELS).map((id) => [id, id]),
				),
			};

			const targetId = aliasMap[arg] ?? arg;
			const model = ctx.modelRegistry.find("zai", targetId);

			if (!model) {
				ctx.ui.notify(
					`Modelo "${arg}" não encontrado. Use: flagship, critical, general, fast, vision ou o ID completo.`,
					"error",
				);
				return;
			}

			autoRouting = false;
			const success = await pi.setModel(model);
			if (success) {
				lastModelApplied = targetId;
				lastProviderApplied = "zai";
				onVisionFallback = false;
				pi.appendEntry("zai-router-state", { autoRouting: false, zaiRoutingActive: true });
				ctx.ui.notify(`Modelo fixado: ${targetId} (auto-routing desativado)`, "info");
			} else {
				ctx.ui.notify(`Falha ao aplicar modelo ${targetId} — sem API key?`, "error");
			}
			updateStatus(ctx);
		},
	});

	// ─── Shortcut ─────────────────────────────────────────────────────────────

	pi.registerShortcut(Key.ctrlShift("z"), {
		description: "Toggle Z.ai auto-routing",
		handler: async (ctx) => {
			autoRouting = !autoRouting;
			if (autoRouting) zaiRoutingActive = true;
			pi.appendEntry("zai-router-state", { autoRouting, zaiRoutingActive });
			const status = autoRouting ? "ativado ✅" : "desativado ⏸️";
			ctx.ui.notify(`Z.ai auto-routing ${status}`, "info");
			updateStatus(ctx);
		},
	});
}
