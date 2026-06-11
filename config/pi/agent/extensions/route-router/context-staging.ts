import * as fs from "node:fs/promises";
import * as path from "node:path";
import { redactTelemetryString, resolveTelemetryRunDir } from "./telemetry";

export const SHARED_CONTEXT_ARTIFACTS = ["shared-context.md", "diff-summary.md", "validation-output.md"] as const;
export type SharedContextArtifactName = (typeof SHARED_CONTEXT_ARTIFACTS)[number];

export interface StageSharedContextInput {
	artifactName: SharedContextArtifactName;
	content: string;
	runDir?: string;
	thresholdChars?: number;
	maxChars?: number;
	title?: string;
	summary?: string;
	force?: boolean;
}

export interface StagedContextMetadata {
	artifactName: SharedContextArtifactName;
	path?: string;
	staged: boolean;
	reason: "staged" | "below-threshold" | "missing-run-dir" | "write-failed";
	originalChars: number;
	stagedChars: number;
	estimatedTokens: number;
	thresholdChars: number;
	maxChars: number;
	truncated: boolean;
	redacted: boolean;
	summary?: string;
}

export interface StagedContextResult extends StagedContextMetadata {
	// Redacted short content is returned only when the artifact stays below the
	// staging threshold. Large context returns path + metadata only.
	inlineContent?: string;
}

export const DEFAULT_CONTEXT_STAGE_THRESHOLD_CHARS = 8_000;
export const DEFAULT_CONTEXT_STAGE_MAX_CHARS = 60_000;

const ALLOWED_ARTIFACTS = new Set<string>(SHARED_CONTEXT_ARTIFACTS);

export async function stageSharedContext(input: StageSharedContextInput): Promise<StagedContextResult> {
	validateArtifactName(input.artifactName);
	const thresholdChars = positiveInt(input.thresholdChars, DEFAULT_CONTEXT_STAGE_THRESHOLD_CHARS);
	const maxChars = positiveInt(input.maxChars, DEFAULT_CONTEXT_STAGE_MAX_CHARS);
	const originalChars = input.content.length;
	const sanitized = sanitizeSharedContext(input.content, maxChars);
	const body = formatStagedMarkdown({
		artifactName: input.artifactName,
		title: input.title,
		summary: input.summary,
		content: sanitized.content,
		originalChars,
		truncated: sanitized.truncated,
	});
	const baseMetadata = metadata({
		artifactName: input.artifactName,
		originalChars,
		stagedChars: body.length,
		thresholdChars,
		maxChars,
		truncated: sanitized.truncated,
		redacted: sanitized.redacted,
		summary: input.summary,
	});

	if (!input.force && body.length <= thresholdChars) {
		return {
			...baseMetadata,
			staged: false,
			reason: "below-threshold",
			inlineContent: body,
		};
	}

	const runDir = input.runDir ?? resolveTelemetryRunDir();
	if (!runDir) {
		return {
			...baseMetadata,
			staged: false,
			reason: "missing-run-dir",
		};
	}

	const artifactPath = path.join(runDir, input.artifactName);
	try {
		await fs.mkdir(path.dirname(artifactPath), { recursive: true });
		await fs.writeFile(artifactPath, body, "utf8");
		return {
			...baseMetadata,
			path: artifactPath,
			staged: true,
			reason: "staged",
		};
	} catch {
		return {
			...baseMetadata,
			path: artifactPath,
			staged: false,
			reason: "write-failed",
		};
	}
}

export function shouldStageSharedContext(content: string, thresholdChars = DEFAULT_CONTEXT_STAGE_THRESHOLD_CHARS): boolean {
	return content.length > positiveInt(thresholdChars, DEFAULT_CONTEXT_STAGE_THRESHOLD_CHARS);
}

export function sanitizeSharedContext(content: string, maxChars = DEFAULT_CONTEXT_STAGE_MAX_CHARS): { content: string; redacted: boolean; truncated: boolean } {
	const redacted = redactSharedContextString(content);
	const truncated = redacted.length > maxChars;
	const safeContent = truncated ? `${redacted.slice(0, Math.max(0, maxChars))}\n\n[truncated: staged context exceeded ${maxChars} chars after redaction]\n` : redacted;
	return {
		content: safeContent,
		redacted: redacted !== content,
		truncated,
	};
}

function redactSharedContextString(value: string): string {
	let redacted = value;
	redacted = redacted.replace(/\bAuthorization\s*:\s*[^\s,;]+(?:\s+[^\s,;]+)?/gi, "Authorization: [REDACTED]");
	redacted = redacted.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]");
	redacted = redacted.replace(/\b(cookie|set-cookie)\s*[:=]\s*[^\n;]+(?:;\s*[^\n;]+)*/gi, "$1=[REDACTED]");
	redacted = redacted.replace(/\b(api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|token|password|passwd|pwd|secret)\b\s*[:=]\s*[\"']?[^\s,;\"']+/gi, "$1=[REDACTED]");
	redacted = redacted.replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}/g, "[REDACTED_GITHUB_TOKEN]");
	redacted = redacted.replace(/\bsk-[A-Za-z0-9_-]{20,}/g, "[REDACTED_API_KEY]");
	redacted = redacted.replace(/[A-Za-z0-9+/]{32,}={0,2}/g, "[REDACTED_SECRET]");
	return redacted;
}

function validateArtifactName(artifactName: SharedContextArtifactName): void {
	if (!ALLOWED_ARTIFACTS.has(artifactName)) {
		throw new Error(`Unsupported shared context artifact: ${artifactName}`);
	}
	if (artifactName.includes("/") || artifactName.includes("\\") || artifactName.includes("..")) {
		throw new Error(`Unsafe shared context artifact path: ${artifactName}`);
	}
}

function formatStagedMarkdown(input: {
	artifactName: SharedContextArtifactName;
	title?: string;
	summary?: string;
	content: string;
	originalChars: number;
	truncated: boolean;
}): string {
	const safeTitle = input.title ? redactTelemetryString(input.title, 160) : input.artifactName;
	const lines = [
		`# ${safeTitle}`,
		"",
		"Generated by route-router shared context staging. Pass this file path to agents/reviewers instead of duplicating large context.",
		"",
		"## Metadata",
		`- artifact: ${input.artifactName}`,
		`- originalChars: ${input.originalChars}`,
		`- truncated: ${input.truncated}`,
	];
	if (input.summary) lines.push(`- summary: ${redactTelemetryString(input.summary, 480)}`);
	lines.push("", "## Content", "", input.content, "");
	return lines.join("\n");
}

function metadata(input: {
	artifactName: SharedContextArtifactName;
	originalChars: number;
	stagedChars: number;
	thresholdChars: number;
	maxChars: number;
	truncated: boolean;
	redacted: boolean;
	summary?: string;
}): Omit<StagedContextMetadata, "path" | "staged" | "reason"> {
	return {
		artifactName: input.artifactName,
		originalChars: input.originalChars,
		stagedChars: input.stagedChars,
		estimatedTokens: Math.ceil(input.stagedChars / 4),
		thresholdChars: input.thresholdChars,
		maxChars: input.maxChars,
		truncated: input.truncated,
		redacted: input.redacted,
		summary: input.summary ? redactTelemetryString(input.summary, 480) : undefined,
	};
}

function positiveInt(value: number | undefined, fallback: number): number {
	if (!Number.isFinite(value) || !value || value <= 0) return fallback;
	return Math.round(value);
}
