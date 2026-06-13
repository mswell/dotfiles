// Self-test for the entry-side blueprint->harness bridge consumer helpers.
// Kept independent from copilot-blueprints so pi-harness remains an optional integration.
import { parseHandoff, shouldConsumeHandoff, shouldProceedWithHandoff, type BlueprintHandoff } from "./blueprint-bridge.ts";

function assert(cond: unknown, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exitCode = 1;
		throw new Error(msg);
	}
}

function expectEq<T>(actual: T, expected: T, msg: string): void {
	if (actual !== expected) {
		console.error(`FAIL ${msg}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
		process.exitCode = 1;
		throw new Error(msg);
	}
}

function handoff(overrides: Partial<BlueprintHandoff> = {}): BlueprintHandoff {
	return {
		source: "copilot-blueprints",
		version: 1,
		runId: "run-123",
		runDir: "/repo/.pi/runs/run-123",
		blueprint: "implement-feature",
		mission: "add a logout button",
		phase: "E",
		contract: "# Task Contract: implement-feature\n\nMission: add a logout button\n",
		createdAt: "2026-06-12T00:04:30.000Z",
		consumed: false,
		...overrides,
	};
}

// --- parseHandoff accepts the minimal producer contract ---
{
	const parsed = parseHandoff(JSON.stringify(handoff({ runId: "run-9", runDir: "/x" })));
	assert(parsed !== undefined, "valid handoff parses");
	expectEq(parsed!.source, "copilot-blueprints", "source preserved");
	expectEq(parsed!.runId, "run-9", "runId preserved");
	expectEq(parsed!.phase, "E", "phase preserved");
	expectEq(parsed!.consumed, false, "consumed preserved");
	assert(parsed!.contract.includes("# Task Contract"), "contract embedded");
}

// --- parseHandoff rejects malformed / foreign records ---
{
	expectEq(parseHandoff("not json"), undefined, "rejects non-json");
	expectEq(parseHandoff(JSON.stringify({ source: "other", version: 1 })), undefined, "rejects foreign source");
	expectEq(parseHandoff(JSON.stringify({ ...handoff(), version: 2 })), undefined, "rejects wrong version");
	expectEq(parseHandoff(JSON.stringify({ ...handoff(), phase: "V" })), undefined, "rejects non-E phase");
	expectEq(parseHandoff(JSON.stringify({ ...handoff(), runId: 123 })), undefined, "rejects non-string runId");
	expectEq(parseHandoff(JSON.stringify({ ...handoff(), contract: 123 })), undefined, "rejects non-string contract");
}

// --- shouldConsumeHandoff gating ---
{
	const now = Date.parse("2026-06-12T00:05:00.000Z");
	const fresh = parseHandoff(JSON.stringify(handoff({ runId: "r1" })))!;
	assert(shouldConsumeHandoff(fresh, undefined, now), "fresh handoff consumed");
	assert(!shouldConsumeHandoff(fresh, "r1", now), "already-processed runId skipped");
	assert(!shouldConsumeHandoff({ ...fresh, consumed: true }, undefined, now), "consumed flag skipped");

	const stale = parseHandoff(JSON.stringify(handoff({ runId: "r2", createdAt: "2026-06-11T00:00:00.000Z" })))!;
	assert(!shouldConsumeHandoff(stale, undefined, now), "stale handoff skipped");

	const future = parseHandoff(JSON.stringify(handoff({ runId: "r3", createdAt: "2026-06-12T02:00:00.000Z" })))!;
	assert(!shouldConsumeHandoff(future, undefined, now), "future-dated handoff skipped");
}

// --- shouldProceedWithHandoff: auto-init gating ---
{
	assert(shouldProceedWithHandoff(true, false), "existing harness proceeds (auto-init on)");
	assert(shouldProceedWithHandoff(true, true), "existing harness proceeds even with opt-out");
	assert(shouldProceedWithHandoff(false, false), "missing harness proceeds when auto-init enabled");
	assert(!shouldProceedWithHandoff(false, true), "missing harness skipped when opt-out set");
}

console.log("blueprint-bridge consumer tests passed (24 assertions)");
