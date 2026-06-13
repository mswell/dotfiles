// Self-test for pi-harness KISS runtime configuration.
import { formatStatusPromptContext, getHarnessConfig, parseBooleanFlag, parseContextMode } from "./config.ts";

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

// Boolean parsing is deliberately conservative.
{
	expectEq(parseBooleanFlag(undefined, true), true, "undefined keeps true default");
	expectEq(parseBooleanFlag(undefined, false), false, "undefined keeps false default");
	expectEq(parseBooleanFlag("1", false), true, "1 enables");
	expectEq(parseBooleanFlag("yes", false), true, "yes enables");
	expectEq(parseBooleanFlag("off", true), false, "off disables");
	expectEq(parseBooleanFlag("garbage", true), true, "unknown keeps default true");
	expectEq(parseBooleanFlag("garbage", false), false, "unknown keeps default false");
}

// Context mode defaults to a short status-only injection.
{
	expectEq(parseContextMode(undefined), "status", "undefined context mode -> status");
	expectEq(parseContextMode("lean"), "lean", "lean accepted");
	expectEq(parseContextMode("full"), "lean", "full aliases lean");
	expectEq(parseContextMode("off"), "off", "off accepted");
	expectEq(parseContextMode("minimal"), "status", "minimal aliases status");
	expectEq(parseContextMode("unknown"), "status", "unknown context mode -> status");
}

// Status prompt is intentionally tiny compared with the old lean context.
{
	const prompt = formatStatusPromptContext({
		activeTitle: "A".repeat(300),
		phase: "E",
		openTasks: 4,
	});
	assert(prompt.length < 260, `status prompt stays compact; got ${prompt.length} chars`);
	assert(prompt.includes("active:"), "status prompt mentions active task");
	assert(prompt.includes("readContext"), "status prompt points to on-demand details");
}

// KISS defaults: no autonomous loops, bridges, or tracing.
{
	const cfg = getHarnessConfig({});
	expectEq(cfg.contextMode, "status", "default context is status-only");
	expectEq(cfg.traceTools, false, "tool tracing off by default");
	expectEq(cfg.autoPhaseFromTools, false, "tool-based auto phase off by default");
	expectEq(cfg.goalAutoLoop, false, "goal auto-loop off by default");
	expectEq(cfg.blueprintBridge, false, "blueprint bridge off by default");
	expectEq(cfg.blueprintAutoInit, true, "auto-init remains enabled only if bridge is explicitly enabled");
}

// Opt-ins restore old/autonomous behaviours.
{
	const cfg = getHarnessConfig({
		PI_HARNESS_CONTEXT_MODE: "lean",
		PI_HARNESS_TRACE_TOOLS: "1",
		PI_HARNESS_AUTO_PHASE_FROM_TOOLS: "true",
		PI_HARNESS_GOAL_AUTO_LOOP: "yes",
		PI_HARNESS_BLUEPRINT_BRIDGE: "on",
		PI_HARNESS_BLUEPRINT_AUTOINIT: "0",
	});
	expectEq(cfg.contextMode, "lean", "lean opt-in");
	assert(cfg.traceTools, "trace opt-in");
	assert(cfg.autoPhaseFromTools, "auto phase opt-in");
	assert(cfg.goalAutoLoop, "goal auto-loop opt-in");
	assert(cfg.blueprintBridge, "blueprint bridge opt-in");
	expectEq(cfg.blueprintAutoInit, false, "blueprint auto-init opt-out");
}

// Legacy opt-in works unless the explicit enum wins.
{
	expectEq(getHarnessConfig({ PI_HARNESS_LEAN_CONTEXT: "1" }).contextMode, "lean", "legacy lean env works");
	expectEq(getHarnessConfig({ PI_HARNESS_LEAN_CONTEXT: "1", PI_HARNESS_CONTEXT_MODE: "off" }).contextMode, "off", "explicit mode wins over legacy lean");
}

console.log("pi-harness config tests passed (34 assertions)");
