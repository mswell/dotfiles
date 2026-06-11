import { decideJudgePolicy, formatJudgeDisclosure, summarizeJudgeInstructions, type JudgeWorkType } from "./judge-policy";
import type { RiskTier } from "./types";

function assert(condition: unknown, message: string): void {
	if (!condition) throw new Error(message);
}

interface Fixture {
	name: string;
	riskTier: RiskTier;
	workType?: JudgeWorkType;
	explicitJudgeRequest?: boolean;
	availableAgents?: string[];
	expect: {
		fanOut: "none" | "single-reviewer" | "multi-reviewer";
		finalJudgeRequired: boolean;
		requiredAgents: string[];
		optionalAgents?: string[];
		manualFallbackRequired?: boolean;
	};
}

const fixtures: Fixture[] = [
	{
		name: "trivial uses no subagent",
		riskTier: "trivial",
		workType: "code",
		expect: { fanOut: "none", finalJudgeRequired: false, requiredAgents: [] },
	},
	{
		name: "trivial explicit judge allows optional reviewer without requiring fan-out",
		riskTier: "trivial",
		workType: "code",
		explicitJudgeRequest: true,
		expect: { fanOut: "none", finalJudgeRequired: false, requiredAgents: [], optionalAgents: ["reviewer"] },
	},
	{
		name: "lite uses optional single reviewer",
		riskTier: "lite",
		workType: "code",
		expect: { fanOut: "single-reviewer", finalJudgeRequired: false, requiredAgents: [], optionalAgents: ["reviewer"] },
	},
	{
		name: "docs lite does not fan out by default",
		riskTier: "lite",
		workType: "docs",
		expect: { fanOut: "none", finalJudgeRequired: false, requiredAgents: [] },
	},
	{
		name: "typo full does not fan out by default",
		riskTier: "full",
		workType: "typo",
		expect: { fanOut: "none", finalJudgeRequired: false, requiredAgents: [] },
	},
	{
		name: "full requires final reviewer",
		riskTier: "full",
		workType: "code",
		expect: { fanOut: "multi-reviewer", finalJudgeRequired: true, requiredAgents: ["reviewer"], optionalAgents: ["code-quality", "docs"] },
	},
	{
		name: "critical security requires oracle reviewer and security specialist",
		riskTier: "critical",
		workType: "security",
		availableAgents: ["oracle", "reviewer", "security"],
		expect: { fanOut: "multi-reviewer", finalJudgeRequired: true, requiredAgents: ["oracle", "reviewer", "security"], manualFallbackRequired: false },
	},
	{
		name: "critical non-security requires relevant code specialist",
		riskTier: "critical",
		workType: "code",
		availableAgents: ["oracle", "reviewer", "code-quality"],
		expect: { fanOut: "multi-reviewer", finalJudgeRequired: true, requiredAgents: ["oracle", "reviewer", "code-quality"], manualFallbackRequired: false },
	},
	{
		name: "critical falls back manually when specialist unavailable",
		riskTier: "critical",
		workType: "security",
		availableAgents: ["oracle", "reviewer"],
		expect: { fanOut: "multi-reviewer", finalJudgeRequired: true, requiredAgents: ["oracle", "reviewer", "security"], manualFallbackRequired: true },
	},
];

for (const fixture of fixtures) {
	const actual = decideJudgePolicy({
		riskTier: fixture.riskTier,
		workType: fixture.workType,
		explicitJudgeRequest: fixture.explicitJudgeRequest,
		availableAgents: fixture.availableAgents,
	});
	assert(actual.fanOut === fixture.expect.fanOut, `${fixture.name}: fanOut expected ${fixture.expect.fanOut}, got ${actual.fanOut}`);
	assert(actual.finalJudgeRequired === fixture.expect.finalJudgeRequired, `${fixture.name}: finalJudgeRequired expected ${fixture.expect.finalJudgeRequired}, got ${actual.finalJudgeRequired}`);
	assert(actual.dedupeBlockers === true, `${fixture.name}: must dedupe blockers`);
	assert(actual.ignoreNits === true, `${fixture.name}: must ignore nits`);
	const required = actual.participants.filter((participant) => participant.required).map((participant) => participant.agent).sort();
	const expectedRequired = [...fixture.expect.requiredAgents].sort();
	assert(required.join(",") === expectedRequired.join(","), `${fixture.name}: required agents expected ${expectedRequired}, got ${required}`);
	if (fixture.expect.optionalAgents) {
		const optional = actual.participants.filter((participant) => !participant.required).map((participant) => participant.agent).sort();
		const expectedOptional = [...fixture.expect.optionalAgents].sort();
		assert(optional.join(",") === expectedOptional.join(","), `${fixture.name}: optional agents expected ${expectedOptional}, got ${optional}`);
	}
	if (fixture.expect.manualFallbackRequired !== undefined) {
		assert(actual.manualFallbackRequired === fixture.expect.manualFallbackRequired, `${fixture.name}: manual fallback expected ${fixture.expect.manualFallbackRequired}, got ${actual.manualFallbackRequired}`);
	}
}

const manualFallback = decideJudgePolicy({ riskTier: "critical", workType: "security", availableAgents: ["reviewer"] });
assert(manualFallback.manualFallbackRequired, "missing oracle/security should require manual fallback");
assert(manualFallback.manualFallbackReason?.includes("oracle"), "manual fallback reason should name missing oracle");
assert(manualFallback.manualFallbackReason?.includes("security"), "manual fallback reason should name missing security specialist");

const instructions = summarizeJudgeInstructions(decideJudgePolicy({ riskTier: "full", workType: "code" }));
assert(instructions.some((line) => /Deduplicate/.test(line)), "instructions must mention deduplication");
assert(instructions.some((line) => /ignore nits/i.test(line)), "instructions must mention ignoring nits");
assert(instructions.some((line) => /staged context paths/i.test(line)), "instructions must prefer staged context paths");

const ranDisclosure = formatJudgeDisclosure(decideJudgePolicy({ riskTier: "full", workType: "code" }), { ran: true, blockers: 0 });
assert(ranDisclosure.includes("Judge: ran"), "ran disclosure should state judge ran");
assert(ranDisclosure.includes("0 blocker"), "ran disclosure should include blocker count");

const skippedDisclosure = formatJudgeDisclosure(decideJudgePolicy({ riskTier: "trivial", workType: "code" }), { ran: false });
assert(skippedDisclosure.includes("Judge: not run"), "skipped disclosure should state judge did not run");
assert(skippedDisclosure.includes("trivial"), "skipped disclosure should include reason");

const requiredButMissingDisclosure = formatJudgeDisclosure(decideJudgePolicy({ riskTier: "full", workType: "code" }), { ran: false, reason: "subagent unavailable" });
assert(requiredButMissingDisclosure.includes("required by full policy"), "required disclosure should mention full policy");
assert(requiredButMissingDisclosure.includes("subagent unavailable"), "required disclosure should include reason");

console.log(`route-router judge policy fixtures passed (${fixtures.length} fixtures)`);
