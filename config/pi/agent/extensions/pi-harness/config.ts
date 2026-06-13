// Runtime configuration for pi-harness.
//
// Kept dependency-free and pure so KISS defaults are testable without loading Pi.

export type HarnessContextMode = "off" | "status" | "lean";

export interface HarnessRuntimeConfig {
	/** How much project context pi-harness injects before each agent turn. */
	contextMode: HarnessContextMode;
	/** Append every non-harness tool call/result to trace files. */
	traceTools: boolean;
	/** Infer PREVC phase from generic execution tools such as bash/edit/write. */
	autoPhaseFromTools: boolean;
	/** After /harness goal, evaluate and send follow-up prompts automatically. */
	goalAutoLoop: boolean;
	/** Consume copilot-blueprints handoff/final-judge markers automatically. */
	blueprintBridge: boolean;
	/** When blueprintBridge is enabled, allow a handoff to create .pi/harness. */
	blueprintAutoInit: boolean;
}

const TRUE_VALUES = new Set(["1", "true", "yes", "y", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "n", "off"]);

function envValue(env: NodeJS.ProcessEnv, key: string): string | undefined {
	const value = env[key];
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
	if (value === undefined) return defaultValue;
	const normalized = value.trim().toLowerCase();
	if (TRUE_VALUES.has(normalized)) return true;
	if (FALSE_VALUES.has(normalized)) return false;
	return defaultValue;
}

export function parseContextMode(value: string | undefined): HarnessContextMode {
	const normalized = value?.trim().toLowerCase();
	if (normalized === "off" || normalized === "none" || normalized === "0") return "off";
	if (normalized === "lean" || normalized === "full" || normalized === "1") return "lean";
	if (normalized === "status" || normalized === "compact" || normalized === "minimal") return "status";
	return "status";
}

export interface HarnessPromptStatus {
	activeTitle?: string;
	phase?: string;
	openTasks: number;
}

export function formatStatusPromptContext(status: HarnessPromptStatus): string {
	const title = status.activeTitle?.trim();
	const active = title
		? `active: ${title.slice(0, 120)}${title.length > 120 ? "…" : ""}${status.phase ? ` [${status.phase}]` : ""}`
		: "active: none";
	return `pi-harness: ${active}; ${status.openTasks} open task(s). Use harness({ action: \"readContext\" }) only when durable details are needed.`;
}

export function getHarnessConfig(env: NodeJS.ProcessEnv = process.env): HarnessRuntimeConfig {
	// Back-compat convenience: PI_HARNESS_LEAN_CONTEXT=1 restores the old default
	// without requiring users to learn the newer mode enum.
	const explicitContextMode = envValue(env, "PI_HARNESS_CONTEXT_MODE");
	const legacyLean = parseBooleanFlag(envValue(env, "PI_HARNESS_LEAN_CONTEXT"), false);
	const contextMode = explicitContextMode ? parseContextMode(explicitContextMode) : legacyLean ? "lean" : "status";

	return {
		contextMode,
		traceTools: parseBooleanFlag(envValue(env, "PI_HARNESS_TRACE_TOOLS"), false),
		autoPhaseFromTools: parseBooleanFlag(envValue(env, "PI_HARNESS_AUTO_PHASE_FROM_TOOLS"), false),
		goalAutoLoop: parseBooleanFlag(envValue(env, "PI_HARNESS_GOAL_AUTO_LOOP"), false),
		blueprintBridge: parseBooleanFlag(envValue(env, "PI_HARNESS_BLUEPRINT_BRIDGE"), false),
		blueprintAutoInit: parseBooleanFlag(envValue(env, "PI_HARNESS_BLUEPRINT_AUTOINIT"), true),
	};
}
