import { checkMateriality, formatMaterialitySummary } from "./materiality-policy";

function assert(condition: unknown, message: string): void {
	if (!condition) throw new Error(message);
}

const README = "agent/extensions/route-router/README.md";
const TEST_POLICY = "agent/extensions/route-router/test-policy.ts";
const TEST_BLUEPRINT = "agent/extensions/route-router/test-blueprint.ts";
const TEST_TELEMETRY = "agent/extensions/route-router/test-telemetry.ts";

const modelCatalog = checkMateriality({ changedPaths: ["agent/extensions/route-router/model-catalog.ts"] });
assert(modelCatalog.level === "high", "model catalog changes should be high materiality");
assert(modelCatalog.recommendedDocs.includes(README), "model catalog changes should recommend README update");
assert(modelCatalog.recommendedTests.includes(TEST_POLICY), "model catalog changes should recommend test-policy update");
assert(modelCatalog.blocking === false, "materiality check should be non-blocking");

const policy = checkMateriality({ changedPaths: ["agent/extensions/route-router/policy.ts"] });
assert(policy.level === "high", "policy changes should be high materiality");
assert(policy.recommendedDocs.includes(README), "policy changes should recommend README update");
assert(policy.recommendedTests.includes(TEST_POLICY), "policy changes should recommend test-policy update");

const configDefault = checkMateriality({ changedPaths: ["agent/extensions/route-router/config.ts"] });
assert(configDefault.level === "high", "config default changes should be high materiality");
assert(configDefault.recommendedDocs.includes(README), "config changes should recommend README update");

const blueprintValidation = checkMateriality({ changedPaths: ["agent/extensions/route-router/blueprint.ts"] });
assert(blueprintValidation.level === "high", "blueprint validation command changes should be high materiality");
assert(blueprintValidation.recommendedTests.includes(TEST_BLUEPRINT), "blueprint changes should recommend blueprint tests");

const telemetry = checkMateriality({ changedPaths: ["agent/extensions/route-router/telemetry.ts"] });
assert(telemetry.level === "medium", "telemetry field changes should be medium materiality");
assert(telemetry.recommendedDocs.includes(README), "telemetry changes should recommend README update");
assert(telemetry.recommendedTests.includes(TEST_TELEMETRY), "telemetry changes should recommend telemetry tests");

const docs = checkMateriality({ changedPaths: [README] });
assert(docs.level === "medium", "README/doc changes should be medium materiality");
assert(docs.recommendedDocs.length === 0, "README-only changes should not recommend itself again");

const testPolicy = checkMateriality({ changedPaths: [TEST_POLICY] });
assert(testPolicy.level === "medium", "test-policy changes should be medium materiality");
assert(testPolicy.recommendedDocs.includes(README), "test-policy changes should recommend README consistency check");

const internal = checkMateriality({ changedPaths: ["agent/extensions/route-router/internal-refactor.ts"] });
assert(internal.level === "low", "internal refactor should be low materiality");
assert(internal.recommendedDocs.length === 0, "internal refactor should not recommend docs");
assert(internal.recommendedTests.length === 0, "internal refactor should not recommend tests");
assert(internal.recommendations.some((line) => /No material/.test(line)), "low internal change should produce quiet non-noisy recommendation");

const trivial = checkMateriality({ changedPaths: ["agent/extensions/route-router/notes.tmp"] });
assert(trivial.level === "low", "trivial change should be low materiality");
assert(trivial.recommendedDocs.length === 0, "trivial change should not recommend docs");
assert(trivial.recommendedTests.length === 0, "trivial change should not recommend tests");

const missingDocs = checkMateriality({
	changedPaths: ["agent/extensions/route-router/model-catalog.ts"],
	existingDocs: [],
});
assert(missingDocs.level === "high", "missing docs does not lower materiality");
assert(missingDocs.missingDocs.includes(README), "missing README should be recorded");
assert(missingDocs.blocking === false, "missing docs should not block");
assert(missingDocs.recommendations.some((line) => /non-blocking recommendation/.test(line)), "missing docs should be a recommendation, not a failure");

const explicitValidationCommand = checkMateriality({
	changedPaths: ["agent/extensions/route-router/custom-helper.ts"],
	changeKinds: ["validation-command"],
});
assert(explicitValidationCommand.level === "high", "explicit validation command change should be high materiality");
assert(explicitValidationCommand.recommendedDocs.includes(README), "validation command change should recommend README");

const mixed = checkMateriality({ changedPaths: ["agent/extensions/route-router/telemetry.ts", "agent/extensions/route-router/policy.ts", README] });
assert(mixed.level === "high", "mixed changes should take highest materiality");
assert(mixed.recommendedDocs.length === 0, "changed README satisfies docs recommendation");
assert(mixed.recommendedTests.includes(TEST_POLICY), "mixed policy change should still recommend test-policy");
assert(mixed.recommendedTests.includes(TEST_TELEMETRY), "mixed telemetry change should still recommend telemetry tests");

const summary = formatMaterialitySummary(modelCatalog);
assert(summary.includes("Materiality: high"), "summary should include level");
assert(summary.includes("non-blocking"), "summary should state non-blocking");
assert(summary.includes("test-policy.ts"), "summary should include recommended tests");

console.log("route-router materiality policy fixtures passed");
