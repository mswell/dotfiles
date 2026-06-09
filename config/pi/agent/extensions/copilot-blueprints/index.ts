import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";

const execFileAsync = promisify(execFile);

const BLUEPRINTS = ["fix-test", "implement-feature", "review-diff", "refactor-safe", "security-check", "diagnose", "docs-update", "migration", "ui-polish", "bugbounty-report"] as const;
type BlueprintName = (typeof BLUEPRINTS)[number];

interface GitSnapshot {
	isRepo: boolean;
	root?: string;
	status?: string;
	changedFiles?: string;
	diffStat?: string;
	branch?: string;
}

interface ActiveRun {
	name: BlueprintName;
	runDir: string;
	readOnly: boolean;
	requiresJudge: boolean;
	judgeRequested: boolean;
	startedAt: number;
}

interface ValidationSuggestion {
	cmd: string;
	purpose: string;
	confidence: "high" | "medium" | "low";
}

interface RunIndexEntry {
	name: BlueprintName;
	createdAt: string;
	cwd: string;
	repoRoot?: string;
	branch?: string;
	readOnly: boolean;
	requiresJudge: boolean;
	maxRepairLoops: number;
	taskPreview: string;
	runDir: string;
	validationSuggestions?: ValidationSuggestion[];
	presetPath?: string;
}

interface BlueprintPreset {
	validationCommands?: ValidationSuggestion[];
	prependValidationCommands?: ValidationSuggestion[];
	maxRepairLoops?: number;
	readOnly?: boolean;
	requiresJudge?: boolean;
}

interface ProjectBlueprintConfig {
	validationCommands?: ValidationSuggestion[];
	prependValidationCommands?: ValidationSuggestion[];
	blueprints?: Partial<Record<BlueprintName, BlueprintPreset>>;
}

const READ_ONLY_BLUEPRINTS = new Set<BlueprintName>(["review-diff", "security-check", "bugbounty-report"]);
const JUDGE_BLUEPRINTS = new Set<BlueprintName>(["implement-feature", "refactor-safe", "diagnose", "migration", "ui-polish"]);
const READ_ONLY_SHELL = /^(?:git\s+(?:status|diff|show|log|branch|rev-parse|ls-files|grep)\b|rg\b|grep\b|find\b|ls\b|cat\b|sed\b|awk\b|wc\b|head\b|tail\b|pwd\b|tree\b)/;
const EDIT_INTENT = /\b(fix|patch|edit|write|change|modify|apply|corrig[ea]?|corrigir|edita|editar|altera|alterar|implemente|implementar|aplique|conserta|consertar)\b/i;

function isBlueprintName(value: string | undefined): value is BlueprintName {
	return !!value && (BLUEPRINTS as readonly string[]).includes(value);
}

function timestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, "-");
}

function slugify(value: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return slug || "task";
}

function redact(text: string): string {
	return text
		.replace(/(sk-[A-Za-z0-9_-]{12,})/g, "[REDACTED_API_KEY]")
		.replace(/(gh[pousr]_[A-Za-z0-9_]{20,})/g, "[REDACTED_GITHUB_TOKEN]")
		.replace(/(github_pat_[A-Za-z0-9_]{20,})/g, "[REDACTED_GITHUB_TOKEN]")
		.replace(/((?:api[_-]?key|token|secret|password|passwd|pwd)\s*[:=]\s*)[^\s'\"]+/gi, "$1[REDACTED]")
		.replace(/(Authorization:\s*)[^\s'"]+/gi, "$1[REDACTED]");
}

async function runGit(cwd: string, args: string[]): Promise<string | undefined> {
	try {
		const { stdout } = await execFileAsync("git", args, { cwd, timeout: 8000, maxBuffer: 1024 * 1024 });
		return stdout.trim();
	} catch {
		return undefined;
	}
}

async function collectGitSnapshot(cwd: string): Promise<GitSnapshot> {
	const root = await runGit(cwd, ["rev-parse", "--show-toplevel"]);
	if (!root) return { isRepo: false };
	const [status, changedFiles, diffStat, branch] = await Promise.all([
		runGit(root, ["status", "--short"]),
		runGit(root, ["diff", "--name-only", "HEAD"]),
		runGit(root, ["diff", "--stat", "HEAD"]),
		runGit(root, ["branch", "--show-current"]),
	]);
	return { isRepo: true, root, status, changedFiles, diffStat, branch };
}

async function exists(file: string): Promise<boolean> {
	try {
		await fs.access(file);
		return true;
	} catch {
		return false;
	}
}

async function readJsonFile<T>(file: string): Promise<T | undefined> {
	try {
		return JSON.parse(await fs.readFile(file, "utf8")) as T;
	} catch {
		return undefined;
	}
}

async function detectPackageManager(root: string): Promise<string> {
	if (await exists(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
	if (await exists(path.join(root, "yarn.lock"))) return "yarn";
	if (await exists(path.join(root, "bun.lock")) || await exists(path.join(root, "bun.lockb"))) return "bun";
	if (await exists(path.join(root, "package-lock.json"))) return "npm";
	return "npm";
}

function scriptCommand(pm: string, script: string): string {
	if (pm === "npm") return `npm run ${script}`;
	if (pm === "yarn") return `yarn ${script}`;
	if (pm === "bun") return `bun run ${script}`;
	return `${pm} ${script}`;
}

function normalizeValidationSuggestion(value: unknown): ValidationSuggestion | undefined {
	if (!value || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;
	if (typeof record.cmd !== "string" || record.cmd.trim() === "") return undefined;
	const confidence = record.confidence === "high" || record.confidence === "medium" || record.confidence === "low" ? record.confidence : "medium";
	return {
		cmd: record.cmd.trim(),
		purpose: typeof record.purpose === "string" && record.purpose.trim() ? record.purpose.trim() : "project preset",
		confidence,
	};
}

function normalizeValidationList(value: unknown): ValidationSuggestion[] {
	if (!Array.isArray(value)) return [];
	return value.map(normalizeValidationSuggestion).filter((item): item is ValidationSuggestion => !!item);
}

function normalizePreset(value: unknown): BlueprintPreset | undefined {
	if (!value || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;
	const preset: BlueprintPreset = {
		validationCommands: normalizeValidationList(record.validationCommands),
		prependValidationCommands: normalizeValidationList(record.prependValidationCommands),
	};
	if (typeof record.maxRepairLoops === "number" && Number.isFinite(record.maxRepairLoops)) {
		preset.maxRepairLoops = Math.max(0, Math.min(5, Math.round(record.maxRepairLoops)));
	}
	if (typeof record.readOnly === "boolean") preset.readOnly = record.readOnly;
	if (typeof record.requiresJudge === "boolean") preset.requiresJudge = record.requiresJudge;
	return preset;
}

async function loadProjectConfig(root: string): Promise<{ path: string; config?: ProjectBlueprintConfig }> {
	const configPath = path.join(root, ".pi", "blueprints.json");
	const raw = await readJsonFile<Record<string, unknown>>(configPath);
	if (!raw) return { path: configPath };
	const config: ProjectBlueprintConfig = {
		validationCommands: normalizeValidationList(raw.validationCommands),
		prependValidationCommands: normalizeValidationList(raw.prependValidationCommands),
		blueprints: {},
	};
	if (raw.blueprints && typeof raw.blueprints === "object") {
		const records = raw.blueprints as Record<string, unknown>;
		for (const name of BLUEPRINTS) {
			const preset = normalizePreset(records[name]);
			if (preset) config.blueprints![name] = preset;
		}
	}
	return { path: configPath, config };
}

function mergeValidationSuggestions(detected: ValidationSuggestion[], config: ProjectBlueprintConfig | undefined, name: BlueprintName): ValidationSuggestion[] {
	const preset = config?.blueprints?.[name];
	const prepended = [...(config?.prependValidationCommands ?? []), ...(preset?.prependValidationCommands ?? [])];
	const appended = [...(config?.validationCommands ?? []), ...(preset?.validationCommands ?? [])];
	const merged: ValidationSuggestion[] = [];
	const add = (item: ValidationSuggestion) => {
		if (!merged.some((existing) => existing.cmd === item.cmd)) merged.push(item);
	};
	prepended.forEach(add);
	detected.forEach(add);
	appended.forEach(add);
	return merged.slice(0, 20);
}

async function detectValidation(root: string, name: BlueprintName, config: ProjectBlueprintConfig | undefined): Promise<ValidationSuggestion[]> {
	const suggestions: ValidationSuggestion[] = [];
	const add = (cmd: string, purpose: string, confidence: ValidationSuggestion["confidence"] = "medium") => {
		if (!suggestions.some((s) => s.cmd === cmd)) suggestions.push({ cmd, purpose, confidence });
	};

	const packageJson = await readJsonFile<{ scripts?: Record<string, string> }>(path.join(root, "package.json"));
	if (packageJson?.scripts) {
		const pm = await detectPackageManager(root);
		const scripts = packageJson.scripts;
		for (const name of ["test", "typecheck", "lint", "build", "check", "format:check"]) {
			if (scripts[name]) add(scriptCommand(pm, name), `package.json script: ${name}`, name === "test" ? "high" : "medium");
		}
		for (const name of Object.keys(scripts)) {
			if (/^(test|lint|typecheck|check):/.test(name)) add(scriptCommand(pm, name), `package.json targeted script: ${name}`, "low");
		}
	}

	if (await exists(path.join(root, "pytest.ini")) || await exists(path.join(root, "pyproject.toml")) || await exists(path.join(root, "setup.cfg"))) {
		add("pytest", "Python test suite", "medium");
	}
	if (await exists(path.join(root, "ruff.toml")) || await exists(path.join(root, "pyproject.toml"))) {
		add("ruff check .", "Python lint/static checks", "low");
	}
	if (await exists(path.join(root, "go.mod"))) {
		add("go test ./...", "Go test suite", "high");
	}
	if (await exists(path.join(root, "Cargo.toml"))) {
		add("cargo test", "Rust tests", "high");
		add("cargo clippy --all-targets --all-features", "Rust lint", "medium");
	}
	if (await exists(path.join(root, "Makefile"))) {
		add("make test", "Makefile conventional test target", "low");
	}

	return mergeValidationSuggestions(suggestions.slice(0, 12), config, name);
}

function formatValidationSuggestions(suggestions: ValidationSuggestion[]): string {
	if (suggestions.length === 0) return "(none detected; inspect project docs/scripts before choosing validation)";
	return suggestions.map((s) => `- ${s.cmd} — ${s.purpose} (${s.confidence})`).join("\n");
}

function indexPath(base: string): string {
	return path.join(base, ".pi", "runs", "index.jsonl");
}

async function readRunIndex(base: string): Promise<RunIndexEntry[]> {
	try {
		const raw = await fs.readFile(indexPath(base), "utf8");
		return raw.split(/\n+/).filter(Boolean).map((line) => JSON.parse(line) as RunIndexEntry);
	} catch {
		return [];
	}
}

async function resolveRun(base: string, query: string): Promise<RunIndexEntry | undefined> {
	const runs = await readRunIndex(base);
	if (runs.length === 0) return undefined;
	if (!query || query === "latest") return runs.at(-1);
	return [...runs].reverse().find((run) => run.runDir.includes(query) || path.basename(run.runDir).includes(query) || run.createdAt.includes(query));
}

async function writeFileSafe(file: string, content: string): Promise<void> {
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(file, content, { encoding: "utf8", mode: 0o600 });
}

async function appendFileSafe(file: string, content: string): Promise<void> {
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.appendFile(file, content, { encoding: "utf8", mode: 0o600 });
}

function isInside(child: string, parent: string): boolean {
	const rel = path.relative(path.resolve(parent), path.resolve(child));
	return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function getToolPath(input: Record<string, unknown>, cwd: string): string | undefined {
	const raw = input.path ?? input.file_path;
	if (typeof raw !== "string" || raw.trim() === "") return undefined;
	return path.resolve(cwd, raw);
}

function getAssistantText(event: any): string {
	const messages = Array.isArray(event?.messages) ? event.messages : event?.message ? [event.message] : [];
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i];
		if (msg?.role !== "assistant" || !Array.isArray(msg.content)) continue;
		return msg.content.filter((c: any) => c?.type === "text" && typeof c.text === "string").map((c: any) => c.text).join("\n");
	}
	return "";
}

function subagentInstructions(name: BlueprintName): string {
	if (name === "review-diff") {
		return `
## Subagent fan-out / judge pattern
If the subagent tool is available, use it before finalizing:
1. Spawn a read-only scout/context-builder to summarize changed files and relevant conventions.
2. Spawn a reviewer focused on concrete bugs/regressions/security risks.
3. You are the coordinator: deduplicate, verify uncertain findings with tools, drop nits/speculation, and produce one final review.

If subagents are unavailable, do the same phases yourself explicitly: Scout → Specialist review → Coordinator judge.`;
	}

	if (name === "implement-feature") {
		return `
## Subagent fan-out / judge pattern
Use specialists when practical:
1. Before editing, use scout/context-builder subagent if available to map relevant files and existing patterns.
2. After implementation and validation, use reviewer or oracle subagent if available for an adversarial final judge pass.
3. Deduplicate judge feedback, fix only concrete issues, and do not chase style nits.

If subagents are unavailable, perform explicit phases yourself: Scout → Implement → Validate → Final judge.`;
	}

	if (name === "diagnose") {
		return `
## Subagent fan-out / judge pattern
Use specialists when practical:
1. Scout/context-builder maps relevant failure paths and prior patterns.
2. Main agent builds the deterministic repro loop and tests hypotheses.
3. Reviewer/oracle performs final regression-risk judge after the fix.

If subagents are unavailable, perform explicit phases yourself: Repro loop → Hypotheses → Instrument → Fix → Regression → Judge.`;
	}

	if (name === "migration") {
		return `
## Subagent fan-out / judge pattern
Use specialists when practical:
1. Scout maps schema/API/data-touching files and existing migration conventions.
2. Main agent implements the smallest migration-safe change.
3. Reviewer/oracle checks rollback, compatibility, data safety, and deployment ordering.

If subagents are unavailable, perform explicit phases yourself: Scout → Plan migration → Implement → Validate → Deployment-risk judge.`;
	}

	if (name === "ui-polish") {
		return `
## Subagent fan-out / judge pattern
Use specialists when practical:
1. Scout/context-builder maps existing UI tokens, components, spacing, and interaction patterns.
2. Main agent implements the polish.
3. Reviewer/judge checks visual consistency, accessibility, states, and no generic AI slop.

If subagents are unavailable, perform explicit phases yourself: UI scout → Polish → Accessibility/states check → Final judge.`;
	}

	return "";
}

function blueprintSpecific(name: BlueprintName, task: string): string {
	switch (name) {
		case "fix-test":
			return `
## Blueprint: fix-test
Goal: reproduce a failing command/test, diagnose minimally, patch, and validate.

Required flow:
1. Determine the exact failing command. If the user supplied one, run it first. If not, inspect project scripts and choose the smallest relevant test command, or ask one concise question if ambiguous.
2. Capture the failure cause before editing.
3. Apply the smallest safe fix.
4. Rerun the failing command.
5. If still failing, continue only within the max repair loop limit from Hard constraints, then stop and report evidence.

User input / command / failure:
${task || "(not provided)"}`;
		case "implement-feature":
			return `
## Blueprint: implement-feature
Goal: implement a vertical slice from spec to validation.

Required flow:
1. Scout relevant files and existing patterns before editing.
2. Write a short plan with assumptions and affected files.
3. Implement the smallest vertical slice that satisfies the spec.
4. Add/update tests when the project has a test pattern.
5. Run targeted validation first, then broader validation if cheap.
6. Respect the max repair loop limit from Hard constraints if validation fails.
7. Complete a final judge pass before final response. End the final response with marker: FINAL_JUDGE_DONE

Feature spec:
${task || "(not provided — ask for a concise spec before editing)"}`;
		case "review-diff":
			return `
## Blueprint: review-diff
Goal: review current git diff like a local Cloudflare-style judge. Default is read-only.

Required flow:
1. Inspect changed files and relevant surrounding source.
2. Focus on concrete bugs, regressions, security issues, broken tests, migration risks, and confusing behavior.
3. Explicitly ignore pure style nits, formatting that linters handle, and speculative issues without evidence.
4. Deduplicate findings and classify severity: critical, warning, suggestion.
5. Do not edit unless the user explicitly asked for fixes.

Review focus:
${task || "current working tree diff"}`;
		case "refactor-safe":
			return `
## Blueprint: refactor-safe
Goal: perform a behavior-preserving refactor with tests/validation.

Required flow:
1. Identify invariants and current behavior before editing.
2. Prefer small mechanical changes over clever rewrites.
3. Preserve public APIs unless explicitly requested.
4. Run tests/lint/build relevant to the touched area.
5. Respect the max repair loop limit from Hard constraints if validation fails.
6. Complete a final judge pass before final response. End the final response with marker: FINAL_JUDGE_DONE

Refactor target:
${task || "(not provided — ask for target/module and desired outcome)"}`;
		case "diagnose":
			return `
## Blueprint: diagnose
Goal: disciplined diagnosis loop for a bug, failure, or regression.

Required flow:
1. Build a fast deterministic feedback loop first: failing test, command, curl/script, browser repro, trace replay, or minimal harness. Do not guess without a loop.
2. Reproduce the user's exact symptom and capture evidence.
3. Generate 3–5 ranked falsifiable hypotheses before testing fixes.
4. Instrument one variable at a time. Tag temporary logs with [DEBUG-<id>] and remove them before final.
5. Add a regression test at the correct seam when possible. If no correct seam exists, document why.
6. Apply the smallest fix, rerun original repro and regression validation.
7. Respect the max repair loop limit from Hard constraints.
8. Complete a final judge pass before final response. End the final response with marker: FINAL_JUDGE_DONE

Bug / symptom / failing command:
${task || "(not provided — ask for the symptom or failing command before editing)"}`;
		case "docs-update":
			return `
## Blueprint: docs-update
Goal: update documentation/instructions to match code or workflow changes.

Required flow:
1. Identify the source of truth in code/config/tests before writing docs.
2. Update the smallest relevant docs: README, docs/, AGENTS.md, .github/copilot-instructions.md, ADRs, changelog, or runbook.
3. Prefer specific commands, paths, invariants, and examples over generic advice.
4. Avoid bloating AGENTS.md/copilot instructions; keep durable agent instructions concise and operational.
5. If docs imply behavior, verify against code or commands when cheap.

Docs target:
${task || "(not provided — ask what docs/instructions need updating)"}`;
		case "migration":
			return `
## Blueprint: migration
Goal: implement or review a migration-sensitive change safely.

Required flow:
1. Identify migration type: database schema/data, API contract, dependency/runtime, file layout, config/env, or framework/tooling.
2. Scout existing migration conventions and rollback/deployment patterns.
3. Plan ordering, backward compatibility, data safety, idempotency, rollback/roll-forward, and observability.
4. Implement the smallest safe migration path.
5. Add/update tests or validation commands for both old/new behavior when practical.
6. Document operator/deployment notes if humans must run steps.
7. Complete a final migration-risk judge pass. End the final response with marker: FINAL_JUDGE_DONE

Migration target:
${task || "(not provided — ask what is being migrated and target version/state)"}`;
		case "ui-polish":
			return `
## Blueprint: ui-polish
Goal: polish an existing UI without generic AI aesthetics or accessibility regressions.

Required flow:
1. Inspect existing UI patterns/tokens/components before editing. If .interface-design memory exists or project design docs exist, use them.
2. Identify states that need coverage: loading, empty, error, disabled, success, focus/hover, responsive behavior.
3. Preserve product-specific visual language; avoid generic gradients, random cards, vague marketing copy, and inconsistent radii/shadows.
4. Implement minimal, coherent UI changes.
5. Run available UI validation/typecheck/lint/tests.
6. Check accessibility: keyboard, focus visibility, semantics, contrast, reduced motion where relevant.
7. Complete a final UI judge pass. End the final response with marker: FINAL_JUDGE_DONE

UI polish target:
${task || "(not provided — ask which screen/component and desired outcome)"}`;
		case "bugbounty-report":
			return `
## Blueprint: bugbounty-report
Goal: draft or refine a professional bug bounty report from evidence. Default is read-only and writes only inside the run directory unless explicitly asked otherwise.

Required flow:
1. Inventory available evidence: affected asset, endpoint, account roles, requests/responses, screenshots, PoC, impact.
2. Do not invent evidence. If a required proof is missing, list exactly what is missing.
3. Structure report: Summary, Asset/Scope, Vulnerability, Steps to Reproduce, Evidence, Impact, Severity rationale, Remediation, Safe harbor notes.
4. Make impact concrete and business-relevant; avoid inflated claims.
5. Keep reproduction steps crisp enough for triage to follow.
6. Save draft to ${"${runDir}"}/result.md when practical.

Report material / finding:
${task || "(not provided — ask for evidence or finding notes)"}`;
		case "security-check":
			return `
## Blueprint: security-check
Goal: security review with concrete evidence only. Default is read-only unless user asks for a patch.

Required flow:
1. Identify trust boundaries, auth/authz paths, input parsing, secrets handling, and dangerous sinks in scope.
2. Flag only exploitable or concretely dangerous issues.
3. For every finding include: evidence path/line/function, attack preconditions, exploit sketch, impact, and remediation.
4. Explicitly drop theoretical defense-in-depth notes unless they create real risk.
5. If no reportable issue exists, say so and list what was checked.

Security scope:
${task || "current changed files / project area"}`;
	}
}

function buildPrompt(name: BlueprintName, task: string, runDir: string, git: GitSnapshot, readOnly: boolean, validationSuggestions: ValidationSuggestion[], maxRepairLoops: number): string {
	const changed = git.changedFiles || "(none detected or not a git repo)";
	const status = git.status || "(clean / unavailable)";
	const diffStat = git.diffStat || "(none / unavailable)";
	const validation = formatValidationSuggestions(validationSuggestions);
	const guardrail = readOnly
		? `\n## Active read-only guardrail\nThis blueprint is running in enforced read-only mode. edit/write outside the run directory are blocked. Bash is restricted to read-only inspection commands. If fixes are needed, report them instead of applying them.`
		: "";
	return `# Pi Copilot Software-Factory Blueprint

You are executing a structured daily-work blueprint inside Pi.

## Hard constraints
- Route and think as needed through the existing /route GitHub Copilot-only router.
- Keep work inside the current project unless the user explicitly asks otherwise.
- Prefer deterministic checks (git, tests, lint, build, grep) over guessing.
- Use at most ${maxRepairLoops} autonomous repair loop(s) after a validation failure.
- Do not log secrets. Redact tokens, cookies, API keys, passwords, Authorization headers.
- Keep final output evidence-based and concise.
${guardrail}
## Run directory
Use this local run directory for lightweight observability:

\`${runDir}\`

Create/update these files when practical:
- \`${runDir}/commands.jsonl\`: one JSON object per important command: {"cmd","purpose","exitCode","summary"}
- \`${runDir}/result.md\`: final summary, changed files, validation, residual risks
- \`${runDir}/review.md\`: final self-review / judge pass for implementation blueprints

If a file might contain sensitive output, summarize/redact instead of copying raw content.

## Current git snapshot
- Repo: ${git.isRepo ? git.root : "not a git repo"}
- Branch: ${git.branch || "unknown"}

### Status short
\`\`\`
${status}
\`\`\`

### Changed files
\`\`\`
${changed}
\`\`\`

### Diff stat
\`\`\`
${diffStat}
\`\`\`

## Detected validation commands
Prefer targeted validation first. Use these as candidates, not blindly; inspect project docs if uncertain.

${validation}
${subagentInstructions(name)}
${blueprintSpecific(name, task)}

## Final response contract
End with:
1. What changed / what was reviewed
2. Commands run and validation result
3. Remaining risks or why none
4. Run directory path
`;
}

async function createRun(ctx: ExtensionContext, name: BlueprintName, task: string): Promise<{ runDir: string; prompt: string; readOnly: boolean; requiresJudge: boolean }> {
	const git = await collectGitSnapshot(ctx.cwd);
	const base = git.root ?? ctx.cwd;
	const safeTask = redact(task);
	const { path: presetPath, config: projectConfig } = await loadProjectConfig(base);
	const preset = projectConfig?.blueprints?.[name];
	const readOnly = preset?.readOnly ?? (READ_ONLY_BLUEPRINTS.has(name) && !EDIT_INTENT.test(task));
	const requiresJudge = preset?.requiresJudge ?? JUDGE_BLUEPRINTS.has(name);
	const maxRepairLoops = preset?.maxRepairLoops ?? 2;
	const validationSuggestions = await detectValidation(base, name, projectConfig);
	const runDir = path.join(base, ".pi", "runs", `${timestamp()}-${name}-${slugify(safeTask)}`);
	const prompt = buildPrompt(name, safeTask, runDir, git, readOnly, validationSuggestions, maxRepairLoops);
	await fs.mkdir(path.join(runDir, "context"), { recursive: true, mode: 0o700 });
	const meta = {
		name,
		createdAt: new Date().toISOString(),
		cwd: ctx.cwd,
		repoRoot: git.root,
		branch: git.branch,
		readOnly,
		requiresJudge,
		maxRepairLoops,
		taskPreview: safeTask.slice(0, 500),
		validationSuggestions,
		presetPath: projectConfig ? presetPath : undefined,
	};
	await writeFileSafe(path.join(runDir, "blueprint.json"), JSON.stringify(meta, null, 2) + "\n");
	await writeFileSafe(path.join(runDir, "context", "git-status.txt"), `${git.status ?? ""}\n`);
	await writeFileSafe(path.join(runDir, "context", "changed-files.txt"), `${git.changedFiles ?? ""}\n`);
	await writeFileSafe(path.join(runDir, "context", "diff-stat.txt"), `${git.diffStat ?? ""}\n`);
	await writeFileSafe(path.join(runDir, "context", "validation-suggestions.md"), `${formatValidationSuggestions(validationSuggestions)}\n`);
	await writeFileSafe(path.join(runDir, "kickoff.md"), prompt);
	await writeFileSafe(path.join(runDir, "commands.jsonl"), "");
	await appendFileSafe(indexPath(base), JSON.stringify({ ...meta, runDir }) + "\n");
	return { runDir, prompt, readOnly, requiresJudge };
}

async function projectBase(cwd: string): Promise<string> {
	const git = await collectGitSnapshot(cwd);
	return git.root ?? cwd;
}

function summarizeRun(run: RunIndexEntry, index?: number): string {
	const n = index === undefined ? "" : `${index}. `;
	const ro = run.readOnly ? " ro" : "";
	const judge = run.requiresJudge ? " judge" : "";
	const task = run.taskPreview ? ` — ${run.taskPreview.slice(0, 90)}` : "";
	return `${n}${run.createdAt} ${run.name}${ro}${judge}${task}\n   ${run.runDir}`;
}

async function readOptional(file: string, maxChars = 5000): Promise<string> {
	try {
		const text = await fs.readFile(file, "utf8");
		return text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[truncated ${text.length - maxChars} chars]` : text;
	} catch {
		return "";
	}
}

function configHelp(configPath: string): string {
	return `Project blueprint preset

Path:
  ${configPath}

Optional schema:
{
  "prependValidationCommands": [
    { "cmd": "pnpm test -- --runInBand", "purpose": "primary project test", "confidence": "high" }
  ],
  "validationCommands": [
    { "cmd": "pnpm lint", "purpose": "lint", "confidence": "medium" }
  ],
  "blueprints": {
    "implement-feature": {
      "maxRepairLoops": 2,
      "requiresJudge": true,
      "validationCommands": [
        { "cmd": "pnpm typecheck", "purpose": "type safety", "confidence": "high" }
      ]
    },
    "review-diff": {
      "readOnly": true
    }
  }
}
`;
}

async function showConfig(ctx: ExtensionContext): Promise<void> {
	const base = await projectBase(ctx.cwd);
	const { path: configPath, config } = await loadProjectConfig(base);
	if (!config) {
		ctx.ui.notify(`${configHelp(configPath)}\nNo preset file found yet.`, "info");
		return;
	}
	ctx.ui.notify(`${configHelp(configPath)}\nLoaded preset:\n${JSON.stringify(config, null, 2)}`, "info");
}

async function writeDefaultConfig(ctx: ExtensionContext): Promise<void> {
	const base = await projectBase(ctx.cwd);
	const configPath = path.join(base, ".pi", "blueprints.json");
	if (await exists(configPath)) {
		ctx.ui.notify(`Config already exists: ${configPath}`, "warning");
		return;
	}
	const sample = {
		prependValidationCommands: [],
		validationCommands: [],
		blueprints: {
			"implement-feature": {
				maxRepairLoops: 2,
				requiresJudge: true,
				validationCommands: [],
			},
			"diagnose": { maxRepairLoops: 2, requiresJudge: true },
			"migration": { maxRepairLoops: 1, requiresJudge: true },
			"ui-polish": { maxRepairLoops: 2, requiresJudge: true },
			"review-diff": { readOnly: true },
			"security-check": { readOnly: true },
			"bugbounty-report": { readOnly: true },
		},
	};
	await writeFileSafe(configPath, `${JSON.stringify(sample, null, 2)}\n`);
	ctx.ui.notify(`Wrote ${configPath}`, "info");
}

type RunStatus = "created" | "in-progress" | "reviewed" | "complete" | "failed";

async function fileExists(file: string): Promise<boolean> {
	return exists(file);
}

async function countJsonlLines(file: string): Promise<number> {
	try {
		const raw = await fs.readFile(file, "utf8");
		return raw.split(/\n+/).filter((line) => line.trim()).length;
	} catch {
		return 0;
	}
}

async function inferRunStatus(run: RunIndexEntry): Promise<{ status: RunStatus; commands: number; hasResult: boolean; hasReview: boolean }> {
	const resultPath = path.join(run.runDir, "result.md");
	const reviewPath = path.join(run.runDir, "review.md");
	const commandsPath = path.join(run.runDir, "commands.jsonl");
	const [result, review, commands] = await Promise.all([
		readOptional(resultPath, 3000),
		readOptional(reviewPath, 2000),
		countJsonlLines(commandsPath),
	]);
	const text = `${result}\n${review}`.toLowerCase();
	const hasResult = result.trim().length > 0;
	const hasReview = review.trim().length > 0;
	let status: RunStatus = "created";
	if (hasResult) status = "complete";
	if (hasReview) status = "reviewed";
	if (!hasResult && commands > 0) status = "in-progress";
	if (/\b(failed|failure|erro|falhou|failing|não passou|nao passou)\b/.test(text) && !/\b(passed|passou|success|sucesso|ok)\b/.test(text)) {
		status = "failed";
	}
	return { status, commands, hasResult, hasReview };
}

function statusIcon(status: RunStatus): string {
	switch (status) {
		case "complete": return "✓";
		case "reviewed": return "◉";
		case "in-progress": return "…";
		case "failed": return "✗";
		case "created": return "○";
	}
}

async function showDashboard(args: string, ctx: ExtensionContext): Promise<void> {
	const base = await projectBase(ctx.cwd);
	const runs = await readRunIndex(base);
	if (runs.length === 0) {
		ctx.ui.notify(`No blueprint runs found at ${indexPath(base)}`, "info");
		return;
	}
	const count = Math.max(1, Math.min(50, Number.parseInt(args.trim(), 10) || 12));
	const recent = runs.slice(-count);
	const statuses = await Promise.all(recent.map(inferRunStatus));
	const totals = new Map<string, number>();
	for (const run of runs) totals.set(run.name, (totals.get(run.name) ?? 0) + 1);
	const recentStatusCounts = new Map<RunStatus, number>();
	for (const item of statuses) recentStatusCounts.set(item.status, (recentStatusCounts.get(item.status) ?? 0) + 1);
	const byBlueprint = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name, total]) => `  ${name}: ${total}`).join("\n");
	const byStatus = [...recentStatusCounts.entries()].map(([status, total]) => `  ${statusIcon(status)} ${status}: ${total}`).join("\n") || "  (none)";
	const recentLines = recent.map((run, i) => {
		const meta = statuses[i];
		const task = run.taskPreview ? ` — ${run.taskPreview.slice(0, 70)}` : "";
		return `${statusIcon(meta.status)} ${run.createdAt} ${run.name}${run.readOnly ? " ro" : ""}${run.requiresJudge ? " judge" : ""} cmds:${meta.commands}${task}\n   ${run.runDir}`;
	}).join("\n");
	ctx.ui.notify(`Blueprint dashboard\n\nIndex: ${indexPath(base)}\nTotal runs: ${runs.length}\n\nBy blueprint:\n${byBlueprint}\n\nRecent status (${recent.length}):\n${byStatus}\n\nRecent runs:\n${recentLines}`, "info");
}

async function showRuns(args: string, ctx: ExtensionContext): Promise<void> {
	const base = await projectBase(ctx.cwd);
	const runs = await readRunIndex(base);
	if (runs.length === 0) {
		ctx.ui.notify(`No blueprint runs found at ${indexPath(base)}`, "info");
		return;
	}
	const count = Math.max(1, Math.min(30, Number.parseInt(args.trim(), 10) || 10));
	const latest = runs.slice(-count);
	ctx.ui.notify(`Latest blueprint runs (${latest.length}/${runs.length}):\n\n${latest.map((run, i) => summarizeRun(run, runs.length - latest.length + i + 1)).join("\n")}`, "info");
}

async function showRun(query: string, ctx: ExtensionContext): Promise<void> {
	const base = await projectBase(ctx.cwd);
	const run = await resolveRun(base, query.trim() || "latest");
	if (!run) {
		ctx.ui.notify(`No matching run found. Try /bp runs.`, "warning");
		return;
	}
	const [result, review, validation] = await Promise.all([
		readOptional(path.join(run.runDir, "result.md")),
		readOptional(path.join(run.runDir, "review.md")),
		readOptional(path.join(run.runDir, "context", "validation-suggestions.md"), 2000),
	]);
	const body = [
		`Blueprint run\n${summarizeRun(run)}\n`,
		validation ? `Validation suggestions:\n${validation.trim()}\n` : "",
		result ? `result.md:\n${result.trim()}\n` : "result.md: (not written yet)\n",
		review ? `review.md:\n${review.trim()}\n` : "review.md: (not written yet)\n",
	].filter(Boolean).join("\n");
	ctx.ui.notify(body, "info");
}

interface BlueprintSuggestion {
	name: BlueprintName;
	reason: string;
	confidence: number;
}

function detectBlueprintSuggestion(text: string): BlueprintSuggestion | undefined {
	const t = text.toLowerCase().trim();
	if (!t || t.startsWith("/")) return undefined;
	if (t.length < 12) return undefined;

	const has = (...patterns: RegExp[]) => patterns.some((pattern) => pattern.test(t));

	if (has(/\b(review|revis[aeã]o|revisar|revise)\b.*\b(diff|mudan[çc]as|changes?|pr)\b/, /\b(diff|mudan[çc]as|changes?)\b.*\b(review|revisar|revise)\b/)) {
		return { name: "review-diff", reason: "pedido parece revisão de diff/mudanças", confidence: 0.9 };
	}
	if (has(/\b(report|relat[oó]rio|hackerone|bugcrowd|writeup|impact narrative|steps to reproduce|severity|cvss)\b/)) {
		return { name: "bugbounty-report", reason: "pedido parece relatório de bug bounty", confidence: 0.84 };
	}
	if (has(/\b(docs?|documenta[çc][aã]o|readme|agents\.md|copilot-instructions|runbook|adr|changelog)\b/)) {
		return { name: "docs-update", reason: "pedido parece atualização de documentação", confidence: 0.82 };
	}
	if (has(/\b(security|seguran[çc]a|vulnerability|vulnerabilidade|idor|xss|ssrf|authz|rce|exploit)\b/)) {
		return { name: "security-check", reason: "pedido parece análise de segurança", confidence: 0.86 };
	}
	if (has(/\b(test(e|es)?|spec|pytest|jest|vitest|cargo test|go test)\b.*\b(fail|falh|quebr|erro|corrig)/, /\b(corrig|fix|consert)\b.*\b(test(e|es)?|spec|pytest|jest|vitest)\b/)) {
		return { name: "fix-test", reason: "pedido parece correção de teste/comando falhando", confidence: 0.88 };
	}
	if (has(/\b(diagnose|diagnosticar|debug|depurar|investigar|reproduzir|repro|regress[aã]o|stacktrace|stack trace)\b/)) {
		return { name: "diagnose", reason: "pedido parece diagnóstico/debug", confidence: 0.87 };
	}
	if (has(/\b(refactor|refator|reestrutur)\b/)) {
		return { name: "refactor-safe", reason: "pedido parece refatoração", confidence: 0.84 };
	}
	if (has(/\b(migration|migrate|migrar|migra[çc][aã]o|schema|database|banco de dados|breaking change|upgrade|atualizar depend[eê]ncia)\b/)) {
		return { name: "migration", reason: "pedido parece migração/compatibilidade", confidence: 0.85 };
	}
	if (has(/\b(ui|interface|visual|layout|css|estilo|polish|polir|acessibilidade|responsive|responsivo|tela|componente)\b/)) {
		return { name: "ui-polish", reason: "pedido parece ajuste/polimento de UI", confidence: 0.82 };
	}
	if (has(/\b(implement|implementar|implemente|criar|crie|adicionar|adicione|add|build|feature|funcionalidade|ajuste|alterar|altere)\b/)) {
		return { name: "implement-feature", reason: "pedido parece implementação/ajuste funcional", confidence: 0.82 };
	}

	return undefined;
}

function helpText(): string {
	return `Copilot blueprints

Usage:
  /blueprint <name> <task or command>
  /bp <name> <task or command>
  /bp runs [count]
  /bp run <latest|id-substring>
  /bp dashboard [count]
  /bp config
  /bp config init

Names:
  fix-test           reproduce/fix/validate a failing test or command
  implement-feature  scout/plan/implement/test a vertical slice + final judge
  review-diff        read-only review of current git diff + subagent judge pattern
  refactor-safe      behavior-preserving refactor with validation + final judge
  security-check     concrete security review, no speculative findings
  diagnose           reproduce/hypothesize/instrument/fix/regression-test a bug
  docs-update        update docs/agent instructions/runbooks from source of truth
  migration          migration-safe schema/API/dependency/config changes
  ui-polish          product UI polish with accessibility/states/final judge
  bugbounty-report   draft/refine a report from concrete evidence

Run history:
  /bp runs           list recent runs from .pi/runs/index.jsonl
  /bp run latest     show latest run result/review/validation suggestions
  /bp dashboard      show aggregate run status/dashboard
  /bp config         show project preset schema/status
  /bp config init    create .pi/blueprints.json sample

Auto-suggestion:
  When you type a normal request that looks like feature/test/refactor/review/security work, Pi asks whether to run the matching /bp flow.

Examples:
  /bp fix-test npm test -- auth.test.ts
  /bp implement-feature add export button to reports page
  /bp review-diff focus on authz and migrations
  /bp security-check changed API handlers for IDOR risk
  /bp diagnose reproduce flaky checkout failure
  /bp docs-update update AGENTS.md after test framework migration
  /bp migration migrate users table to uuid primary keys
  /bp ui-polish polish empty/error states on dashboard
  /bp bugbounty-report draft report from notes in evidence.md`;
}

async function handleBlueprint(pi: ExtensionAPI, args: string, ctx: ExtensionContext, setActiveRun: (run: ActiveRun) => void): Promise<void> {
	const trimmed = args.trim();
	if (!trimmed || trimmed === "help") {
		ctx.ui.notify(helpText(), "info");
		return;
	}

	if (trimmed === "list") {
		ctx.ui.notify(BLUEPRINTS.join("\n"), "info");
		return;
	}

	const [commandRaw, ...commandRest] = trimmed.split(/\s+/);
	if (commandRaw === "runs") {
		await showRuns(commandRest.join(" "), ctx);
		return;
	}
	if (commandRaw === "dashboard" || commandRaw === "dash" || commandRaw === "status") {
		await showDashboard(commandRest.join(" "), ctx);
		return;
	}
	if (commandRaw === "config") {
		if (commandRest[0] === "init") await writeDefaultConfig(ctx);
		else await showConfig(ctx);
		return;
	}
	if (commandRaw === "run" || commandRaw === "show") {
		await showRun(commandRest.join(" "), ctx);
		return;
	}

	const [nameRaw, ...rest] = [commandRaw, ...commandRest];
	if (!isBlueprintName(nameRaw)) {
		ctx.ui.notify(`Unknown blueprint "${nameRaw}". Use /blueprint list.`, "error");
		return;
	}

	if (!ctx.isIdle()) {
		ctx.ui.notify("Agent is busy. Run the blueprint when Pi is idle.", "warning");
		return;
	}

	const task = rest.join(" ").trim();
	const { runDir, prompt, readOnly, requiresJudge } = await createRun(ctx, nameRaw, task);
	const run: ActiveRun = { name: nameRaw, runDir, readOnly, requiresJudge, judgeRequested: false, startedAt: Date.now() };
	setActiveRun(run);
	pi.appendEntry("copilot-blueprint-active", run);
	ctx.ui.notify(`Blueprint ${nameRaw} created: ${runDir}${readOnly ? " (read-only)" : ""}`, "info");
	pi.sendUserMessage(prompt);
}

export default function copilotBlueprints(pi: ExtensionAPI) {
	let activeRun: ActiveRun | undefined;

	function setActiveRun(run: ActiveRun | undefined): void {
		activeRun = run;
	}

	function updateStatus(ctx: ExtensionContext): void {
		if (!activeRun) {
			ctx.ui.setStatus("copilot-blueprint", undefined);
			return;
		}
		const mode = activeRun.readOnly ? "ro" : activeRun.requiresJudge ? "judge" : "run";
		ctx.ui.setStatus("copilot-blueprint", ctx.ui.theme.fg(activeRun.readOnly ? "warning" : "accent", `bp:${activeRun.name}:${mode}`));
	}

	const completions = (prefix: string) => {
		const parts = prefix.trimStart().split(/\s+/);
		if (parts.length <= 1) {
			return ["help", "list", "runs", "run", "dashboard", "config", ...BLUEPRINTS].filter((item) => item.startsWith(parts[0] ?? "")).map((value) => ({ value, label: value }));
		}
		return null;
	};

	pi.registerCommand("blueprint", {
		description: "Run a Copilot software-factory blueprint (fix-test, implement-feature, review-diff, refactor-safe, security-check)",
		getArgumentCompletions: completions,
		handler: async (args, ctx) => handleBlueprint(pi, args, ctx, (run) => {
			setActiveRun(run);
			updateStatus(ctx);
		}),
	});

	pi.registerCommand("bp", {
		description: "Alias for /blueprint",
		getArgumentCompletions: completions,
		handler: async (args, ctx) => handleBlueprint(pi, args, ctx, (run) => {
			setActiveRun(run);
			updateStatus(ctx);
		}),
	});

	pi.on("input", async (event, ctx) => {
		if (event.source === "extension") return { action: "continue" };
		if (event.streamingBehavior) return { action: "continue" };
		if (!ctx.hasUI || !ctx.isIdle()) return { action: "continue" };
		if (event.images && event.images.length > 0) return { action: "continue" };

		const suggestion = detectBlueprintSuggestion(event.text);
		if (!suggestion) return { action: "continue" };

		const ok = await ctx.ui.confirm(
			"Copilot Blueprint",
			`Isso parece caso para /bp ${suggestion.name}.\nMotivo: ${suggestion.reason}.\n\nExecutar blueprint em vez de prompt normal?`,
		);
		if (!ok) return { action: "continue" };

		await handleBlueprint(pi, `${suggestion.name} ${event.text}`, ctx, (run) => {
			setActiveRun(run);
			updateStatus(ctx);
		});
		return { action: "handled" };
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!activeRun?.readOnly) return;

		if (event.toolName === "edit") {
			const target = getToolPath(event.input as Record<string, unknown>, ctx.cwd);
			if (!target || !isInside(target, activeRun.runDir)) {
				return { block: true, reason: `Blueprint ${activeRun.name} is read-only. edit is allowed only inside run dir: ${activeRun.runDir}` };
			}
		}

		if (event.toolName === "write") {
			const target = getToolPath(event.input as Record<string, unknown>, ctx.cwd);
			if (!target || !isInside(target, activeRun.runDir)) {
				return { block: true, reason: `Blueprint ${activeRun.name} is read-only. write is allowed only inside run dir: ${activeRun.runDir}` };
			}
		}

		if (event.toolName === "bash") {
			const command = String((event.input as Record<string, unknown>).command ?? "").trim();
			if (!READ_ONLY_SHELL.test(command)) {
				return { block: true, reason: `Blueprint ${activeRun.name} is read-only. Bash command is not in the read-only allowlist: ${command}` };
			}
		}
	});

	pi.on("agent_end", async (event: any, ctx) => {
		if (!activeRun) return;
		updateStatus(ctx);

		const text = getAssistantText(event);
		if (activeRun.requiresJudge && !activeRun.judgeRequested && !text.includes("FINAL_JUDGE_DONE")) {
			activeRun = { ...activeRun, judgeRequested: true };
			pi.appendEntry("copilot-blueprint-judge-requested", activeRun);
			pi.sendMessage({
				customType: "copilot-blueprint-final-judge",
				content: `Final judge pass required for blueprint ${activeRun.name}.

Run a concise adversarial self-review now. If subagent reviewer/oracle is available, use it; otherwise do the judge pass yourself.

Check:
- Did the implementation satisfy the original request?
- Are there concrete bugs, regressions, security issues, or missing validations?
- Were commands/tests actually run? If not, say why.
- Fix only concrete required issues; do not chase style nits.
- Update ${activeRun.runDir}/review.md and ${activeRun.runDir}/result.md if practical.

End your final response with: FINAL_JUDGE_DONE`,
				display: true,
			}, { triggerTurn: true });
			return;
		}

		activeRun = undefined;
		ctx.ui.setStatus("copilot-blueprint", undefined);
	});

	pi.on("session_start", async (_event, ctx) => {
		activeRun = undefined;
		updateStatus(ctx);
	});
}
