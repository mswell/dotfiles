// Self-test for FINAL_JUDGE_DONE bridge helpers (Track B.2).
import { detectJudgeMarker, extractAssistantText, judgeMarkerEntryId } from "./judge-marker.ts";

function assert(cond: unknown, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exitCode = 1;
		throw new Error(msg);
	}
}

function expectEq<T>(a: T, b: T, msg: string): void {
	if (a !== b) {
		console.error(`FAIL ${msg}: expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`);
		process.exitCode = 1;
		throw new Error(msg);
	}
}

// extractAssistantText
{
	expectEq(extractAssistantText({ role: "assistant", content: "hello" }), "hello", "string content");
	expectEq(
		extractAssistantText({ role: "assistant", content: [{ type: "text", text: "abc" }, { type: "text", text: "def" }] }),
		"abc\ndef",
		"array content concatenated",
	);
	expectEq(extractAssistantText({ role: "user", content: "ignore" }), undefined, "user role ignored");
	expectEq(extractAssistantText({ message: { role: "assistant", content: "wrapped" } }), "wrapped", "wrapped in message");
	expectEq(extractAssistantText(null), undefined, "null entry");
	expectEq(extractAssistantText({ role: "assistant", content: [{ type: "tool_use" }] }), "", "non-text array yields empty");
}

// judgeMarkerEntryId
{
	expectEq(judgeMarkerEntryId({ id: "abc-123" }, "text"), "abc-123", "id used");
	expectEq(judgeMarkerEntryId({ uuid: 42 }, "text"), "42", "uuid stringified");
	const ts = judgeMarkerEntryId({ timestamp: 1234567 }, "12345");
	assert(ts.startsWith("ts:1234567:"), `ts fallback uses timestamp; got ${ts}`);
	const fallback = judgeMarkerEntryId({}, "the rendered output ending with marker FINAL_JUDGE_DONE here");
	assert(fallback.length > 0 && fallback.includes("FINAL_JUDGE_DONE"), "fallback uses text suffix");
}

// detectJudgeMarker
{
	expectEq(detectJudgeMarker([], undefined), undefined, "empty branch");

	// Most recent assistant has marker → fires.
	const branchA = [
		{ role: "assistant", id: "a1", content: "earlier" },
		{ role: "user", id: "u1", content: "ack" },
		{ role: "assistant", id: "a2", content: "result\n\nFINAL_JUDGE_DONE\n" },
	];
	const fired = detectJudgeMarker(branchA, undefined);
	assert(fired !== undefined, "fires on marker present");
	expectEq(fired!.entryId, "a2", "fires on latest entry id");

	// Same id already processed → no fire.
	const skip = detectJudgeMarker(branchA, "a2");
	expectEq(skip, undefined, "idempotent on same id");

	// Most recent assistant does NOT have marker → no fire even if earlier one had it.
	const branchB = [
		{ role: "assistant", id: "a1", content: "result\n\nFINAL_JUDGE_DONE\n" },
		{ role: "assistant", id: "a2", content: "follow-up without marker" },
	];
	expectEq(detectJudgeMarker(branchB, undefined), undefined, "old marker ignored when new turn lacks it");

	// Marker as substring inside array content.
	const branchC = [
		{ role: "assistant", id: "a3", content: [{ type: "text", text: "line\nFINAL_JUDGE_DONE\n" }] },
	];
	const c = detectJudgeMarker(branchC, undefined);
	assert(c !== undefined && c.entryId === "a3", "marker in array content");

	// Marker in user message → no fire.
	const branchD = [
		{ role: "user", id: "u1", content: "FINAL_JUDGE_DONE leaked" },
	];
	expectEq(detectJudgeMarker(branchD, undefined), undefined, "marker in user message ignored");
}

console.log("pi-harness judge-marker tests passed (16 assertions)");
