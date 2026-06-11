export type MaterialityLevel = "low" | "medium" | "high";

export type MaterialChangeKind =
	| "model"
	| "provider"
	| "routing-mode"
	| "validation-command"
	| "config-default"
	| "readme"
	| "docs"
	| "test-policy"
	| "telemetry-field"
	| "internal-refactor"
	| "trivial";

export interface MaterialityCheckInput {
	changedPaths: readonly string[];
	changeKinds?: readonly MaterialChangeKind[];
	existingDocs?: readonly string[];
}

export interface MaterialityCheckResult {
	level: MaterialityLevel;
	blocking: false;
	reasons: string[];
	recommendedDocs: string[];
	recommendedTests: string[];
	recommendations: string[];
	missingDocs: string[];
}

const README_PATH = "agent/extensions/route-router/README.md";
const TEST_POLICY_PATH = "agent/extensions/route-router/test-policy.ts";
const TEST_TELEMETRY_PATH = "agent/extensions/route-router/test-telemetry.ts";
const TEST_BLUEPRINT_PATH = "agent/extensions/route-router/test-blueprint.ts";
const TEST_JUDGE_POLICY_PATH = "agent/extensions/route-router/test-judge-policy.ts";
const TEST_CONTEXT_STAGING_PATH = "agent/extensions/route-router/test-context-staging.ts";

const LEVEL_RANK: Record<MaterialityLevel, number> = { low: 0, medium: 1, high: 2 };

export function checkMateriality(input: MaterialityCheckInput): MaterialityCheckResult {
	const changedPaths = [...new Set(input.changedPaths.map(normalizePath))];
	const inferredKinds = new Set<MaterialChangeKind>(input.changeKinds ?? []);
	for (const changedPath of changedPaths) {
		for (const kind of inferChangeKinds(changedPath)) inferredKinds.add(kind);
	}
	if (inferredKinds.size === 0) inferredKinds.add("trivial");

	let level: MaterialityLevel = "low";
	const reasons: string[] = [];
	const recommendedDocs = new Set<string>();
	const recommendedTests = new Set<string>();

	for (const kind of inferredKinds) {
		const rule = ruleFor(kind);
		if (LEVEL_RANK[rule.level] > LEVEL_RANK[level]) level = rule.level;
		if (rule.reason) reasons.push(rule.reason);
		for (const doc of rule.docs) recommendedDocs.add(doc);
		for (const test of rule.tests) recommendedTests.add(test);
	}

	const docs = [...recommendedDocs].filter((doc) => !changedPaths.includes(doc));
	const tests = [...recommendedTests].filter((test) => !changedPaths.includes(test));
	const existingDocs = new Set((input.existingDocs ?? [README_PATH]).map(normalizePath));
	const missingDocs = docs.filter((doc) => !existingDocs.has(doc));
	const recommendations = buildRecommendations(level, docs, tests, missingDocs);

	return {
		level,
		blocking: false,
		reasons: [...new Set(reasons)],
		recommendedDocs: docs,
		recommendedTests: tests,
		recommendations,
		missingDocs,
	};
}

export function formatMaterialitySummary(result: MaterialityCheckResult): string {
	const docs = result.recommendedDocs.length ? ` docs=${result.recommendedDocs.join(",")}` : " docs=none";
	const tests = result.recommendedTests.length ? ` tests=${result.recommendedTests.join(",")}` : " tests=none";
	const missing = result.missingDocs.length ? ` missingDocs=${result.missingDocs.join(",")}` : "";
	return `Materiality: ${result.level} (non-blocking).${docs};${tests}.${missing}`;
}

function inferChangeKinds(changedPath: string): MaterialChangeKind[] {
	const file = changedPath.split("/").pop() ?? changedPath;
	if (file === "test-policy.ts") return ["test-policy"];
	if (file === "model-catalog.ts") return ["model", "provider"];
	if (file === "policy.ts") return ["routing-mode"];
	if (file === "types.ts") return ["provider", "routing-mode"];
	if (file === "config.ts" || file === "config.json") return ["config-default"];
	if (file === "blueprint.ts") return ["validation-command"];
	if (file === "telemetry.ts") return ["telemetry-field"];
	if (file === "README.md" || changedPath.includes("/docs/") || changedPath.endsWith(".md")) return ["docs"];
	if (/^test-.*\.ts$/.test(file)) return ["internal-refactor"];
	if (changedPath.endsWith(".ts") || changedPath.endsWith(".js")) return ["internal-refactor"];
	return ["trivial"];
}

function ruleFor(kind: MaterialChangeKind): { level: MaterialityLevel; reason: string; docs: string[]; tests: string[] } {
	switch (kind) {
		case "model":
			return high("model catalog changed; README model-role docs and policy fixtures may need updates", [README_PATH], [TEST_POLICY_PATH]);
		case "provider":
			return high("provider/base routing behavior changed; Copilot-only docs and tests may need updates", [README_PATH], [TEST_POLICY_PATH]);
		case "routing-mode":
			return high("routing mode or policy behavior changed; README modes/tiers and policy fixtures may need updates", [README_PATH], [TEST_POLICY_PATH]);
		case "validation-command":
			return high("validation command or blueprint validation behavior changed; README and blueprint fixtures may need updates", [README_PATH], [TEST_BLUEPRINT_PATH]);
		case "config-default":
			return high("config default changed; README config section and policy/config tests may need updates", [README_PATH], [TEST_POLICY_PATH]);
		case "readme":
		case "docs":
			return medium("documentation changed; ensure examples and related agent instructions remain consistent", [], []);
		case "test-policy":
			return medium("policy fixtures changed; README behavior examples may need updates", [README_PATH], []);
		case "telemetry-field":
			return medium("telemetry fields changed; README telemetry docs and telemetry tests may need updates", [README_PATH], [TEST_TELEMETRY_PATH]);
		case "internal-refactor":
			return low("internal refactor without known public router behavior change", [], []);
		case "trivial":
			return low("trivial/non-code change; no docs/tests recommendation by default", [], []);
	}
}

function high(reason: string, docs: string[], tests: string[]) {
	return { level: "high" as const, reason, docs, tests };
}

function medium(reason: string, docs: string[], tests: string[]) {
	return { level: "medium" as const, reason, docs, tests };
}

function low(reason: string, docs: string[], tests: string[]) {
	return { level: "low" as const, reason, docs, tests };
}

function buildRecommendations(level: MaterialityLevel, docs: string[], tests: string[], missingDocs: string[]): string[] {
	const recommendations: string[] = [];
	if (docs.length) recommendations.push(`Review/update docs: ${docs.join(", ")}.`);
	if (tests.length) recommendations.push(`Review/update tests: ${tests.join(", ")}.`);
	if (missingDocs.length) recommendations.push(`Docs not found; record non-blocking recommendation instead of failing: ${missingDocs.join(", ")}.`);
	if (level === "low" && recommendations.length === 0) recommendations.push("No material docs/tests recommendation for trivial or internal-only change.");
	return recommendations;
}

function normalizePath(value: string): string {
	return value.replace(/\\/g, "/").replace(/^\.\//, "");
}
