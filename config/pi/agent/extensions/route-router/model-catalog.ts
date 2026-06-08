import type { ModelRole, SupportedProvider } from "./types";

export interface CatalogEntry {
	provider: SupportedProvider;
	label: string;
	short: string;
	fallbacks: string[];
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

export const SUPPORTED_ROUTE_BASE_DESCRIPTION = "github-copilot/* only";

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
): ResolvedModel<TModel> | undefined {
	const catalog = MODEL_CATALOG[role];
	const tried: string[] = [];

	for (const id of catalog.fallbacks) {
		tried.push(`${catalog.provider}/${id}`);
		if (!COPILOT_VSCODE_CHAT_MODELS.has(id)) continue;
		if (!isHealthy(catalog.provider, id)) continue;
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
