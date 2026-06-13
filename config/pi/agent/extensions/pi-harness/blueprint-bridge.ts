// Entry-side bridge parser: pi-harness consumes copilot-blueprints handoffs.
// (Track B/C). Dependency-free + pure so it can be unit-tested in isolation.
// The runtime hook lives in index.ts which imports these helpers.

export interface BlueprintHandoff {
	source: "copilot-blueprints";
	version: 1;
	runId: string;
	runDir: string;
	blueprint: string;
	mission: string;
	phase: "E";
	contract: string;
	createdAt: string;
	consumed: boolean;
}

const MAX_HANDOFF_AGE_MS = 10 * 60 * 1000; // 10 minutes

export function parseHandoff(raw: string): BlueprintHandoff | undefined {
	let obj: unknown;
	try {
		obj = JSON.parse(raw);
	} catch {
		return undefined;
	}
	if (!obj || typeof obj !== "object") return undefined;
	const h = obj as Record<string, unknown>;
	if (h.source !== "copilot-blueprints") return undefined;
	if (h.version !== 1) return undefined;
	if (typeof h.runId !== "string" || typeof h.blueprint !== "string") return undefined;
	if (typeof h.contract !== "string" || typeof h.createdAt !== "string") return undefined;
	if (h.phase !== "E") return undefined;
	return {
		source: "copilot-blueprints",
		version: 1,
		runId: h.runId,
		runDir: typeof h.runDir === "string" ? h.runDir : "",
		blueprint: h.blueprint,
		mission: typeof h.mission === "string" ? h.mission : "",
		phase: "E",
		contract: h.contract,
		createdAt: h.createdAt,
		consumed: h.consumed === true,
	};
}

/**
 * Decide whether a handoff should be consumed now.
 * - not already consumed
 * - not already processed in this process (lastConsumedRunId)
 * - fresh (within MAX_HANDOFF_AGE_MS of nowMs)
 */
export function shouldConsumeHandoff(
	handoff: BlueprintHandoff,
	lastConsumedRunId: string | undefined,
	nowMs: number,
	maxAgeMs: number = MAX_HANDOFF_AGE_MS,
): boolean {
	if (handoff.consumed) return false;
	if (handoff.runId === lastConsumedRunId) return false;
	const createdMs = Date.parse(handoff.createdAt);
	if (Number.isNaN(createdMs)) return false;
	if (nowMs - createdMs > maxAgeMs) return false;
	if (createdMs - nowMs > 60_000) return false; // reject clearly future-dated markers
	return true;
}

export { MAX_HANDOFF_AGE_MS };

/**
 * Decide whether to proceed with consuming a handoff given harness presence and
 * the auto-init opt-out. Pure + testable.
 * - harness already exists -> always proceed
 * - harness missing + auto-init enabled -> proceed (will create .pi/harness)
 * - harness missing + auto-init disabled -> skip
 */
export function shouldProceedWithHandoff(harnessExisted: boolean, autoInitDisabled: boolean): boolean {
	if (harnessExisted) return true;
	return !autoInitDisabled;
}
