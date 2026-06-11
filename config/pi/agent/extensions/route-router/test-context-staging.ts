import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	DEFAULT_CONTEXT_STAGE_THRESHOLD_CHARS,
	SHARED_CONTEXT_ARTIFACTS,
	sanitizeSharedContext,
	shouldStageSharedContext,
	stageSharedContext,
} from "./context-staging";

function assert(condition: unknown, message: string): void {
	if (!condition) throw new Error(message);
}

const secretContext = `diff --git a/file.ts b/file.ts
+const token = "ghp_abcdefghijklmnopqrstuvwxyz123456";
+const password = "hunter2";
+fetch("/api", { headers: { Authorization: "Bearer sk-abcdefghijklmnopqrstuvwxyz" } });
`;

const sanitized = sanitizeSharedContext(secretContext, 10_000);
assert(sanitized.redacted, "sanitizeSharedContext should report redaction when secrets are removed");
assert(!sanitized.content.includes("ghp_"), "GitHub token must be redacted");
assert(!sanitized.content.includes("hunter2"), "password must be redacted");
assert(!sanitized.content.includes("sk-abcdefghijklmnopqrstuvwxyz"), "API key must be redacted");
assert(sanitized.content.includes("diff --git"), "staging redaction should preserve useful diff context");

assert(!shouldStageSharedContext("small", DEFAULT_CONTEXT_STAGE_THRESHOLD_CHARS), "small context should not require staging");
assert(shouldStageSharedContext("x".repeat(DEFAULT_CONTEXT_STAGE_THRESHOLD_CHARS + 1), DEFAULT_CONTEXT_STAGE_THRESHOLD_CHARS), "large context should require staging");
assert(SHARED_CONTEXT_ARTIFACTS.includes("shared-context.md"), "shared-context.md must be allowed");
assert(SHARED_CONTEXT_ARTIFACTS.includes("diff-summary.md"), "diff-summary.md must be allowed");
assert(SHARED_CONTEXT_ARTIFACTS.includes("validation-output.md"), "validation-output.md must be allowed");

async function main(): Promise<void> {
	const temp = await fs.mkdtemp(path.join(os.tmpdir(), "route-context-stage-"));
	const large = `${secretContext}\n${"large context line\n".repeat(400)}`;
	const staged = await stageSharedContext({
		artifactName: "shared-context.md",
		content: large,
		runDir: temp,
		thresholdChars: 200,
		maxChars: 2_000,
		title: "Shared Context token=titleSecret",
		summary: "Contains token=supersecret but should be redacted",
	});
	assert(staged.staged, "large context should be staged to disk when runDir exists");
	assert(staged.path === path.join(temp, "shared-context.md"), "staged path should be inside run dir with allowed artifact name");
	assert(staged.inlineContent === undefined, "staged large context should return path + metadata, not inline content");
	assert(staged.truncated, "large context should be capped by maxChars");
	assert(staged.redacted, "staged metadata should report redaction");
	assert(staged.estimatedTokens > 0, "metadata should include estimated tokens");
	const written = await fs.readFile(staged.path!, "utf8");
	assert(written.includes("# Shared Context"), "staged markdown should include title");
	assert(!written.includes("titleSecret"), "title secrets should be redacted before writing");
	assert(written.includes("## Metadata"), "staged markdown should include metadata");
	assert(written.includes("## Content"), "staged markdown should include content section");
	assert(!written.includes("supersecret"), "summary secrets should be redacted before writing");
	assert(!written.includes("ghp_"), "written context must not contain raw GitHub token");
	assert(!written.includes("hunter2"), "written context must not contain raw password");

	const small = await stageSharedContext({ artifactName: "diff-summary.md", content: "short diff summary", runDir: temp, thresholdChars: 1_000 });
	assert(!small.staged && small.reason === "below-threshold", "small context should stay inline below threshold");
	assert(small.inlineContent?.includes("short diff summary"), "small redacted context can be returned inline");

	const missingRunDir = await stageSharedContext({ artifactName: "validation-output.md", content: "x".repeat(500), thresholdChars: 100 });
	assert(!missingRunDir.staged && missingRunDir.reason === "missing-run-dir", "large context without run dir should no-op with metadata");
	assert(missingRunDir.inlineContent === undefined, "missing run dir should not return large inline content");

	let threw = false;
	try {
		await stageSharedContext({ artifactName: "../bad.md" as any, content: "bad", runDir: temp, force: true });
	} catch {
		threw = true;
	}
	assert(threw, "unsafe artifact names must be rejected");

	console.log("route-router context staging fixtures passed");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
