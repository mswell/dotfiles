// Self-test for pi-harness goal evaluator parsing and shell execution.
// Run: tsx test-goal-evaluator.ts  (or `node --experimental-strip-types test-goal-evaluator.ts` on Node >= 22.6)
// No deps on @earendil-works/* runtime: only the parser and shell evaluator are exercised.

import { parseGoalInput, evaluateGoalWithShell } from "./goal-evaluator.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(cond: unknown, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exitCode = 1;
		throw new Error(msg);
	}
}

function expectEq<T>(actual: T, expected: T, msg: string): void {
	if (actual !== expected) {
		console.error(`FAIL: ${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
		process.exitCode = 1;
		throw new Error(msg);
	}
}

// --- parseGoalInput ---

// 1. plain condition + default turns
{
	const p = parseGoalInput("tests must pass");
	expectEq(p.condition, "tests must pass", "plain condition");
	expectEq(p.maxTurns, 10, "default maxTurns is 10");
	expectEq(p.maxMinutes, undefined, "maxMinutes default undefined");
	expectEq(p.evaluatorCmd, undefined, "no evaluatorCmd by default");
	expectEq(p.evaluatorTimeoutMs, undefined, "no evaluatorTimeoutMs by default");
}

// 2. --max-turns and --max-minutes flags
{
	const p = parseGoalInput("--max-turns 5 --max-minutes=15 fix the failing build");
	expectEq(p.condition, "fix the failing build", "condition after stripped flags");
	expectEq(p.maxTurns, 5, "maxTurns parsed");
	expectEq(p.maxMinutes, 15, "maxMinutes parsed");
}

// 3. quoted --evaluator with double quotes
{
	const p = parseGoalInput('--evaluator "npm test --silent" all tests green');
	expectEq(p.evaluatorCmd, "npm test --silent", "double-quoted evaluator");
	expectEq(p.condition, "all tests green", "condition kept after evaluator");
}

// 4. quoted --evaluator with single quotes and escaped quotes inside
{
	const p = parseGoalInput("--evaluator='echo \\'ok\\'' verify echo");
	expectEq(p.evaluatorCmd, "echo 'ok'", "single-quoted evaluator with escapes");
	expectEq(p.condition, "verify echo", "condition kept after escaped evaluator");
}

// 5. bare --evaluator (no spaces in cmd)
{
	const p = parseGoalInput("--evaluator true the do-nothing check");
	expectEq(p.evaluatorCmd, "true", "bare evaluator parsed");
	expectEq(p.condition, "the do-nothing check", "condition kept after bare evaluator");
}

// 6. evaluator-timeout in seconds
{
	const p = parseGoalInput('--evaluator "true" --evaluator-timeout 5s pass');
	expectEq(p.evaluatorCmd, "true", "evaluator parsed alongside timeout");
	expectEq(p.evaluatorTimeoutMs, 5000, "timeout 5s -> 5000ms");
}

// 7. evaluator-timeout in minutes
{
	const p = parseGoalInput('--evaluator "true" --evaluator-timeout=2m pass');
	expectEq(p.evaluatorTimeoutMs, 120_000, "timeout 2m -> 120000ms");
}

// 8. evaluator-timeout raw ms with cap
{
	const p = parseGoalInput('--evaluator "true" --evaluator-timeout 999999999 pass');
	expectEq(p.evaluatorTimeoutMs, 600_000, "timeout caps at 10min");
}

// 9. empty condition rejected
{
	let threw = false;
	try {
		parseGoalInput("--max-turns 3");
	} catch {
		threw = true;
	}
	assert(threw, "empty condition must throw");
}

// 10. empty --evaluator value rejected
{
	let threw = false;
	try {
		parseGoalInput('--evaluator "" something');
	} catch {
		threw = true;
	}
	assert(threw, "empty evaluator must throw");
}

// --- evaluateGoalWithShell ---

async function shellTests(): Promise<void> {
	const cwd = mkdtempSync(join(tmpdir(), "pi-harness-eval-"));

	// 11. exit 0 -> achieved
	{
		const result = await evaluateGoalWithShell({ cwd, cmd: "true" });
		expectEq(result.achieved, true, "true returns achieved");
		assert(result.reason.includes("exit=0"), "reason mentions exit=0");
	}

	// 12. exit non-zero -> not achieved
	{
		const result = await evaluateGoalWithShell({ cwd, cmd: "false" });
		expectEq(result.achieved, false, "false returns not achieved");
		assert(/exit=(1|[2-9]\d*)/.test(result.reason), `reason mentions non-zero exit; got: ${result.reason}`);
	}

	// 13. stdout captured (tailed)
	{
		const result = await evaluateGoalWithShell({ cwd, cmd: "echo hello-from-stdout" });
		expectEq(result.achieved, true, "echo achieves");
		assert(result.reason.includes("hello-from-stdout"), `stdout captured; got: ${result.reason}`);
	}

	// 14. stderr captured even on failure
	{
		const result = await evaluateGoalWithShell({ cwd, cmd: "echo errmsg-from-stderr 1>&2; exit 2" });
		expectEq(result.achieved, false, "exit 2 not achieved");
		assert(result.reason.includes("errmsg-from-stderr"), `stderr captured; got: ${result.reason}`);
		assert(result.reason.includes("exit=2"), `exit code surfaced; got: ${result.reason}`);
	}

	// 15. timeout -> not achieved with timeout reason
	{
		const result = await evaluateGoalWithShell({ cwd, cmd: "sleep 5", timeoutMs: 500 });
		expectEq(result.achieved, false, "long-running not achieved");
		assert(/timed out/i.test(result.reason), `timeout reason; got: ${result.reason}`);
	}

	// 16. cwd respected
	{
		const result = await evaluateGoalWithShell({ cwd, cmd: "pwd" });
		expectEq(result.achieved, true, "pwd achieves");
		// macOS resolves /tmp via /private/tmp; allow either substring.
		assert(result.reason.includes(cwd) || result.reason.includes(cwd.replace(/^\/tmp/, "/private/tmp")), `cwd respected; got: ${result.reason}`);
	}

	// 17. secret redaction in stdout
	{
		const result = await evaluateGoalWithShell({ cwd, cmd: "echo 'token=<REDACTED>'" });
		assert(!result.reason.includes("<REDACTED>"), `secret must be redacted; got: ${result.reason}`);
	}
}

void shellTests().then(() => {
	console.log("pi-harness goal evaluator tests passed (17 assertions)");
});
