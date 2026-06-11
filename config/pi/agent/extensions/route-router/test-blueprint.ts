import { IMPLEMENT_FEATURE_NODE_SEQUENCE, implementFeatureBlueprint, validateBlueprintSpec, type BlueprintSpec } from "./blueprint";

function assert(condition: unknown, message: string): void {
	if (!condition) throw new Error(message);
}

const validation = validateBlueprintSpec(implementFeatureBlueprint);
assert(validation.ok, `implement-feature blueprint should validate: ${validation.issues.join("; ")}`);

const sequence = implementFeatureBlueprint.nodes.map((node) => node.id);
assert(sequence.join(" -> ") === IMPLEMENT_FEATURE_NODE_SEQUENCE.join(" -> "), `unexpected node sequence: ${sequence.join(" -> ")}`);

const repairNode = implementFeatureBlueprint.nodes.find((node) => node.id === "Repair");
assert(repairNode?.repair?.maxLoops === 2, "Repair node must cap repair.maxLoops at 2");

for (const node of implementFeatureBlueprint.nodes) {
	assert(Array.isArray(node.inputs), `${node.id}: inputs must be present`);
	assert(Array.isArray(node.outputs), `${node.id}: outputs must be present`);

	if (node.kind === "deterministic") {
		assert(node.role === undefined, `${node.id}: deterministic node must not declare role`);
		assert(node.riskTier === undefined, `${node.id}: deterministic node must not declare riskTier`);
		assert(Boolean(node.validationCommands?.length || node.criteria?.length), `${node.id}: deterministic node needs commands or criteria`);
	}

	if (node.kind === "agentic") {
		assert(node.role !== undefined, `${node.id}: agentic node must declare ModelRole intent`);
		assert(node.riskTier !== undefined, `${node.id}: agentic node must declare RiskTier intent`);
		assert(!Object.prototype.hasOwnProperty.call(node, "provider"), `${node.id}: agentic node must not declare direct provider`);
		assert(!Object.prototype.hasOwnProperty.call(node, "model"), `${node.id}: agentic node must not declare direct model`);
		assert(!Object.prototype.hasOwnProperty.call(node, "modelId"), `${node.id}: agentic node must not declare direct modelId`);
	}
}

const serialized = JSON.stringify(implementFeatureBlueprint);
assert(serialized.length > 0, "blueprint must serialize to JSON");
assert(!/prompt/i.test(serialized), "blueprint JSON must not contain prompt fields or prompt text");
const roundTrip = JSON.parse(serialized) as BlueprintSpec;
assert(validateBlueprintSpec(roundTrip).ok, "round-tripped blueprint must still validate");

const badDeterministic: BlueprintSpec = {
	...implementFeatureBlueprint,
	nodes: implementFeatureBlueprint.nodes.map((node) => (node.id === "ValidateLocal" ? { ...node, role: "copilotWork" } : node)),
};
assert(!validateBlueprintSpec(badDeterministic).ok, "deterministic nodes with role must fail validation");

const badAgenticProvider = {
	...implementFeatureBlueprint,
	nodes: implementFeatureBlueprint.nodes.map((node) => (node.id === "Implement" ? { ...node, provider: "github-copilot" } : node)),
} as unknown as BlueprintSpec;
assert(!validateBlueprintSpec(badAgenticProvider).ok, "agentic nodes with direct provider must fail validation");

const badRepair: BlueprintSpec = {
	...implementFeatureBlueprint,
	nodes: implementFeatureBlueprint.nodes.map((node) => (node.id === "Repair" ? { ...node, repair: { maxLoops: 3 } } : node)),
};
assert(!validateBlueprintSpec(badRepair).ok, "repair.maxLoops other than 2 must fail validation");

console.log(`route-router blueprint fixtures passed (${implementFeatureBlueprint.nodes.length} nodes)`);
