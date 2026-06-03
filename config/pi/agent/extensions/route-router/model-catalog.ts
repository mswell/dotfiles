import type { ModelRole, SupportedProvider } from "./types";

export interface CatalogEntry {
	provider: SupportedProvider;
	label: string;
	short: string;
	fallbacks: string[];
}

export const MODEL_ROLE_ORDER: readonly ModelRole[] = [
	"opencodeFast",
	"opencodeWork",
	"codexPlan",
	"codexWork",
	"geminiFlash",
	"geminiPro",
];

export const SUPPORTED_ROUTE_BASE_DESCRIPTION = "google/gemini-*, openai-codex/gpt-*, or opencode-go/*";

export const MODEL_CATALOG: Record<ModelRole, CatalogEntry> = {
	opencodeFast: {
		provider: "opencode-go",
		label: "OpenCode Go cheap classifier/triage",
		short: "oc-fast",
		fallbacks: [
			"deepseek-v4-flash",
			"mimo-v2.5",
			"qwen3.6-plus",
			"minimax-m2.5",
		],
	},
	opencodeWork: {
		provider: "opencode-go",
		label: "OpenCode Go implementation executor",
		short: "oc-work",
		fallbacks: [
			"qwen3.7-max",
			"deepseek-v4-pro",
			"qwen3.6-plus",
			"kimi-k2.6",
			"glm-5.1",
		],
	},
	codexPlan: {
		provider: "openai-codex",
		label: "GPT-5.5 planning/review",
		short: "gpt-plan",
		fallbacks: [
			"gpt-5.5",
			"gpt-5.4",
			"gpt-5.3-codex",
			"gpt-5.2",
		],
	},
	codexWork: {
		provider: "openai-codex",
		label: "GPT-5.5 explicit Codex execution",
		short: "gpt-work",
		fallbacks: [
			"gpt-5.5",
			"gpt-5.4",
			"gpt-5.3-codex",
			"gpt-5.2",
		],
	},
	geminiFlash: {
		provider: "google",
		label: "Gemini Flash vision/context fallback",
		short: "g35f",
		fallbacks: [
			"gemini-3.5-flash",
			"gemini-flash-latest",
			"gemini-3-flash-preview",
			"gemini-2.5-flash",
		],
	},
	geminiPro: {
		provider: "google",
		label: "Gemini Pro deep analysis fallback",
		short: "gpro",
		fallbacks: [
			"gemini-3.1-pro-preview",
			"gemini-3-pro-preview",
			"gemini-2.5-pro",
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
	if (!provider || !modelId) return false;
	return (
		(provider === "google" && modelId.startsWith("gemini-")) ||
		(provider === "openai-codex" && modelId.startsWith("gpt-")) ||
		provider === "opencode-go"
	);
}

export function providerForRole(role: ModelRole): SupportedProvider {
	return MODEL_CATALOG[role].provider;
}

export function shortModel(provider: string, modelId: string): string {
	if (provider === "google") {
		return modelId
			.replace(/^gemini-/, "")
			.replace(/-preview$/, "")
			.replace(/-latest$/, "");
	}
	if (provider === "openai-codex") {
		return modelId.replace(/^gpt-/, "g").replace(/-codex$/, "c");
	}
	if (provider === "opencode-go") {
		return modelId
			.replace(/^deepseek-v4-/, "ds-")
			.replace(/^qwen3\./, "q")
			.replace(/^mimo-v/, "mimo-")
			.replace(/^minimax-/, "mm-")
			.replace(/^kimi-k/, "kimi-");
	}
	return `${provider}/${modelId}`;
}

export function resolveModelRole<TModel>(
	registry: ModelRegistryLike<TModel>,
	role: ModelRole,
): ResolvedModel<TModel> | undefined {
	const catalog = MODEL_CATALOG[role];
	const tried: string[] = [];

	for (const id of catalog.fallbacks) {
		tried.push(`${catalog.provider}/${id}`);
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
	}

	return undefined;
}
