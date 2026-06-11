import type { ModelRole, SupportedProvider } from "./types";

export interface CatalogEntry {
	provider: SupportedProvider;
	label: string;
	short: string;
	fallbacks: string[];
}

export type CostTier = "cheap" | "standard" | "premium" | "frontier";
export type LatencyTier = "fast" | "normal" | "slow";
export type CapabilitySource = "copilot-observed" | "copilot-conservative";

export interface CopilotModelCapabilities {
	// Effective GitHub Copilot vscode-chat window, not the upstream provider's
	// marketing/API window. Keep this conservative unless validated in Copilot.
	effectiveContextTokens: number;
	// Router input budget that leaves room for tool/results/output tokens.
	safeInputTokens: number;
	costTier: CostTier;
	latencyTier: LatencyTier;
	strengths: string[];
	avoidFor: string[];
	source: CapabilitySource;
	note?: string;
}

export type ModelFallbackSkipReason = "unsupported" | "context" | "unhealthy" | "unavailable";

export interface ModelFallbackSkip {
	provider: SupportedProvider;
	modelId: string;
	reason: ModelFallbackSkipReason;
}

export interface ModelResolutionRequirements {
	requiredInputTokens?: number;
	onFallbackSkip?: (skip: ModelFallbackSkip) => void;
}

export const MODEL_ROLE_ORDER: readonly ModelRole[] = [
	"copilotFast",
	"copilotScout",
	"copilotWork",
	"copilotDebug",
	"copilotReview",
	"copilotOracle",
	"copilotVision",
];

export const ROUTE_BASE_LABEL = "github-copilot/* only";

// Authoritative allowlist for GitHub Copilot's vscode-chat integrator.
// Do not route to models merely because pi lists them if the Copilot API rejects
// them for integrator=\"vscode-chat\". This avoids 400 \"model not available\" errors.
export const COPILOT_VSCODE_CHAT_MODELS = new Set([
	"gpt-4.1",
	"gpt-5.2",
	"gpt-5.3-codex",
	"gpt-5.4",
	"gpt-5.4-mini",
	"gpt-5.5",
	"gpt-5-mini",
	"claude-haiku-4.5",
	"claude-sonnet-4.5",
	"claude-sonnet-4.6",
	"claude-opus-4.5",
	"claude-opus-4.6",
	"claude-opus-4.6-fast",
	"claude-opus-4.7",
	"claude-opus-4.8",
	"gemini-3.5-flash",
	"gemini-3-flash-preview",
	"gemini-2.5-pro",
	"mai-code-1-flash",
]);

const CONSERVATIVE_EFFECTIVE_CONTEXT_TOKENS = 128_000;
const CONSERVATIVE_SAFE_INPUT_TOKENS = 96_000;

function conservativeCaps(
	costTier: CostTier,
	latencyTier: LatencyTier,
	strengths: string[],
	avoidFor: string[] = [],
): CopilotModelCapabilities {
	return {
		effectiveContextTokens: CONSERVATIVE_EFFECTIVE_CONTEXT_TOKENS,
		safeInputTokens: CONSERVATIVE_SAFE_INPUT_TOKENS,
		costTier,
		latencyTier,
		strengths,
		avoidFor,
		source: "copilot-conservative",
		note: "Conservative GitHub Copilot vscode-chat routing budget until this model is measured in Copilot.",
	};
}

export const COPILOT_MODEL_CAPABILITIES: Record<string, CopilotModelCapabilities> = {
	"gpt-4.1": conservativeCaps("standard", "normal", ["general coding", "small-to-medium review"]),
	"gpt-5.2": conservativeCaps("standard", "normal", ["general coding", "implementation fallback"]),
	"gpt-5.3-codex": conservativeCaps("standard", "normal", ["code execution loops", "implementation", "tests"]),
	"gpt-5.4": conservativeCaps("premium", "normal", ["planning", "code review", "implementation fallback"]),
	"gpt-5.4-mini": conservativeCaps("cheap", "fast", ["triage", "classification", "small edits"]),
	"gpt-5.5": conservativeCaps("frontier", "slow", ["oracle reasoning", "final judge", "high-risk review"], ["trivial scout work"]),
	"gpt-5-mini": conservativeCaps("cheap", "fast", ["triage", "classification", "small edits"]),
	"claude-haiku-4.5": conservativeCaps("cheap", "fast", ["triage", "summarization", "simple context"]),
	"claude-sonnet-4.5": conservativeCaps("standard", "normal", ["implementation", "debugging", "review"]),
	"claude-sonnet-4.6": conservativeCaps("standard", "normal", ["implementation", "debugging", "review"]),
	"claude-opus-4.5": conservativeCaps("frontier", "slow", ["oracle reasoning", "final judge"], ["trivial scout work"]),
	"claude-opus-4.6": conservativeCaps("frontier", "slow", ["oracle reasoning", "final judge"], ["trivial scout work"]),
	"claude-opus-4.6-fast": conservativeCaps("premium", "normal", ["oracle fallback", "review"]),
	"claude-opus-4.7": conservativeCaps("frontier", "slow", ["oracle reasoning", "final judge"], ["trivial scout work"]),
	"claude-opus-4.8": conservativeCaps("frontier", "slow", ["oracle reasoning", "final judge"], ["trivial scout work"]),
	"gemini-3.5-flash": {
		effectiveContextTokens: 200_000,
		safeInputTokens: 160_000,
		costTier: "cheap",
		latencyTier: "fast",
		strengths: ["broad context scout", "fast summarization", "vision/context fallback"],
		avoidFor: ["frontier judge", "deep architecture", "near-full-window tasks that need long outputs"],
		source: "copilot-observed",
		note: "Treat GitHub Copilot vscode-chat Gemini 3.5 Flash as a 200k-window model, not the upstream 1M-window model.",
	},
	"gemini-3-flash-preview": conservativeCaps("cheap", "fast", ["fast context", "vision/context fallback"], ["frontier judge"]),
	"gemini-2.5-pro": conservativeCaps("premium", "normal", ["reasoning fallback", "large-context planning"], ["cheap triage"]),
	"mai-code-1-flash": conservativeCaps("cheap", "fast", ["triage", "small edits", "fast fallback"]),
};

export function getModelCapabilities(modelId: string): CopilotModelCapabilities {
	return COPILOT_MODEL_CAPABILITIES[modelId] ?? conservativeCaps("standard", "normal", ["unknown Copilot model"]);
}

export function hasContextHeadroom(modelId: string, requiredInputTokens: number | undefined): boolean {
	if (!COPILOT_VSCODE_CHAT_MODELS.has(modelId)) return false;
	if (!requiredInputTokens || requiredInputTokens <= 0) return true;
	return requiredInputTokens <= getModelCapabilities(modelId).safeInputTokens;
}

export function formatTokenBudget(tokens: number): string {
	if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
	return `${Math.round(tokens / 1_000)}k`;
}

export const MODEL_CATALOG: Record<ModelRole, CatalogEntry> = {
	copilotFast: {
		provider: "github-copilot",
		label: "Copilot cheap classifier/triage",
		short: "cp-fast",
		fallbacks: [
			"gpt-5.4-mini",
			"gpt-5-mini",
			"gemini-3.5-flash",
			"claude-haiku-4.5",
			"mai-code-1-flash",
		],
	},
	copilotScout: {
		provider: "github-copilot",
		label: "Copilot broad context/scout",
		short: "cp-scout",
		fallbacks: [
			"gemini-3.5-flash",
			"gpt-5.4-mini",
			"gpt-5-mini",
			"claude-haiku-4.5",
		],
	},
	copilotWork: {
		provider: "github-copilot",
		label: "Copilot implementation executor",
		short: "cp-work",
		fallbacks: [
			"claude-sonnet-4.6",
			"gpt-5.3-codex",
			"gpt-5.4",
			"claude-sonnet-4.5",
			"gpt-5.2",
		],
	},
	copilotDebug: {
		provider: "github-copilot",
		label: "Copilot debugging executor",
		short: "cp-debug",
		fallbacks: [
			"claude-sonnet-4.6",
			"gpt-5.5",
			"gpt-5.4",
			"gpt-5.3-codex",
			"claude-sonnet-4.5",
		],
	},
	copilotReview: {
		provider: "github-copilot",
		label: "Copilot final review/judge",
		short: "cp-review",
		fallbacks: [
			"gpt-5.5",
			"claude-sonnet-4.6",
			"claude-opus-4.7",
			"gpt-5.4",
		],
	},
	copilotOracle: {
		provider: "github-copilot",
		label: "Copilot frontier planning/oracle",
		short: "cp-oracle",
		fallbacks: [
			"gpt-5.5",
			"claude-opus-4.8",
			"claude-opus-4.7",
			"claude-sonnet-4.6",
			"gpt-5.4",
		],
	},
	copilotVision: {
		provider: "github-copilot",
		label: "Copilot vision/context fallback",
		short: "cp-vision",
		fallbacks: [
			"gemini-3.5-flash",
			"claude-sonnet-4.6",
			"gpt-5.5",
			"gpt-5.4-mini",
		],
	},
};

export interface ModelRegistryLike<TModel> {
	find(provider: string, modelId: string): TModel | undefined;
}

export interface ResolvedModel<TModel> {
	role: ModelRole;
	provider: SupportedProvider;
	id: string;
	model: TModel;
	tried: string[];
	catalog: CatalogEntry;
}

export function supportsRouteBase(provider?: string, modelId?: string): boolean {
	// Activate for any GitHub Copilot model so the router can move away from
	// Copilot models that are listed locally but rejected by vscode-chat.
	return provider === "github-copilot" && !!modelId;
}

export function providerForRole(role: ModelRole): SupportedProvider {
	return MODEL_CATALOG[role].provider;
}

export function shortModel(provider: string, modelId: string): string {
	if (provider === "github-copilot") {
		return modelId
			.replace(/^claude-/, "cl-")
			.replace(/^gemini-/, "g-")
			.replace(/-preview$/, "")
			.replace(/-codex$/, "c")
			.replace(/^raptor-/, "rap-");
	}
	return `${provider}/${modelId}`;
}

export function resolveModelRole<TModel>(
	registry: ModelRegistryLike<TModel>,
	role: ModelRole,
	isHealthy: (provider: SupportedProvider, modelId: string) => boolean = () => true,
	requirements: ModelResolutionRequirements = {},
): ResolvedModel<TModel> | undefined {
	const catalog = MODEL_CATALOG[role];
	const tried: string[] = [];

	for (const id of catalog.fallbacks) {
		tried.push(`${catalog.provider}/${id}`);
		if (!COPILOT_VSCODE_CHAT_MODELS.has(id)) {
			requirements.onFallbackSkip?.({ provider: catalog.provider, modelId: id, reason: "unsupported" });
			continue;
		}
		if (!hasContextHeadroom(id, requirements.requiredInputTokens)) {
			requirements.onFallbackSkip?.({ provider: catalog.provider, modelId: id, reason: "context" });
			continue;
		}
		if (!isHealthy(catalog.provider, id)) {
			requirements.onFallbackSkip?.({ provider: catalog.provider, modelId: id, reason: "unhealthy" });
			continue;
		}
		const model = registry.find(catalog.provider, id);
		if (model) {
			return {
				role,
				provider: catalog.provider,
				id,
				model,
				tried,
				catalog,
			};
		}
		requirements.onFallbackSkip?.({ provider: catalog.provider, modelId: id, reason: "unavailable" });
	}

	return undefined;
}
