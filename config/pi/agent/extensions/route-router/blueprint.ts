import type { ModelRole, RiskTier } from "./types";

export type BlueprintNodeKind = "deterministic" | "agentic";

export interface BlueprintIO {
	name: string;
	description: string;
	required?: boolean;
}

export interface BlueprintValidationCommand {
	cmd: string;
	purpose: string;
	required?: boolean;
}

export interface BlueprintRepairPolicy {
	maxLoops: number;
}

export interface BlueprintNode {
	id: string;
	kind: BlueprintNodeKind;
	role?: ModelRole;
	riskTier?: RiskTier;
	intent?: string;
	inputs: BlueprintIO[];
	outputs: BlueprintIO[];
	validationCommands?: BlueprintValidationCommand[];
	criteria?: string[];
	repair?: BlueprintRepairPolicy;
}

export interface BlueprintSpec {
	id: string;
	version: number;
	description: string;
	nodes: BlueprintNode[];
}

export interface BlueprintValidationResult {
	ok: boolean;
	issues: string[];
}

export const IMPLEMENT_FEATURE_NODE_SEQUENCE = ["Scout", "Plan", "Implement", "ValidateLocal", "Repair", "Judge", "Result"] as const;
export type ImplementFeatureNodeId = (typeof IMPLEMENT_FEATURE_NODE_SEQUENCE)[number];

const MODEL_PROVIDER_KEYS = new Set(["provider", "model", "modelId", "targetProvider", "targetModel"]);

export const implementFeatureBlueprint: BlueprintSpec = {
	id: "implement-feature",
	version: 1,
	description: "Blueprint-lite daily implementation flow: scout, plan, implement, validate locally, repair at most twice, judge, then summarize result.",
	nodes: [
		{
			id: "Scout",
			kind: "agentic",
			role: "copilotScout",
			riskTier: "lite",
			intent: "Map relevant files, constraints, and existing test patterns before edits.",
			inputs: [{ name: "featureSpec", description: "User-visible feature request or handoff path.", required: true }],
			outputs: [{ name: "scoutSummary", description: "Relevant files, patterns, assumptions, and risks." }],
		},
		{
			id: "Plan",
			kind: "agentic",
			role: "copilotOracle",
			riskTier: "full",
			intent: "Write a short implementation plan with affected files and validation commands.",
			inputs: [{ name: "scoutSummary", description: "Compressed reconnaissance from Scout.", required: true }],
			outputs: [{ name: "implementationPlan", description: "Small vertical slice plan and assumptions." }],
		},
		{
			id: "Implement",
			kind: "agentic",
			role: "copilotWork",
			riskTier: "full",
			intent: "Make the smallest code and test changes needed to satisfy the plan.",
			inputs: [{ name: "implementationPlan", description: "Approved local plan for the slice.", required: true }],
			outputs: [{ name: "changedFiles", description: "Files changed plus concise rationale." }],
		},
		{
			id: "ValidateLocal",
			kind: "deterministic",
			inputs: [{ name: "changedFiles", description: "Files changed by Implement.", required: true }],
			outputs: [{ name: "validationOutput", description: "Exit codes and summaries for targeted checks." }],
			validationCommands: [
				{ cmd: "npx --yes tsx test-policy.ts", purpose: "Run route-router policy fixtures.", required: true },
				{ cmd: "npx --yes esbuild index.ts --bundle --platform=node --format=esm --external:@earendil-works/pi-coding-agent --outfile=/tmp/route-router-index.js", purpose: "Bundle/syntax check the extension entrypoint.", required: true },
			],
			criteria: ["All required validation commands exit 0 before judge/result."],
		},
		{
			id: "Repair",
			kind: "agentic",
			role: "copilotDebug",
			riskTier: "full",
			intent: "Fix concrete validation failures and retry local checks without exceeding the loop limit.",
			inputs: [{ name: "validationOutput", description: "Failed command summaries and relevant diagnostics.", required: true }],
			outputs: [{ name: "repairSummary", description: "Fixes applied and remaining failures, if any." }],
			repair: { maxLoops: 2 },
		},
		{
			id: "Judge",
			kind: "agentic",
			role: "copilotReview",
			riskTier: "full",
			intent: "Perform a final adversarial review against the feature definition and validation evidence.",
			inputs: [
				{ name: "changedFiles", description: "Final changed files and rationale.", required: true },
				{ name: "validationOutput", description: "Successful local validation evidence.", required: true },
			],
			outputs: [{ name: "judgeFinding", description: "PASS or concrete blockers only." }],
		},
		{
			id: "Result",
			kind: "deterministic",
			inputs: [{ name: "judgeFinding", description: "Final review result.", required: true }],
			outputs: [{ name: "resultMarkdown", description: "Changed files, commands, validation, and residual risks." }],
			criteria: ["Summarize evidence without raw user text, tokens, cookies, API keys, passwords, or Authorization headers."],
		},
	],
};

export function validateBlueprintSpec(spec: BlueprintSpec): BlueprintValidationResult {
	const issues: string[] = [];

	if (!spec.id) issues.push("spec.id is required");
	if (!Number.isInteger(spec.version) || spec.version < 1) issues.push("spec.version must be a positive integer");
	if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) issues.push("spec.nodes must be a non-empty array");
	if (!isJsonSerializable(spec)) issues.push("blueprint must be JSON-serializable without functions, symbols, undefined, or non-finite numbers");
	collectUnsafeKeys(spec, [], issues);

	if (spec.id === "implement-feature") {
		const actual = spec.nodes.map((node) => node.id);
		if (actual.join(" -> ") !== IMPLEMENT_FEATURE_NODE_SEQUENCE.join(" -> ")) {
			issues.push(`implement-feature sequence must be ${IMPLEMENT_FEATURE_NODE_SEQUENCE.join(" -> ")}`);
		}
	}

	for (const node of spec.nodes) {
		validateNode(node, issues);
	}

	const repairNode = spec.nodes.find((node) => node.id === "Repair");
	if (!repairNode?.repair) {
		issues.push("Repair node must declare repair.maxLoops");
	} else if (repairNode.repair.maxLoops !== 2) {
		issues.push("Repair node repair.maxLoops must equal 2");
	}

	return { ok: issues.length === 0, issues };
}

function validateNode(node: BlueprintNode, issues: string[]): void {
	if (!node.id) issues.push("node.id is required");
	if (node.kind !== "deterministic" && node.kind !== "agentic") issues.push(`${node.id}: kind must be deterministic or agentic`);
	if (!Array.isArray(node.inputs)) issues.push(`${node.id}: inputs must be an array`);
	if (!Array.isArray(node.outputs)) issues.push(`${node.id}: outputs must be an array`);

	if (node.kind === "deterministic") {
		if (node.role) issues.push(`${node.id}: deterministic nodes must not declare role`);
		if (node.riskTier) issues.push(`${node.id}: deterministic nodes must not declare riskTier`);
		if (!hasCommandsOrCriteria(node)) issues.push(`${node.id}: deterministic nodes must declare validationCommands or criteria`);
	}

	if (node.kind === "agentic") {
		if (!node.role) issues.push(`${node.id}: agentic nodes must declare role intent`);
		if (!node.riskTier) issues.push(`${node.id}: agentic nodes must declare riskTier intent`);
		if (node.validationCommands?.length) issues.push(`${node.id}: agentic nodes must not own deterministic validation commands`);
	}

	if (node.repair && node.repair.maxLoops !== 2) issues.push(`${node.id}: repair.maxLoops must equal 2`);
}

function hasCommandsOrCriteria(node: BlueprintNode): boolean {
	return Boolean(node.validationCommands?.length || node.criteria?.length);
}

function collectUnsafeKeys(value: unknown, path: string[], issues: string[]): void {
	if (!value || typeof value !== "object") return;
	if (Array.isArray(value)) {
		value.forEach((item, index) => collectUnsafeKeys(item, [...path, String(index)], issues));
		return;
	}
	for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
		const nextPath = [...path, key];
		if (key.toLowerCase().includes("prompt")) issues.push(`${nextPath.join(".")}: raw prompt fields are not allowed in blueprint specs`);
		if (MODEL_PROVIDER_KEYS.has(key)) issues.push(`${nextPath.join(".")}: direct provider/model fields are not allowed; use role/riskTier intent`);
		collectUnsafeKeys(nested, nextPath, issues);
	}
}

function isJsonSerializable(value: unknown): boolean {
	if (value === null) return true;
	const t = typeof value;
	if (t === "string" || t === "boolean") return true;
	if (t === "number") return Number.isFinite(value);
	if (t === "undefined" || t === "function" || t === "symbol" || t === "bigint") return false;
	if (Array.isArray(value)) return value.every(isJsonSerializable);
	if (t === "object") return Object.values(value as Record<string, unknown>).every(isJsonSerializable);
	return false;
}
