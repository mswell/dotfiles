import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { implementFeatureBlueprint } from "./blueprint";
import {
	blueprintNodeEndTelemetryEvent,
	blueprintNodeStartTelemetryEvent,
	createTelemetryRecorder,
	normalizeTelemetryEvent,
	redactTelemetryString,
	resolveTelemetryRunDir,
	routeApplyTelemetryEvent,
	routeDecisionTelemetryEvent,
	routeFallbackSkipTelemetryEvent,
} from "./telemetry";
import type { RouteDecision } from "./types";

function assert(condition: unknown, message: string): void {
	if (!condition) throw new Error(message);
}

const secretText = "Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz123456 token=supersecret password=hunter2 cookie=sessionid=abc api_key=sk-abcdefghijklmnopqrstuvwxyz";
const redacted = redactTelemetryString(secretText);
assert(!redacted.includes("ghp_"), "GitHub token must be redacted");
assert(!redacted.includes("hunter2"), "password value must be redacted");
assert(!redacted.includes("sessionid=abc"), "cookie value must be redacted");
assert(!redacted.includes("sk-abcdefghijklmnopqrstuvwxyz"), "API key must be redacted");
assert(redacted.includes("[REDACTED"), "redacted string should mark redaction");

assert(resolveTelemetryRunDir({ PI_RUN_DIR: "/tmp/pi-run" } as NodeJS.ProcessEnv) === "/tmp/pi-run", "PI_RUN_DIR should be detected");
assert(resolveTelemetryRunDir({} as NodeJS.ProcessEnv) === undefined, "missing run dir should safely disable telemetry");
assert(!createTelemetryRecorder({}).enabled, "recorder without run dir must be disabled/no-op");

const decision: RouteDecision = {
	active: true,
	apply: true,
	mode: "dev",
	effectiveMode: "dev",
	targetRole: "copilotScout",
	targetProvider: "github-copilot",
	thinking: "medium",
	riskTier: "lite",
	confidence: 0.92,
	signals: ["summarization"],
	reason: `large context scout ${secretText}`,
	resolvedModel: "gemini-3.5-flash",
	appliedModel: "github-copilot/gemini-3.5-flash",
	appliedThinking: "medium",
	applied: true,
	applyNote: `Applied model after ${secretText}`,
};

const decisionEvent = routeDecisionTelemetryEvent(decision, 87_000);
assert(decisionEvent.event === "route.decision", "decision event name mismatch");
assert(decisionEvent.mode === "dev", "decision event mode mismatch");
assert(decisionEvent.riskTier === "lite", "decision event risk tier mismatch");
assert(decisionEvent.targetRole === "copilotScout", "decision event target role mismatch");
assert(decisionEvent.contextTokens === 87_000, "decision event context tokens mismatch");
assert(!JSON.stringify(decisionEvent).includes("ghp_"), "decision event must redact secrets");

const applyEvent = routeApplyTelemetryEvent(decision, 87_000);
assert(applyEvent.event === "route.apply", "apply event name mismatch");
assert(applyEvent.model === "github-copilot/gemini-3.5-flash", "apply event model mismatch");
assert(applyEvent.safeInputTokens === 160_000, "apply event should include Copilot-safe input budget");
assert(applyEvent.applied === true, "apply event applied mismatch");
assert(!JSON.stringify(applyEvent).includes("supersecret"), "apply event must redact secrets");

const fallbackEvent = routeFallbackSkipTelemetryEvent({
	mode: "dev",
	riskTier: "lite",
	targetRole: "copilotScout",
	provider: "github-copilot",
	modelId: "gemini-3.5-flash",
	contextTokens: 180_000,
	reason: "context",
});
assert(fallbackEvent.event === "route.fallback.skip", "fallback event name mismatch");
assert(fallbackEvent.applied === false, "fallback skip is not applied");
assert(fallbackEvent.safeInputTokens === 160_000, "fallback event should include safe input tokens");

const scout = implementFeatureBlueprint.nodes[0];
const startEvent = blueprintNodeStartTelemetryEvent(scout);
const endEvent = blueprintNodeEndTelemetryEvent(scout, 0);
assert(startEvent.event === "blueprint.node.start" && startEvent.node === "Scout" && startEvent.kind === "agentic", "blueprint start event mismatch");
assert(endEvent.event === "blueprint.node.end" && endEvent.exitCode === 0, "blueprint end event mismatch");

const normalized = normalizeTelemetryEvent({ event: "route.apply", reason: secretText, contextTokens: Number.NaN });
assert(normalized.contextTokens === undefined, "non-finite numbers must be dropped");
assert(!JSON.stringify(normalized).includes("Bearer ghp_"), "normalized events must redact secrets");

async function main(): Promise<void> {
	const temp = await fs.mkdtemp(path.join(os.tmpdir(), "route-telemetry-"));
	const recorder = createTelemetryRecorder({ runDir: temp });
	assert(recorder.enabled && recorder.filePath?.endsWith("route-router-events.jsonl"), "recorder with run dir should be enabled");
	await recorder.record(decisionEvent);
	await recorder.record(applyEvent);
	await recorder.record(fallbackEvent);
	const lines = (await fs.readFile(recorder.filePath!, "utf8")).trim().split("\n");
	assert(lines.length === 3, "telemetry file should contain one JSON object per line");
	for (const line of lines) {
		const parsed = JSON.parse(line) as Record<string, unknown>;
		assert(typeof parsed.event === "string", "JSONL line must have event");
		assert(typeof parsed.timestamp === "string", "JSONL line must have timestamp");
		assert(!line.includes("Authorization: Bearer"), "JSONL line must not contain raw Authorization header");
	}

	console.log("route-router telemetry fixtures passed");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
