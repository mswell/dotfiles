import { decideRoute } from "./policy";
import { MODEL_CATALOG, resolveModelRole, supportsRouteBase } from "./model-catalog";
import type { ModelRole, RouteInput } from "./types";

interface Fixture {
	name: string;
	input: RouteInput;
	expect: Partial<{
		active: boolean;
		apply: boolean;
		targetRole: ModelRole;
		thinking: string;
		dormantReasonIncludes: string;
	}>;
}

const fixtures: Fixture[] = [
	{
		name: "dormant on github-copilot gpt",
		input: { mode: "dev", currentProvider: "github-copilot", currentModelId: "gpt-5.5", prompt: "implemente" },
		expect: { active: false, dormantReasonIncludes: "opencode-go" },
	},
	{
		name: "dormant on github-copilot gemini",
		input: { mode: "dev", currentProvider: "github-copilot", currentModelId: "gemini-3.5-flash", prompt: "resuma" },
		expect: { active: false },
	},
	{
		name: "dormant on google gemma",
		input: { mode: "dev", currentProvider: "google", currentModelId: "gemma-4-31b-it", prompt: "resuma" },
		expect: { active: false },
	},
	{
		name: "dormant on direct deepseek provider",
		input: { mode: "dev", currentProvider: "deepseek", currentModelId: "deepseek-v4-pro", prompt: "debug" },
		expect: { active: false },
	},
	{
		name: "active on opencode-go base",
		input: { mode: "dev", currentProvider: "opencode-go", currentModelId: "deepseek-v4-flash", prompt: "resuma estes logs" },
		expect: { active: true, targetRole: "opencodeFast" },
	},
	{
		name: "dev implementation executes on OpenCode Go",
		input: { mode: "dev", currentProvider: "openai-codex", currentModelId: "gpt-5.5", prompt: "implemente testes para auth.ts" },
		expect: { active: true, apply: true, targetRole: "opencodeWork", thinking: "medium" },
	},
	{
		name: "dev architecture plans on GPT-5.5/Codex",
		input: { mode: "dev", currentProvider: "opencode-go", currentModelId: "qwen3.7-max", prompt: "planejar arquitetura para o módulo de autenticação" },
		expect: { active: true, targetRole: "codexPlan", thinking: "high" },
	},
	{
		name: "dev image summary uses Gemini vision fallback",
		input: { mode: "dev", currentProvider: "opencode-go", currentModelId: "deepseek-v4-flash", prompt: "resuma esta imagem", hasImages: true },
		expect: { active: true, targetRole: "geminiFlash" },
	},
	{
		name: "bugbounty heavy reasoning goes GPT-5.5/Codex planning",
		input: { mode: "bugbounty", currentProvider: "opencode-go", currentModelId: "deepseek-v4-flash", prompt: "analise exploitability e impacto de um IDOR com PII" },
		expect: { active: true, targetRole: "codexPlan", thinking: "high" },
	},
	{
		name: "bugbounty poc script executes on OpenCode Go",
		input: { mode: "bugbounty", currentProvider: "google", currentModelId: "gemini-3.5-flash", prompt: "crie um PoC em curl para validar" },
		expect: { active: true, targetRole: "opencodeWork" },
	},
	{
		name: "manual suggests without apply",
		input: { mode: "manual", currentProvider: "google", currentModelId: "gemini-3.5-flash", prompt: "implemente a correção" },
		expect: { active: true, apply: false, targetRole: "opencodeWork" },
	},
	{
		name: "off disables",
		input: { mode: "off", currentProvider: "opencode-go", currentModelId: "deepseek-v4-flash", prompt: "implemente" },
		expect: { active: false },
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
	if (e.dormantReasonIncludes !== undefined) assert(actual.dormantReason?.includes(e.dormantReasonIncludes), `${fixture.name}: dormant reason missing ${e.dormantReasonIncludes}`);
}

assert(supportsRouteBase("google", "gemini-3.5-flash"), "google/gemini should be supported");
assert(supportsRouteBase("openai-codex", "gpt-5.5"), "openai-codex/gpt should be supported");
assert(supportsRouteBase("opencode-go", "deepseek-v4-flash"), "opencode-go should be supported");
assert(!supportsRouteBase("google", "gemma-4-31b-it"), "google/gemma should be dormant");
assert(!supportsRouteBase("github-copilot", "gpt-5.5"), "github-copilot/gpt should be dormant");
assert(!MODEL_CATALOG.codexPlan.fallbacks.includes("gpt-5.3-codex-spark"), "codexPlan must never route to unsupported gpt-5.3-codex-spark");
assert(!MODEL_CATALOG.codexWork.fallbacks.includes("gpt-5.3-codex-spark"), "codexWork must never route to unsupported gpt-5.3-codex-spark");

const fakeRegistry = {
	find(provider: string, modelId: string): { provider: string; modelId: string } | undefined {
		if (provider === "opencode-go" && modelId === "qwen3.7-max") return { provider, modelId };
		if (provider === "opencode-go" && modelId === "deepseek-v4-flash") return { provider, modelId };
		if (provider === "openai-codex" && modelId === "gpt-5.5") return { provider, modelId };
		if (provider === "openai-codex" && modelId === "gpt-5.3-codex-spark") return { provider, modelId };
		if (provider === "google" && modelId === "gemini-flash-latest") return { provider, modelId };
		return undefined;
	},
};

assert(resolveModelRole(fakeRegistry, "opencodeWork")?.id === "qwen3.7-max", "opencodeWork fallback resolution failed");
assert(resolveModelRole(fakeRegistry, "opencodeFast")?.id === "deepseek-v4-flash", "opencodeFast fallback resolution failed");
assert(resolveModelRole(fakeRegistry, "codexPlan")?.id === "gpt-5.5", "codexPlan fallback resolution failed");
assert(resolveModelRole(fakeRegistry, "codexWork")?.id === "gpt-5.5", "codexWork fallback resolution failed");
assert(resolveModelRole(fakeRegistry, "geminiFlash")?.id === "gemini-flash-latest", "geminiFlash fallback resolution failed");

console.log(`route-router policy fixtures passed (${fixtures.length} fixtures)`);
