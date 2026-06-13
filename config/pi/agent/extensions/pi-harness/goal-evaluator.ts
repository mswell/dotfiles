// Goal evaluator helpers for pi-harness.
//
// Kept dependency-free (only Node built-ins) so it can be unit-tested in
// isolation without pulling @earendil-works/pi-coding-agent or typebox.

import { execFile } from "node:child_process";

export const DEFAULT_GOAL_MAX_TURNS = 10;
export const DEFAULT_GOAL_EVALUATOR_TIMEOUT_MS = 60_000;
export const MAX_GOAL_EVALUATOR_TIMEOUT_MS = 600_000;
export const GOAL_EVALUATOR_MAX_BUFFER = 256 * 1024;
export const GOAL_EVALUATOR_REASON_LIMIT = 800;

export type GoalEvaluatorMode = "model" | "shell";

export interface ParsedGoalInput {
	condition: string;
	maxTurns: number;
	maxMinutes?: number;
	evaluatorCmd?: string;
	evaluatorTimeoutMs?: number;
}

export interface GoalEvaluation {
	achieved: boolean;
	reason: string;
}

export interface ShellEvaluatorOptions {
	cwd: string;
	cmd: string;
	timeoutMs?: number;
	now?: () => number;
}

function defaultRedact(value: string): string {
	return value
		.replace(/(sk-[A-Za-z0-9_-]{12,})/g, "[REDACTED_API_KEY]")
		.replace(/(gh[pousr]_[A-Za-z0-9_]{20,})/g, "[REDACTED_GITHUB_TOKEN]")
		.replace(/(github_pat_[A-Za-z0-9_]{20,})/g, "[REDACTED_GITHUB_TOKEN]")
		.replace(/((?:api[_-]?key|token|secret|password|passwd|pwd)\s*[:=]\s*)[^\s'\"]+/gi, "$1[REDACTED]")
		.replace(/(Authorization:\s*)[^\n\r]+/gi, "$1[REDACTED]");
}

let redactImpl: (value: string) => string = defaultRedact;

/**
 * Override the redactor used by evaluateGoalWithShell. pi-harness/index.ts
 * injects its own redact() so behaviour stays in lockstep with the rest of the
 * harness; tests use the default redactor.
 */
export function setGoalEvaluatorRedactor(fn: (value: string) => string): void {
	redactImpl = fn;
}

function tailText(value: string, limit: number): string {
	const trimmed = value.replace(/\s+$/g, "");
	if (trimmed.length <= limit) return trimmed;
	return `…${trimmed.slice(trimmed.length - limit)}`;
}

function parseEvaluatorFlag(text: string): { text: string; cmd?: string } {
	// Supports: --evaluator "<cmd>", --evaluator='<cmd>', --evaluator=<bare>, --evaluator <bare-until-next-flag>
	// When the flag is present, we always return a string (even if empty) so the
	// caller can distinguish "flag absent" from "flag set to empty" and reject the latter.
	const quoted = text.match(/--evaluator(?:\s*=\s*|\s+)(["'])((?:\\.|(?!\1).)*)\1/);
	if (quoted) {
		const cmd = quoted[2].replace(/\\(["'\\])/g, "$1").trim();
		return { text: text.replace(quoted[0], " "), cmd };
	}
	const bareEq = text.match(/--evaluator=([^\s][^\s]*)/);
	if (bareEq) {
		return { text: text.replace(bareEq[0], " "), cmd: bareEq[1].trim() };
	}
	const bare = text.match(/--evaluator\s+([^-][^\s]*)/);
	if (bare) {
		return { text: text.replace(bare[0], " "), cmd: bare[1].trim() };
	}
	return { text };
}

export function parseGoalInput(input: string): ParsedGoalInput {
	let text = input.trim();
	let maxTurns = DEFAULT_GOAL_MAX_TURNS;
	let maxMinutes: number | undefined;
	let evaluatorTimeoutMs: number | undefined;
	const evaluator = parseEvaluatorFlag(text);
	text = evaluator.text;
	const evaluatorCmd = evaluator.cmd;
	text = text.replace(/--max-turns(?:=|\s+)(\d+)/gi, (_match, value) => {
		maxTurns = Math.max(1, Number(value));
		return " ";
	});
	text = text.replace(/--turns(?:=|\s+)(\d+)/gi, (_match, value) => {
		maxTurns = Math.max(1, Number(value));
		return " ";
	});
	text = text.replace(/--max-minutes(?:=|\s+)(\d+)/gi, (_match, value) => {
		maxMinutes = Math.max(1, Number(value));
		return " ";
	});
	text = text.replace(/--evaluator-timeout(?:=|\s+)(\d+)(ms|s|m)?/gi, (_match, value, unit) => {
		const raw = Number(value);
		if (!Number.isFinite(raw) || raw <= 0) return " ";
		const u = (unit || "ms").toLowerCase();
		const ms = u === "s" ? raw * 1000 : u === "m" ? raw * 60_000 : raw;
		evaluatorTimeoutMs = Math.min(MAX_GOAL_EVALUATOR_TIMEOUT_MS, Math.max(500, Math.round(ms)));
		return " ";
	});
	const condition = text.replace(/\s+/g, " ").trim();
	if (!condition) {
		throw new Error("Goal condition is required. Usage: /harness goal [--max-turns 10] [--evaluator \"npm test\"] <verifiable condition>");
	}
	if (evaluatorCmd !== undefined && evaluatorCmd === "") {
		throw new Error("--evaluator requires a non-empty shell command. Quote it if it contains spaces: --evaluator \"npm test\"");
	}
	return { condition, maxTurns, maxMinutes, evaluatorCmd, evaluatorTimeoutMs };
}

export async function evaluateGoalWithShell(opts: ShellEvaluatorOptions): Promise<GoalEvaluation> {
	const timeoutMs = Math.min(
		MAX_GOAL_EVALUATOR_TIMEOUT_MS,
		Math.max(500, opts.timeoutMs ?? DEFAULT_GOAL_EVALUATOR_TIMEOUT_MS),
	);
	const started = (opts.now ?? Date.now)();
	return await new Promise<GoalEvaluation>((resolve) => {
		execFile(
			"/bin/sh",
			["-c", opts.cmd],
			{
				cwd: opts.cwd,
				timeout: timeoutMs,
				maxBuffer: GOAL_EVALUATOR_MAX_BUFFER,
				windowsHide: true,
				killSignal: "SIGTERM",
			},
			(error, stdout, stderr) => {
				const elapsed = (opts.now ?? Date.now)() - started;
				const tailStdout = tailText(stdout ?? "", GOAL_EVALUATOR_REASON_LIMIT);
				const tailStderr = tailText(stderr ?? "", GOAL_EVALUATOR_REASON_LIMIT);
				const err = error as (NodeJS.ErrnoException & { killed?: boolean; signal?: string | null; code?: string | number | null }) | null;
				const timedOut = !!err && (err.killed === true || err.signal === "SIGTERM" || err.code === "ETIMEDOUT");
				if (timedOut) {
					resolve({
						achieved: false,
						reason: redactImpl(`Evaluator timed out after ${timeoutMs}ms. Last stderr: ${tailStderr || "<empty>"}`),
					});
					return;
				}
				const exitCode = err && typeof err.code === "number"
					? (err.code as number)
					: err
						? 1
						: 0;
				const achieved = exitCode === 0;
				const summary = [
					`Evaluator ${achieved ? "passed" : "failed"} (exit=${exitCode}, ${elapsed}ms).`,
					tailStdout ? `stdout: ${tailStdout}` : "",
					tailStderr ? `stderr: ${tailStderr}` : "",
				]
					.filter(Boolean)
					.join("\n")
					.slice(0, GOAL_EVALUATOR_REASON_LIMIT * 2);
				resolve({ achieved, reason: redactImpl(summary) });
			},
		);
	});
}
