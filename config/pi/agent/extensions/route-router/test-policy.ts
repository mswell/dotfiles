import { decideRoute } from "./policy";
import { COPILOT_MODEL_CAPABILITIES, COPILOT_VSCODE_CHAT_MODELS, getModelCapabilities, hasContextHeadroom, MODEL_CATALOG, resolveModelRole, supportsRouteBase } from "./model-catalog";
import type { ModelRole, RiskTier, RouteInput } from "./types";

interface Fixture {
	name: string;
	input: RouteInput;
	expect: Partial<{
		active: boolean;
		apply: boolean;
		targetRole: ModelRole;
		thinking: string;
		riskTier: RiskTier;
		dormantReasonIncludes: string;
	}>;
}

const fixtures: Fixture[] = [
	{
		name: "active on github-copilot gpt",
		input: { mode: "dev", currentProvider: "github-copilot", currentModelId: "gpt-5.5", prompt: "implemente" },
		expect: { active: true, targetRole: "copilotWork", riskTier: "full" },
	},
	{
		name: "copilot architecture uses oracle",
		input: { mode: "dev", currentProvider: "github-copilot", currentModelId: "gpt-5.5", prompt: "planejar arquitetura para o módulo de autenticação" },
		expect: { active: true, targetRole: "copilotOracle", thinking: "high" },
	},
	{
		name: "copilot debug uses debug role",
		input: { mode: "dev", currentProvider: "github-copilot", currentModelId: "claude-sonnet-4.6", prompt: "debug este stacktrace de teste falhando" },
		expect: { active: true, targetRole: "copilotDebug", thinking: "medium" },
	},
	{
		name: "copilot broad summary uses scout",
		input: { mode: "dev", currentProvider: "github-copilot", currentModelId: "gemini-3.5-flash", prompt: "resuma e mapeia estes logs" },
		expect: { active: true, targetRole: "copilotScout", riskTier: "lite" },
	},
	{
		name: "copilot image summary uses vision",
		input: { mode: "dev", currentProvider: "github-copilot", currentModelId: "gpt-5.4-mini", prompt: "resuma esta imagem", hasImages: true },
		expect: { active: true, targetRole: "copilotVision" },
	},
	{
		name: "bugbounty heavy reasoning goes Copilot oracle",
		input: { mode: "bugbounty", currentProvider: "github-copilot", currentModelId: "gpt-5.5", prompt: "analise exploitability e impacto de um IDOR com PII" },
		expect: { active: true, targetRole: "copilotOracle", thinking: "high" },
	},
	{
		name: "bugbounty poc script executes on Copilot work",
		input: { mode: "bugbounty", currentProvider: "github-copilot", currentModelId: "gpt-5.4-mini", prompt: "crie um PoC em curl para validar" },
		expect: { active: true, targetRole: "copilotWork" },
	},
	{
		name: "max critical uses xhigh oracle",
		input: { mode: "max", currentProvider: "github-copilot", currentModelId: "claude-sonnet-4.6", prompt: "raciocínio máximo: analise risco critical de RCE" },
		expect: { active: true, targetRole: "copilotOracle", thinking: "xhigh", riskTier: "critical" },
	},
	{
		name: "trivial prompt in max mode does not escalate to oracle",
		input: { mode: "max", currentProvider: "github-copilot", currentModelId: "gpt-5.5", prompt: "ok" },
		expect: { active: true, targetRole: "copilotFast", thinking: "low", riskTier: "trivial" },
	},
	{
		name: "manual suggests without apply",
		input: { mode: "manual", currentProvider: "github-copilot", currentModelId: "gpt-5.5", prompt: "implemente a correção" },
		expect: { active: true, apply: false, targetRole: "copilotWork" },
	},
	{
		name: "off disables",
		input: { mode: "off", currentProvider: "github-copilot", currentModelId: "gpt-5.5", prompt: "implemente" },
		expect: { active: false },
	},
	{
		name: "dormant on google gemini",
		input: { mode: "dev", currentProvider: "google", currentModelId: "gemini-3.5-flash", prompt: "resuma" },
		expect: { active: false, dormantReasonIncludes: "github-copilot" },
	},
	{
		name: "dormant on openai-codex",
		input: { mode: "dev", currentProvider: "openai-codex", currentModelId: "gpt-5.5", prompt: "planeje" },
		expect: { active: false, dormantReasonIncludes: "github-copilot" },
	},
	{
		name: "dormant on opencode-go",
		input: { mode: "dev", currentProvider: "opencode-go", currentModelId: "deepseek-v4-flash", prompt: "implemente" },
		expect: { active: false, dormantReasonIncludes: "github-copilot" },
	},
];

function assert(condition: unknown, message: string): void {
	if (!condition) throw new Error(message);
}

for (const fixture of fixtures) {
	const actual = decideRoute(fixture.input);
	const e = fixture.expect;
	if (e.active !== undefined) assert(actual.active === e.active, `${fixture.name}: active expected ${e.active}, got ${actual.active}`);
	if (e.apply !== undefined) assert(actual.apply === e.apply, `${fixture.name}: apply expected ${e.apply}, got ${actual.apply}`);
	if (e.targetRole !== undefined) assert(actual.targetRole === e.targetRole, `${fixture.name}: targetRole expected ${e.targetRole}, got ${actual.targetRole}`);
	if (e.thinking !== undefined) assert(actual.thinking === e.thinking, `${fixture.name}: thinking expected ${e.thinking}, got ${actual.thinking}`);
	if (e.riskTier !== undefined) assert(actual.riskTier === e.riskTier, `${fixture.name}: riskTier expected ${e.riskTier}, got ${actual.riskTier}`);
	if (e.dormantReasonIncludes !== undefined) assert(actual.dormantReason?.includes(e.dormantReasonIncludes), `${fixture.name}: dormant reason missing ${e.dormantReasonIncludes}`);
}

assert(supportsRouteBase("github-copilot", "gpt-5.5"), "github-copilot/gpt should be supported");
assert(supportsRouteBase("github-copilot", "claude-sonnet-4.6"), "github-copilot/claude should be supported");
assert(supportsRouteBase("github-copilot", "gemini-3.5-flash"), "github-copilot/gemini should be supported");
assert(supportsRouteBase("github-copilot", "gpt-5.4-nano"), "router must wake up on invalid Copilot model so it can route away before provider call");
assert(!supportsRouteBase("google", "gemini-3.5-flash"), "google/gemini must be dormant");
assert(!supportsRouteBase("openai-codex", "gpt-5.5"), "openai-codex/gpt must be dormant");
assert(!supportsRouteBase("opencode-go", "deepseek-v4-flash"), "opencode-go must be dormant");
for (const [role, catalog] of Object.entries(MODEL_CATALOG)) {
	assert(catalog.provider === "github-copilot", `${role} must use only github-copilot provider`);
	assert(!catalog.fallbacks.includes("gemini-3.1-pro-preview"), `${role} must not use Gemini 3.1 Pro`);
	for (const model of catalog.fallbacks) {
		assert(COPILOT_VSCODE_CHAT_MODELS.has(model), `${role} fallback ${model} is not in Copilot vscode-chat allowlist`);
		assert(COPILOT_MODEL_CAPABILITIES[model], `${role} fallback ${model} must declare Copilot-effective capabilities`);
	}
}

for (const model of COPILOT_VSCODE_CHAT_MODELS) {
	const caps = getModelCapabilities(model);
	assert(caps.safeInputTokens > 0, `${model} safe input budget must be positive`);
	assert(caps.safeInputTokens <= caps.effectiveContextTokens, `${model} safe input budget must fit effective context`);
	assert(caps.effectiveContextTokens < 1_000_000 || model !== "gemini-3.5-flash", "Copilot Gemini Flash must not inherit upstream 1M context");
}

const geminiFlashCaps = getModelCapabilities("gemini-3.5-flash");
assert(geminiFlashCaps.effectiveContextTokens === 200_000, "Copilot Gemini 3.5 Flash effective window should be 200k");
assert(geminiFlashCaps.safeInputTokens === 160_000, "Copilot Gemini 3.5 Flash safe input budget should leave output/tool headroom");
assert(hasContextHeadroom("gemini-3.5-flash", 150_000), "Gemini Flash should accept context inside its safe budget");
assert(!hasContextHeadroom("gemini-3.5-flash", 180_000), "Gemini Flash should reject near-full 200k contexts to preserve output headroom");
assert(!hasContextHeadroom("gpt-5.4-nano", undefined), "invalid Copilot models must not pass context/anti-churn headroom checks");

const fakeRegistry = {
	find(provider: string, modelId: string): { provider: string; modelId: string } | undefined {
		if (provider === "github-copilot" && modelId === "gpt-5.4-nano") return { provider, modelId }; // registry may list it; resolver must still skip it
		if (provider === "github-copilot" && modelId === "gpt-5.4-mini") return { provider, modelId };
		if (provider === "github-copilot" && modelId === "gemini-3.5-flash") return { provider, modelId };
		if (provider === "github-copilot" && modelId === "claude-sonnet-4.6") return { provider, modelId };
		if (provider === "github-copilot" && modelId === "gpt-5.5") return { provider, modelId };
		return undefined;
	},
};

assert(resolveModelRole(fakeRegistry, "copilotFast")?.id === "gpt-5.4-mini", "copilotFast fallback resolution failed");
assert(resolveModelRole(fakeRegistry, "copilotFast", (_provider, modelId) => modelId !== "gpt-5.4-mini")?.id === "gemini-3.5-flash", "copilotFast should skip unhealthy primary fallback");
assert(resolveModelRole(fakeRegistry, "copilotScout")?.id === "gemini-3.5-flash", "copilotScout fallback resolution failed");
assert(resolveModelRole(fakeRegistry, "copilotScout", () => true, { requiredInputTokens: 150_000 })?.id === "gemini-3.5-flash", "copilotScout should allow Gemini Flash within Copilot-safe 200k budget");
assert(resolveModelRole(fakeRegistry, "copilotScout", () => true, { requiredInputTokens: 180_000 }) === undefined, "copilotScout should refuse near-full Gemini Flash context instead of assuming upstream 1M");
assert(resolveModelRole(fakeRegistry, "copilotWork")?.id === "claude-sonnet-4.6", "copilotWork fallback resolution failed");
assert(resolveModelRole(fakeRegistry, "copilotDebug")?.id === "claude-sonnet-4.6", "copilotDebug fallback resolution failed");
assert(resolveModelRole(fakeRegistry, "copilotOracle")?.id === "gpt-5.5", "copilotOracle fallback resolution failed");
assert(resolveModelRole(fakeRegistry, "copilotReview")?.id === "gpt-5.5", "copilotReview fallback resolution failed");
assert(resolveModelRole(fakeRegistry, "copilotVision")?.id === "gemini-3.5-flash", "copilotVision fallback resolution failed");

console.log(`route-router Copilot-only policy fixtures passed (${fixtures.length} fixtures)`);
