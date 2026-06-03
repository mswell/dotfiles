import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const VERSION = "0.4.3";
const HARNESS_DIR = path.join(".pi", "harness");
const EVENTS_FILE = "events.jsonl";
const SUMMARY_FILE = "summary.md";
const TRACE_RECENT_LIMIT = 25;
const DEFAULT_GOAL_MAX_TURNS = 10;
const GOAL_CONVERSATION_ENTRY_LIMIT = 80;
const WIDGET_MODE: "off" | "compact" = "off";
const LEAN_CONTEXT_LIMIT = 4500;
const PHASES = ["P", "R", "E", "V", "C"] as const;
const MEMORY_TYPES = ["facts", "preferences", "patterns", "mistakes", "playbooks", "glossary"] as const;
type MemoryType = (typeof MEMORY_TYPES)[number];
const MEMORY_DIR = "memory";
let turnStartCleanupHookInstalled = false;
const activeGoalEvaluations = new Set<string>();
const HARNESS_STATUS_WIDGET = "pi-harness";
const HARNESS_COMMAND_OUTPUT_WIDGET = "pi-harness-command-output";
const PHASE_LABELS: Record<Phase, string> = {
	P: "Planning",
	R: "Review",
	E: "Execution",
	V: "Validation",
	C: "Confirmation",
};

type Phase = (typeof PHASES)[number];

type HarnessStatus = "active" | "paused" | "done";
type GoalStatus = "active" | "achieved" | "cleared" | "budget-limited" | "error";

interface GoalState {
	condition: string;
	status: GoalStatus;
	createdAt: string;
	updatedAt: string;
	turns: number;
	maxTurns: number;
	maxMinutes?: number;
	lastEvaluatorReason?: string;
	lastEvaluationAt?: string;
	achievedAt?: string;
	clearedAt?: string;
	error?: string;
}

interface HarnessIndex {
	version: string;
	createdAt: string;
	updatedAt: string;
	activeTaskId?: string;
	tasks: Array<{
		id: string;
		slug: string;
		title: string;
		phase: Phase;
		status: HarnessStatus;
		createdAt: string;
		updatedAt: string;
	}>;
}

interface TaskState {
	id: string;
	slug: string;
	title: string;
	phase: Phase;
	status: HarnessStatus;
	createdAt: string;
	updatedAt: string;
}

const HarnessParams = Type.Object({
	action: Type.Union([
		Type.Literal("status"),
		Type.Literal("tasks"),
		Type.Literal("init"),
		Type.Literal("startTask"),
		Type.Literal("setPhase"),
		Type.Literal("advancePhase"),
		Type.Literal("completeTask"),
		Type.Literal("closeTask"),
		Type.Literal("recordDecision"),
		Type.Literal("recordEvidence"),
		Type.Literal("recordCheck"),
		Type.Literal("recordNote"),
		Type.Literal("appendIdea"),
		Type.Literal("readContext"),
		Type.Literal("writeProjectContext"),
		Type.Literal("writePolicy"),
		Type.Literal("updateContract"),
		Type.Literal("updatePlan"),
		Type.Literal("recordContract"),
		Type.Literal("recordPlan"),
		Type.Literal("setGoal"),
		Type.Literal("goalStatus"),
		Type.Literal("clearGoal"),
		Type.Literal("achieveGoal"),
		Type.Literal("summary"),
		Type.Literal("rebuildSummary"),
		Type.Literal("report"),
		Type.Literal("remember"),
		Type.Literal("recall"),
		Type.Literal("forget"),
		Type.Literal("reflect"),
		Type.Literal("reflectAi"),
		Type.Literal("memoryCandidates"),
		Type.Literal("memoryAudit"),
		Type.Literal("memoryDedupe"),
		Type.Literal("improveReport"),
	], { description: "Harness action to run." }),
	title: Type.Optional(Type.String({ description: "Task title for startTask." })),
	text: Type.Optional(Type.String({ description: "Text for decisions, evidence, checks, notes, ideas, project context, policy, contract, plan, report note, or memory content. For remember: 'type: content'. For recall: optional type filter. For forget: 'type: content substring'." })),
	command: Type.Optional(Type.String({ description: "Command or check name for recordCheck." })),
	exitCode: Type.Optional(Type.Number({ description: "Process exit code for recordCheck." })),
	passed: Type.Optional(Type.Boolean({ description: "Whether recordCheck passed." })),
	phase: Type.Optional(Type.Union(PHASES.map((p) => Type.Literal(p)) as any, { description: "PREVC phase: P, R, E, V, C." })),
});

type HarnessParamsType = Static<typeof HarnessParams>;

function now(): string {
	return new Date().toISOString();
}

async function exists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function findUp(start: string, marker: string): Promise<string | undefined> {
	let current = path.resolve(start);
	while (true) {
		if (await exists(path.join(current, marker))) return current;
		const parent = path.dirname(current);
		if (parent === current) return undefined;
		current = parent;
	}
}

async function resolveProjectRoot(cwd: string): Promise<string> {
	const existingHarness = await findUp(cwd, path.join(HARNESS_DIR, "index.json"));
	if (existingHarness) return existingHarness;
	const gitRoot = await findUp(cwd, ".git");
	return gitRoot ?? path.resolve(cwd);
}

function harnessPath(root: string): string {
	return path.join(root, HARNESS_DIR);
}

function taskDir(root: string, task: { id: string; slug: string }): string {
	return path.join(harnessPath(root), "tasks", `${task.id}-${task.slug}`);
}

function goalPath(root: string, task: { id: string; slug: string }): string {
	return path.join(taskDir(root, task), "goal.json");
}

async function readText(filePath: string): Promise<string> {
	try {
		return await fs.readFile(filePath, "utf8");
	} catch {
		return "";
	}
}

async function writeText(filePath: string, content: string): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

async function appendText(filePath: string, content: string): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.appendFile(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

async function recentLines(filePath: string, limit: number): Promise<string[]> {
	const content = await readText(filePath);
	if (!content.trim()) return [];
	return content.trimEnd().split("\n").slice(-limit);
}

async function readJson<T>(filePath: string): Promise<T | undefined> {
	try {
		return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
	} catch {
		return undefined;
	}
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
	await writeText(filePath, JSON.stringify(value, null, 2));
}

function slugify(value: string): string {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60) || "task";
}

function shortId(): string {
	return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

function defaultIndex(): HarnessIndex {
	const ts = now();
	return { version: VERSION, createdAt: ts, updatedAt: ts, tasks: [] };
}

async function loadIndex(root: string): Promise<HarnessIndex> {
	return (await readJson<HarnessIndex>(path.join(harnessPath(root), "index.json"))) ?? defaultIndex();
}

async function saveIndex(root: string, index: HarnessIndex): Promise<void> {
	index.updatedAt = now();
	await writeJson(path.join(harnessPath(root), "index.json"), index);
}

async function ensureHarness(root: string): Promise<HarnessIndex> {
	const dir = harnessPath(root);
	await fs.mkdir(path.join(dir, "tasks"), { recursive: true });
	await fs.mkdir(path.join(dir, "archive"), { recursive: true });
	const indexPath = path.join(dir, "index.json");
	let index = await readJson<HarnessIndex>(indexPath);
	if (!index) {
		index = defaultIndex();
		await saveIndex(root, index);
	}
	if (!(await exists(path.join(dir, "project.md")))) {
		await writeText(path.join(dir, "project.md"), "# Project Context\n\nAdd stable project facts, architecture notes, commands, and constraints here.\n");
	}
	if (!(await exists(path.join(dir, "policies.md")))) {
		await writeText(path.join(dir, "policies.md"), "# Harness Policies\n\n- Do not store API keys, tokens, passwords, cookies, or authentication material in harness files.\n- For non-trivial changes, keep an active task and record validation evidence before final response.\n- Prefer small, auditable changes with clear rollback points.\n");
	}
	if (!(await exists(path.join(dir, "decisions.md")))) {
		await writeText(path.join(dir, "decisions.md"), "# Decisions\n\nDurable project decisions recorded by pi-harness.\n");
	}
	return index;
}

async function getActiveTask(root: string): Promise<TaskState | undefined> {
	const index = await loadIndex(root);
	const summary = index.tasks.find((task) => task.id === index.activeTaskId);
	if (!summary) return undefined;
	const statePath = path.join(taskDir(root, summary), "state.json");
	return (await readJson<TaskState>(statePath)) ?? summary;
}

async function saveTask(root: string, task: TaskState): Promise<void> {
	const dir = taskDir(root, task);
	await fs.mkdir(dir, { recursive: true });
	await writeJson(path.join(dir, "state.json"), task);
	const index = await loadIndex(root);
	const summary = {
		id: task.id,
		slug: task.slug,
		title: task.title,
		phase: task.phase,
		status: task.status,
		createdAt: task.createdAt,
		updatedAt: task.updatedAt,
	};
	const existing = index.tasks.findIndex((item) => item.id === task.id);
	if (existing >= 0) index.tasks[existing] = summary;
	else index.tasks.unshift(summary);
	if (task.status === "done") {
		if (index.activeTaskId === task.id) delete index.activeTaskId;
	} else {
		index.activeTaskId = task.id;
	}
	await saveIndex(root, index);
}

async function startTask(root: string, title: string): Promise<TaskState> {
	await ensureHarness(root);
	const ts = now();
	const task: TaskState = {
		id: shortId(),
		slug: slugify(title),
		title,
		phase: "P",
		status: "active",
		createdAt: ts,
		updatedAt: ts,
	};
	await saveTask(root, task);
	const dir = taskDir(root, task);
	await writeText(path.join(dir, "contract.md"), `# Task Contract: ${title}\n\n## Goal\n\n## Scope\n\n## Non-goals\n\n## Constraints\n\n## Done Criteria\n`);
	await writeText(path.join(dir, "plan.md"), `# Plan: ${title}\n\n- [ ] Planning\n- [ ] Review\n- [ ] Execution\n- [ ] Validation\n- [ ] Confirmation\n`);
	await writeText(path.join(dir, "evidence.md"), `# Evidence: ${title}\n`);
	await writeText(path.join(dir, "journal.md"), `# Journal: ${title}\n\nOperational notes, handoffs, and lessons that are not decisions or validation evidence.\n`);
	await writeText(path.join(dir, "ideas.md"), `# Ideas: ${title}\n\nPromising follow-up ideas/backlog items.\n`);
	await appendTrace(root, { type: "task_start", taskId: task.id, title });
	return task;
}

async function setPhase(root: string, phase: Phase): Promise<TaskState> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	task.phase = phase;
	task.updatedAt = now();
	await saveTask(root, task);
	await appendTrace(root, { type: "phase", taskId: task.id, phase });
	return task;
}

async function advancePhase(root: string): Promise<TaskState> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	const current = PHASES.indexOf(task.phase);
	const next = PHASES[Math.min(current + 1, PHASES.length - 1)];
	task.phase = next;
	task.updatedAt = now();
	await saveTask(root, task);
	await appendTrace(root, { type: "phase_advance", taskId: task.id, phase: next });
	return task;
}

async function completeTask(root: string, note?: string): Promise<{ task: TaskState; reflectionHint: string }> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	return await completeTaskState(root, task, note);
}

async function findTask(root: string, selector: string): Promise<TaskState | undefined> {
	const index = await loadIndex(root);
	const normalized = selector.trim().toLowerCase();
	const summary = index.tasks.find((task) =>
		task.id === normalized ||
		`${task.id}-${task.slug}` === normalized ||
		task.slug === normalized ||
		task.title.toLowerCase() === normalized ||
		task.id.startsWith(normalized),
	);
	if (!summary) return undefined;
	const statePath = path.join(taskDir(root, summary), "state.json");
	return (await readJson<TaskState>(statePath)) ?? summary;
}

async function completeTaskState(root: string, task: TaskState, note?: string): Promise<{ task: TaskState; reflectionHint: string }> {
	if (note) {
		await appendText(path.join(taskDir(root, task), "evidence.md"), `\n## ${now()}\n\n${note}\n`);
	}
	// Auto-reflect: generate memory candidates before closing
	let reflectionHint = "";
	try {
		const dir = taskDir(root, task);
		const evidence = await readText(path.join(dir, "evidence.md"));
		const journal = await readText(path.join(dir, "journal.md"));
		const allText = `${evidence}\n${journal}`;
		const candidates: string[] = [];
		for (const line of allText.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			if (/lesson|learned|pattern|mistake|always|never|prefer|important|gotcha|workaround|tip|note.*:|caveat|watch out|remember/i.test(trimmed)) {
				candidates.push(`  - ${trimmed.replace(/^[-*]\s*/, "")}`);
			}
		}
		if (candidates.length) {
			reflectionHint = [
				"",
				"💡 Memory candidates from this task:",
				...candidates.slice(0, 10),
				"",
				"To persist one, choose a valid type and run for example:",
				"  /harness remember mistakes: <reusable lesson to avoid repeating>",
				"  /harness remember playbooks: <repeatable procedure>",
				`Valid types: ${MEMORY_TYPES.join(", ")}`,
				"For AI-assisted curation before closing future tasks, run: /harness reflect-ai",
			].join("\n");
		}
	} catch { /* non-critical */ }
	task.phase = "C";
	task.status = "done";
	task.updatedAt = now();
	await appendTrace(root, { type: "task_done", taskId: task.id, title: task.title });
	await saveTask(root, task);
	return { task, reflectionHint };
}

async function closeTask(root: string, text?: string): Promise<{ task: TaskState; reflectionHint: string }> {
	const [selector, ...noteParts] = (text ?? "").trim().split(/\s+/);
	if (!selector) throw new Error("Task id/title is required. Use /harness tasks to list tasks.");
	const task = await findTask(root, selector);
	if (!task) throw new Error(`Task not found: ${selector}`);
	return await completeTaskState(root, task, noteParts.join(" ").trim() || undefined);
}

async function appendEvent(root: string, event: Record<string, unknown>): Promise<void> {
	await appendText(path.join(harnessPath(root), EVENTS_FILE), JSON.stringify({ ts: now(), ...event }));
}

async function appendTrace(root: string, event: Record<string, unknown>): Promise<void> {
	await appendEvent(root, event);
	let task: TaskState | undefined;
	if (typeof event.taskId === "string") task = await findTask(root, event.taskId);
	if (!task) task = await getActiveTask(root);
	if (!task && event.type !== "task_start") return;
	const traceTask = task ?? { id: String(event.taskId), slug: slugify(String(event.title ?? "task")) };
	await appendText(path.join(taskDir(root, traceTask), "trace.jsonl"), JSON.stringify({ ts: now(), ...event }));
}

function redact(value: string): string {
	return value
		.replace(/(api[_-]?key|token|password|passwd|secret|authorization|cookie)=([^\s]+)/gi, "$1=<redacted>")
		.replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer <redacted>")
		.slice(0, 500);
}

function summarizeToolInput(toolName: string, input: unknown): Record<string, unknown> {
	const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
	if (toolName === "bash" && typeof data.command === "string") return { command: redact(data.command) };
	if (typeof data.path === "string") return { path: data.path };
	if (typeof data.command === "string") return { command: redact(data.command) };
	return {};
}

function shellCommandFromInput(input: unknown): string | undefined {
	const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
	return typeof data.command === "string" ? data.command : undefined;
}

function isLikelyMutatingShellCommand(command: string): boolean {
	return [
		/(^|[;&|\n]\s*)(cp|mv|mkdir|touch|ln|tee|truncate)\b/i,
		/(^|[;&|\n]\s*)(sed\s+-i|perl\s+-pi)\b/i,
		/(^|\s)(>|>>)\s*\S+/i,
		/\bgit\s+(add|commit|rm|clean|reset|restore|checkout|switch|rebase|merge|stash|tag|push)\b/i,
		/\b(npm|pnpm|yarn)\s+(install|i|ci|add|remove|rm|uninstall|unlink|publish)\b/i,
		/\b(npm|pnpm|yarn)\s+(run\s+)?build\b/i,
		/\b(vite|rollup|webpack|next)\s+build\b/i,
		/(^|[;&|\n]\s*)tsc\b(?![^;&|\n]*\s--noEmit\b)/i,
	].some((pattern) => pattern.test(command));
}

function mutatingToolReason(toolName: string, input: unknown): string | undefined {
	if (toolName === "edit" || toolName === "write") return `${toolName} modifies files`;
	if (toolName === "bash") {
		const command = shellCommandFromInput(input);
		if (command && isLikelyMutatingShellCommand(command)) return `bash appears mutating: ${redact(command)}`;
	}
	return undefined;
}

async function recordPhaseActionNotice(root: string, toolName: string, input: unknown): Promise<void> {
	const task = await getActiveTask(root);
	if (!task || task.status !== "active" || task.phase === "E") return;
	const reason = mutatingToolReason(toolName, input);
	if (!reason) return;
	const note = `Phase notice: mutating action during ${task.phase} (${PHASE_LABELS[task.phase]}): ${reason}. Treat this as execution work; validate before claiming done.`;
	await appendText(path.join(taskDir(root, task), "journal.md"), `\n## ${now()}\n\n${note}\n`);
	await appendTrace(root, { type: "phase_action_notice", taskId: task.id, phase: task.phase, toolName, reason });
}

async function autoInferPhase(root: string, inferredPhase: Phase): Promise<void> {
	const task = await getActiveTask(root);
	if (!task || task.status !== "active") return;
	// Only advance forward, never regress
	const currentIdx = PHASES.indexOf(task.phase);
	const inferredIdx = PHASES.indexOf(inferredPhase);
	if (inferredIdx > currentIdx) {
		task.phase = inferredPhase;
		task.updatedAt = now();
		await saveTask(root, task);
		await appendTrace(root, { type: "phase_auto_infer", taskId: task.id, phase: inferredPhase });
	}
}

async function recordDecision(root: string, text: string): Promise<void> {
	await ensureHarness(root);
	await appendText(path.join(harnessPath(root), "decisions.md"), `\n## ${now()}\n\n${text}\n`);
	await appendTrace(root, { type: "decision", text: redact(text) });
	// Auto-promote to memory/facts
	try {
		const factsPath = memoryFilePath(root, "facts");
		if (!(await exists(factsPath))) await writeText(factsPath, "# Memory: facts\n");
		await appendText(factsPath, `- [decision ${now().slice(0, 10)}] ${text.split("\n")[0].slice(0, 200)}\n`);
	} catch { /* non-critical */ }
	// Auto-infer phase → R (decisions happen during Review)
	await autoInferPhase(root, "R");
}

async function recordEvidence(root: string, text: string): Promise<void> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	await appendText(path.join(taskDir(root, task), "evidence.md"), `\n## ${now()}\n\n${text}\n`);
	await appendTrace(root, { type: "evidence", text: redact(text) });
	await autoInferPhase(root, "V");
}

async function recordCheck(root: string, check: { command?: string; exitCode?: number; passed?: boolean; text?: string }): Promise<void> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	const passed = typeof check.passed === "boolean"
		? check.passed
		: typeof check.exitCode === "number"
			? check.exitCode === 0
			: undefined;
	const status = passed === undefined ? "UNKNOWN" : passed ? "PASS" : "FAIL";
	const lines = [
		`\n## ${now()}`,
		`Check: ${status}`,
	];
	if (check.command?.trim()) lines.push(`Command: \`${redact(check.command.trim())}\``);
	if (typeof check.exitCode === "number") lines.push(`Exit code: ${check.exitCode}`);
	if (check.text?.trim()) lines.push("", check.text.trim());
	await appendText(path.join(taskDir(root, task), "evidence.md"), `${lines.join("\n")}\n`);
	await appendTrace(root, {
		type: "check",
		taskId: task.id,
		status,
		command: check.command ? redact(check.command) : undefined,
		exitCode: check.exitCode,
	});
	await autoInferPhase(root, "V");
}

async function recordNote(root: string, text: string): Promise<void> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	await appendText(path.join(taskDir(root, task), "journal.md"), `\n## ${now()}\n\n${text}\n`);
	await appendTrace(root, { type: "note", text: redact(text) });
}

async function appendIdea(root: string, text: string): Promise<void> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	const idea = text.trim().startsWith("-") ? text.trim() : `- ${text.trim()}`;
	await appendText(path.join(taskDir(root, task), "ideas.md"), idea);
	await appendTrace(root, { type: "idea", text: redact(text) });
}

function parseGoalInput(input: string): { condition: string; maxTurns: number; maxMinutes?: number } {
	let text = input.trim();
	let maxTurns = DEFAULT_GOAL_MAX_TURNS;
	let maxMinutes: number | undefined;
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
	const condition = text.replace(/\s+/g, " ").trim();
	if (!condition) throw new Error("Goal condition is required. Usage: /harness goal [--max-turns 10] <verifiable condition>");
	return { condition, maxTurns, maxMinutes };
}

async function readGoal(root: string, task?: TaskState): Promise<GoalState | undefined> {
	const active = task ?? await getActiveTask(root);
	if (!active) return undefined;
	return await readJson<GoalState>(goalPath(root, active));
}

async function writeGoal(root: string, task: TaskState, goal: GoalState): Promise<void> {
	goal.updatedAt = now();
	await writeJson(goalPath(root, task), goal);
}

async function setGoal(root: string, text: string): Promise<GoalState> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	const parsed = parseGoalInput(text);
	const ts = now();
	const goal: GoalState = {
		condition: parsed.condition,
		status: "active",
		createdAt: ts,
		updatedAt: ts,
		turns: 0,
		maxTurns: parsed.maxTurns,
		maxMinutes: parsed.maxMinutes,
	};
	await writeGoal(root, task, goal);
	await appendTrace(root, { type: "goal_set", taskId: task.id, maxTurns: goal.maxTurns, maxMinutes: goal.maxMinutes, condition: redact(goal.condition) });
	return goal;
}

async function clearGoal(root: string): Promise<GoalState> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	const goal = await readGoal(root, task);
	if (!goal) throw new Error("No goal found for active task.");
	goal.status = "cleared";
	goal.clearedAt = now();
	await writeGoal(root, task, goal);
	await appendTrace(root, { type: "goal_clear", taskId: task.id });
	return goal;
}

async function achieveGoal(root: string, evidence?: string): Promise<GoalState> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	const goal = await readGoal(root, task);
	if (!goal) throw new Error("No goal found for active task.");
	goal.status = "achieved";
	goal.achievedAt = now();
	goal.lastEvaluatorReason = evidence?.trim() || goal.lastEvaluatorReason || "Marked achieved.";
	await writeGoal(root, task, goal);
	await appendText(path.join(taskDir(root, task), "evidence.md"), `\n## ${now()}\n\nGoal achieved: ${goal.condition}\n\nEvidence: ${goal.lastEvaluatorReason}\n`);
	await appendTrace(root, { type: "goal_achieved", taskId: task.id, evidence: redact(goal.lastEvaluatorReason) });
	return goal;
}

function formatGoal(goal: GoalState | undefined): string {
	if (!goal) return "No goal found for the active task.";
	const lines = [
		`Goal status: ${goal.status}`,
		`Condition: ${goal.condition}`,
		`Turns: ${goal.turns}/${goal.maxTurns}`,
		`Created: ${goal.createdAt}`,
	];
	if (goal.maxMinutes) lines.push(`Max minutes: ${goal.maxMinutes}`);
	if (goal.lastEvaluationAt) lines.push(`Last evaluation: ${goal.lastEvaluationAt}`);
	if (goal.lastEvaluatorReason) lines.push(`Reason: ${goal.lastEvaluatorReason}`);
	if (goal.achievedAt) lines.push(`Achieved: ${goal.achievedAt}`);
	if (goal.clearedAt) lines.push(`Cleared: ${goal.clearedAt}`);
	if (goal.error) lines.push(`Error: ${goal.error}`);
	return lines.join("\n");
}

function truncate(value: string, max = 4000): string {
	return value.length <= max ? value : `${value.slice(0, max)}\n\n[truncated ${value.length - max} chars]`;
}

async function recentTraceSection(root: string, task?: TaskState): Promise<string> {
	const tracePath = task
		? path.join(taskDir(root, task), "trace.jsonl")
		: path.join(harnessPath(root), EVENTS_FILE);
	const lines = await recentLines(tracePath, TRACE_RECENT_LIMIT);
	if (!lines.length) return "";
	return [`# Recent Harness Trace (last ${lines.length})`, ...lines].join("\n");
}

async function buildContext(root: string): Promise<string> {
	const index = await loadIndex(root);
	const active = await getActiveTask(root);
	const dir = harnessPath(root);
	const project = truncate(await readText(path.join(dir, "project.md")), 2500);
	const policies = truncate(await readText(path.join(dir, "policies.md")), 2000);
	const decisions = truncate(await readText(path.join(dir, "decisions.md")), 2500);
	const persistedSummary = truncate(await readText(path.join(dir, SUMMARY_FILE)), 2500);
	let taskFiles = "";
	if (active) {
		const dir = taskDir(root, active);
		const goal = await readGoal(root, active);
		taskFiles = [
			`# Active Task\n- ${active.title}\n- Phase: ${active.phase} (${PHASE_LABELS[active.phase]})\n- Status: ${active.status}`,
			truncate(await readText(path.join(dir, "contract.md")), 2000),
			truncate(await readText(path.join(dir, "plan.md")), 2000),
			goal ? `# Active Task Goal\n${formatGoal(goal)}` : "",
			truncate(await readText(path.join(dir, "evidence.md")), 2000),
			truncate(await readText(path.join(dir, "journal.md")), 1600),
			truncate(await readText(path.join(dir, "ideas.md")), 1200),
			truncate(await recentTraceSection(root, active), 2500),
		].filter(Boolean).join("\n\n");
	}
	return [
		`pi-harness v${VERSION}`,
		`Root: ${root}`,
		`Tasks: ${index.tasks.length}`,
		persistedSummary,
		project,
		policies,
		decisions,
		taskFiles,
	].filter(Boolean).join("\n\n---\n\n");
}

async function buildLeanContext(root: string): Promise<string> {
	const index = await loadIndex(root);
	const active = await getActiveTask(root);
	const dir = harnessPath(root);
	const openTasks = index.tasks.filter((task) => task.status !== "done");
	const lines = [
		`pi-harness v${VERSION}`,
		`Root: ${root}`,
		`Tasks: ${index.tasks.length} total, ${openTasks.length} open`,
		active ? `Active task: ${active.title} [${active.phase} ${PHASE_LABELS[active.phase]}]` : "Active task: none",
	];

	const persistedSummary = (await readText(path.join(dir, SUMMARY_FILE))).trim();
	if (persistedSummary) {
		lines.push("", "## Harness Summary", truncate(persistedSummary, 1600));
	} else {
		lines.push("", "## Project Context", truncate(await readText(path.join(dir, "project.md")), 1000));
	}

	if (active) {
		const activeDir = taskDir(root, active);
		const goal = await readGoal(root, active);
		lines.push(
			"",
			"## Active Task Snapshot",
			truncate(await readText(path.join(activeDir, "contract.md")), 700),
			truncate(await readText(path.join(activeDir, "plan.md")), 700),
			goal ? `### Goal\n${formatGoal(goal)}` : "",
			"### Latest Evidence",
			truncate((await recentLines(path.join(activeDir, "evidence.md"), 12)).join("\n"), 500),
			"### Latest Journal",
			truncate((await recentLines(path.join(activeDir, "journal.md"), 10)).join("\n"), 450),
		);
	}

	const recentDecisions = (await recentLines(path.join(dir, "decisions.md"), 20)).join("\n").trim();
	if (recentDecisions) lines.push("", "## Recent Decisions", truncate(recentDecisions, 800));

	const leanMemory = await buildLeanMemory(root);
	if (leanMemory) lines.push("", leanMemory);

	lines.push("", "Full harness context is available on demand with harness({ action: \"readContext\" }).");
	return truncate(lines.filter(Boolean).join("\n"), LEAN_CONTEXT_LIMIT);
}

async function buildStatus(root: string): Promise<string> {
	if (!(await exists(path.join(harnessPath(root), "index.json")))) {
		return `pi-harness is not initialized in ${root}. Run /harness init or call harness({ action: "init" }).`;
	}
	const index = await loadIndex(root);
	const active = await getActiveTask(root);
	const openTasks = index.tasks.filter((task) => task.status !== "done");
	const doneTasks = index.tasks.length - openTasks.length;
	const lines = [`pi-harness v${VERSION}`, `Root: ${root}`, `Open tasks: ${openTasks.length}${doneTasks ? ` (done: ${doneTasks})` : ""}`];
	if (active) {
		lines.push(`Active task: ${active.title} [${active.phase} ${PHASE_LABELS[active.phase]}]`);
		const goal = await readGoal(root, active);
		if (goal) lines.push(`Goal: ${goal.status} (${goal.turns}/${goal.maxTurns}) ${goal.condition}`);
	} else lines.push("Active task: none");
	lines.push("", "Use /harness tasks to list open tasks or /harness tasks all to include done tasks.");
	return lines.join("\n");
}

async function buildCompactStatus(root: string): Promise<string> {
	if (!(await exists(path.join(harnessPath(root), "index.json")))) return "harness:off";
	const index = await loadIndex(root);
	const active = await getActiveTask(root);
	const openTasks = index.tasks.filter((task) => task.status !== "done");
	if (!active) return `harness:on · ${openTasks.length} open · no active task`;
	const goal = await readGoal(root, active);
	const goalPrefix = goal?.status === "active" ? `goal:${goal.turns}/${goal.maxTurns} · ` : "";
	return `harness:on · ${goalPrefix}${active.phase} · ${active.title.slice(0, 48)}${active.title.length > 48 ? "…" : ""}`;
}

async function refreshHarnessUi(ctx: ExtensionContext, root: string): Promise<void> {
	const status = await buildCompactStatus(root);
	ctx.ui.setStatus(HARNESS_STATUS_WIDGET, status);
	if (WIDGET_MODE === "compact") ctx.ui.setWidget(HARNESS_STATUS_WIDGET, [status]);
	else ctx.ui.setWidget(HARNESS_STATUS_WIDGET, undefined);
}

function clearHarnessCommandOutput(ctx: ExtensionContext): void {
	ctx.ui.setWidget(HARNESS_COMMAND_OUTPUT_WIDGET, undefined);
}

function taskDisplayId(task: { id: string; slug: string }): string {
	return `${task.id}-${task.slug}`;
}

function clipLine(value: string, width: number): string {
	if (width <= 0) return "";
	return value.length <= width ? value : `${value.slice(0, Math.max(0, width - 1))}…`;
}

function wrapPlainLine(value: string, width: number): string[] {
	if (width <= 0) return [""];
	if (!value) return [""];
	const lines: string[] = [];
	let rest = value;
	while (rest.length > width) {
		lines.push(rest.slice(0, width));
		rest = rest.slice(width);
	}
	lines.push(rest);
	return lines;
}

function wrapPlainText(value: string, width: number): string[] {
	return value.split("\n").flatMap((line) => wrapPlainLine(line, width));
}

type StyleFn = (text: string) => string;

function padPanelLine(value: string, width: number): string {
	return clipLine(value, width).padEnd(Math.max(0, width), " ");
}

function panelTop(title: string, width: number): string {
	const inner = Math.max(0, width - 2);
	const label = title ? ` ${title} ` : "";
	const rest = Math.max(0, inner - label.length);
	return `╭${clipLine(label, inner)}${"─".repeat(rest)}╮`;
}

function panelMid(width: number): string {
	return `├${"─".repeat(Math.max(0, width - 2))}┤`;
}

function panelBottom(width: number): string {
	return `╰${"─".repeat(Math.max(0, width - 2))}╯`;
}

function panelBody(value: string, width: number): string {
	return `│${padPanelLine(value, Math.max(0, width - 2))}│`;
}

class HarnessOutputViewerComponent {
	private offset = 0;
	constructor(
		private readonly title: string,
		private readonly content: string,
		private readonly done: () => void,
		private readonly panel: StyleFn,
		private readonly header: StyleFn,
		private readonly border: StyleFn,
		private readonly dim: StyleFn,
	) {}

	handleInput(data: string): void {
		if (data === "\x1b" || data === "q") return this.done();
		if (data === "\x1b[A" || data === "k") this.offset = Math.max(0, this.offset - 1);
		else if (data === "\x1b[B" || data === "j") this.offset += 1;
		else if (data === "\x1b[5~") this.offset = Math.max(0, this.offset - 12);
		else if (data === "\x1b[6~" || data === " ") this.offset += 12;
		else if (data === "\x1b[H") this.offset = 0;
		else if (data === "\x1b[F") this.offset = Number.MAX_SAFE_INTEGER;
	}

	render(width: number): string[] {
		const innerWidth = Math.max(20, width - 4);
		const lines = wrapPlainText(this.content, innerWidth);
		const viewport = 24;
		const maxOffset = Math.max(0, lines.length - viewport);
		this.offset = Math.max(0, Math.min(this.offset, maxOffset));
		const title = `${this.title} · ${lines.length} lines · ${this.offset + 1}-${Math.min(lines.length, this.offset + viewport)}`;
		const help = "↑↓/j/k scroll · PgUp/PgDn/space page · Home/End · q/Esc close";
		const rendered: string[] = [];
		rendered.push(this.header(panelTop(title, width)));
		rendered.push(this.header(panelBody(` ${help}`, width)));
		rendered.push(this.border(panelMid(width)));
		for (const line of lines.slice(this.offset, this.offset + viewport)) {
			rendered.push(this.panel(panelBody(` ${line}`, width)));
		}
		while (rendered.length < viewport + 3) rendered.push(this.panel(panelBody("", width)));
		rendered.push(this.border(panelMid(width)));
		rendered.push(this.dim(panelBody(` ${lines.length ? this.offset + 1 : 0}/${lines.length} · q/Esc close`, width)));
		rendered.push(this.border(panelBottom(width)));
		return rendered;
	}

	invalidate(): void {}
}

async function showOutputViewer(ctx: ExtensionContext, title: string, content: string): Promise<void> {
	await ctx.ui.custom<void>((tui, theme, _keybindings, done) => {
		const panel = (s: string) => theme.bg("customMessageBg", theme.fg("text", s));
		const header = (s: string) => theme.bg("selectedBg", theme.fg("accent", s));
		const border = (s: string) => theme.bg("customMessageBg", theme.fg("borderAccent", s));
		const dim = (s: string) => theme.bg("customMessageBg", theme.fg("dim", s));
		const viewer = new HarnessOutputViewerComponent(title, content, done, panel, header, border, dim);
		return {
			render: (width: number) => viewer.render(width),
			handleInput: (data: string) => {
				viewer.handleInput(data);
				tui.requestRender();
			},
			invalidate: () => viewer.invalidate(),
		};
	}, { overlay: true, overlayOptions: { width: "94%", maxHeight: "88%", anchor: "center", margin: 1 } });
}

function shouldUseOutputViewer(cmd: string, output: string): boolean {
	const lines = output.split("\n");
	return ["reflect-ai", "reflect", "report", "summary", "context", "improve-report"].includes(cmd) || lines.length > 40 || output.length > 6000;
}

class TaskBrowserComponent {
	private selected = 0;
	private query = "";
	private readonly pageSize = 14;
	constructor(
		private readonly tasks: HarnessIndex["tasks"],
		private readonly activeTaskId: string | undefined,
		private readonly includeDone: boolean,
		private readonly done: (command: string | null) => void,
		private readonly panel: StyleFn,
		private readonly header: StyleFn,
		private readonly border: StyleFn,
		private readonly dim: StyleFn,
		private readonly selectedStyle: StyleFn,
	) {}

	private filtered(): HarnessIndex["tasks"] {
		const q = this.query.trim().toLowerCase();
		const base = this.includeDone ? this.tasks : this.tasks.filter((task) => task.status !== "done");
		if (!q) return base;
		return base.filter((task) =>
			task.title.toLowerCase().includes(q) ||
			task.slug.includes(q) ||
			task.id.includes(q) ||
			task.status.includes(q) ||
			task.phase.toLowerCase().includes(q),
		);
	}

	private clamp(): void {
		const count = this.filtered().length;
		this.selected = Math.max(0, Math.min(this.selected, Math.max(0, count - 1)));
	}

	handleInput(data: string): void {
		const items = this.filtered();
		if (data === "\x1b" || data === "q") return this.done(null);
		if (data === "\x1b[A" || data === "k") {
			this.selected = Math.max(0, this.selected - 1);
			return;
		}
		if (data === "\x1b[B" || data === "j") {
			this.selected = Math.min(Math.max(0, items.length - 1), this.selected + 1);
			return;
		}
		if (data === "\x1b[5~") {
			this.selected = Math.max(0, this.selected - this.pageSize);
			return;
		}
		if (data === "\x1b[6~") {
			this.selected = Math.min(Math.max(0, items.length - 1), this.selected + this.pageSize);
			return;
		}
		if (data === "\r" || data === "\n") {
			const task = items[this.selected];
			if (task) this.done(`/harness reflect-ai ${taskDisplayId(task)}`);
			return;
		}
		if (data === "r") {
			const task = items[this.selected];
			if (task) this.done(`/harness reflect ${taskDisplayId(task)}`);
			return;
		}
		if (data === "c") {
			const task = items[this.selected];
			if (task) this.done(`/harness close ${taskDisplayId(task)}`);
			return;
		}
		if (data === "\x7f" || data === "\b") {
			this.query = this.query.slice(0, -1);
			this.selected = 0;
			return;
		}
		if (data.length === 1 && data >= " " && data !== "q") {
			this.query += data;
			this.selected = 0;
		}
		this.clamp();
	}

	render(width: number): string[] {
		const items = this.filtered();
		this.clamp();
		const open = this.tasks.filter((task) => task.status !== "done").length;
		const doneCount = this.tasks.length - open;
		const start = Math.max(0, Math.min(this.selected - Math.floor(this.pageSize / 2), Math.max(0, items.length - this.pageSize)));
		const visible = items.slice(start, start + this.pageSize);
		const title = `pi-harness tasks ${this.includeDone ? "all" : "open"} · ${items.length}/${this.tasks.length} shown · open ${open} · done ${doneCount}`;
		const rendered = [
			this.header(panelTop(title, width)),
			this.header(panelBody(` filter: ${this.query || "(type to search)"}`, width)),
			this.header(panelBody(" ↑↓/j/k move · type filter · enter AI reflect · r reflect · c close · q/esc exit", width)),
			this.border(panelMid(width)),
		];
		if (!visible.length) rendered.push(this.panel(panelBody(" No tasks match the current filter.", width)));
		for (let i = 0; i < visible.length; i++) {
			const task = visible[i]!;
			const absolute = start + i;
			const selected = absolute === this.selected;
			const active = task.id === this.activeTaskId;
			const marker = selected ? ">" : " ";
			const state = task.status === "done" ? "✓" : active ? "*" : "·";
			const style = selected ? this.selectedStyle : this.panel;
			rendered.push(style(panelBody(` ${marker} ${state} ${task.title}`, width)));
			rendered.push(style(panelBody(`     ${taskDisplayId(task)} · ${task.phase} ${PHASE_LABELS[task.phase]} · ${task.status}`, width)));
		}
		while (rendered.length < this.pageSize * 2 + 4) rendered.push(this.panel(panelBody("", width)));
		rendered.push(this.border(panelMid(width)));
		rendered.push(this.dim(panelBody(` selected ${items.length ? this.selected + 1 : 0}/${items.length}; Enter inserts /harness reflect-ai <task-id>`, width)));
		rendered.push(this.border(panelBottom(width)));
		return rendered;
	}

	invalidate(): void {}
}

async function showTaskBrowser(ctx: ExtensionContext, root: string, includeDone: boolean): Promise<string> {
	await ensureHarness(root);
	const index = await loadIndex(root);
	const command = await ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
		const panel = (s: string) => theme.bg("customMessageBg", theme.fg("text", s));
		const header = (s: string) => theme.bg("selectedBg", theme.fg("accent", s));
		const border = (s: string) => theme.bg("customMessageBg", theme.fg("borderAccent", s));
		const dim = (s: string) => theme.bg("customMessageBg", theme.fg("dim", s));
		const selectedStyle = (s: string) => theme.bg("selectedBg", theme.fg("text", s));
		const browser = new TaskBrowserComponent(index.tasks, index.activeTaskId, includeDone, done, panel, header, border, dim, selectedStyle);
		return {
			render: (width: number) => browser.render(width),
			handleInput: (data: string) => {
				browser.handleInput(data);
				tui.requestRender();
			},
			invalidate: () => browser.invalidate(),
		};
	}, { overlay: true, overlayOptions: { width: "92%", maxHeight: "85%", anchor: "center", margin: 1 } });
	if (command) {
		(ctx.ui as any).setEditorText?.(command);
		return `Task selected. Inserted command into editor:\n${command}`;
	}
	return "Task browser closed.";
}

interface ReflectApprovalItem {
	command: string;
	type: MemoryType;
	content: string;
	selected: boolean;
}

function normalizeReflectCommand(line: string): string {
	return line
		.trim()
		.replace(/^[-*]\s*/, "")
		.replace(/^\d+[.)]\s*/, "")
		.replace(/^`+|`+$/g, "")
		.trim();
}

function parseReflectAiRememberCommands(output: string): ReflectApprovalItem[] {
	const seen = new Set<string>();
	const items: ReflectApprovalItem[] = [];
	const addItem = (rawType: string, rawContent: string) => {
		const type = rawType.toLowerCase() as MemoryType;
		let content = rawContent.trim()
			.replace(/^`+|`+$/g, "")
			.replace(/\s+\/harness\s+remember\s+[a-z]+\s*:\s*.*$/i, "")
			.trim();
		if (!MEMORY_TYPES.includes(type) || !content) return;
		// Avoid capturing section headers or explanatory fragments.
		if (/^(suggested|rejected|copy-paste|commands?)\b/i.test(content)) return;
		content = content.replace(/\s+/g, " ");
		const key = `${type}:${content}`.toLowerCase();
		if (seen.has(key)) return;
		seen.add(key);
		items.push({ command: `/harness remember ${type}: ${content}`, type, content, selected: true });
	};
	for (const rawLine of output.split("\n")) {
		const line = normalizeReflectCommand(rawLine);
		// Exact copy-paste command format.
		let match = line.match(/^\/?harness\s+remember\s+([a-z]+)\s*:\s*(.+)$/i);
		if (match) {
			addItem(match[1]!, match[2]!);
			continue;
		}
		// Markdown list format emitted by models: `1. **facts**: ...` or `- **playbooks**: ...`.
		match = line.match(/^(?:\d+[.)]\s*|[-*]\s*)?(?:\*\*)?([a-z]+)(?:\*\*)?\s*:\s*(.+)$/i);
		if (match) {
			addItem(match[1]!, match[2]!);
			continue;
		}
		// Backticked type format: `facts`: ...
		match = line.match(/^(?:\d+[.)]\s*|[-*]\s*)?`([a-z]+)`\s*:\s*(.+)$/i);
		if (match) addItem(match[1]!, match[2]!);
	}
	return items.slice(0, 12);
}

class ReflectApprovalComponent {
	private selected = 0;
	private offset = 0;
	private readonly pageSize = 10;
	constructor(
		private readonly items: ReflectApprovalItem[],
		private readonly done: (result: "apply" | "report" | null) => void,
		private readonly panel: StyleFn,
		private readonly header: StyleFn,
		private readonly border: StyleFn,
		private readonly dim: StyleFn,
		private readonly selectedStyle: StyleFn,
		private readonly success: StyleFn,
	) {}

	private clamp(): void {
		this.selected = Math.max(0, Math.min(this.selected, Math.max(0, this.items.length - 1)));
		if (this.selected < this.offset) this.offset = this.selected;
		if (this.selected >= this.offset + this.pageSize) this.offset = this.selected - this.pageSize + 1;
	}

	handleInput(data: string): void {
		if (data === "\x1b" || data === "q") return this.done(null);
		if (data === "a" || data === "\r" || data === "\n") return this.done("apply");
		if (data === "v" || data === "r") return this.done("report");
		if (data === "\x1b[A" || data === "k") this.selected -= 1;
		else if (data === "\x1b[B" || data === "j") this.selected += 1;
		else if (data === "\x1b[5~") this.selected -= this.pageSize;
		else if (data === "\x1b[6~") this.selected += this.pageSize;
		else if (data === " " || data === "x") {
			const item = this.items[this.selected];
			if (item) item.selected = !item.selected;
		}
		else if (data === "t") {
			const anyUnselected = this.items.some((item) => !item.selected);
			for (const item of this.items) item.selected = anyUnselected;
		}
		this.clamp();
	}

	render(width: number): string[] {
		this.clamp();
		const selectedCount = this.items.filter((item) => item.selected).length;
		const title = `reflect-ai approval · ${selectedCount}/${this.items.length} selected`;
		const rendered = [
			this.header(panelTop(title, width)),
			this.header(panelBody(" ↑↓/j/k move · space toggle · t all · a/enter apply · v report · q cancel", width)),
			this.border(panelMid(width)),
		];
		const visible = this.items.slice(this.offset, this.offset + this.pageSize);
		for (let i = 0; i < visible.length; i++) {
			const item = visible[i]!;
			const absolute = this.offset + i;
			const focused = absolute === this.selected;
			const style = focused ? this.selectedStyle : this.panel;
			const box = item.selected ? "☑" : "☐";
			const typeLabel = item.selected ? this.success(item.type.padEnd(11, " ")) : item.type.padEnd(11, " ");
			rendered.push(style(panelBody(` ${focused ? ">" : " "} ${box} ${typeLabel} ${clipLine(item.content, Math.max(20, width - 22))}`, width)));
			const cmd = clipLine(item.command, Math.max(20, width - 8));
			rendered.push(style(panelBody(`     ${cmd}`, width)));
		}
		while (rendered.length < this.pageSize * 2 + 3) rendered.push(this.panel(panelBody("", width)));
		rendered.push(this.border(panelMid(width)));
		rendered.push(this.dim(panelBody(` Apply selected memories now, or press v to inspect the full read-only report.`, width)));
		rendered.push(this.border(panelBottom(width)));
		return rendered;
	}

	invalidate(): void {}
}

async function showReflectAiApproval(ctx: ExtensionContext, root: string, output: string): Promise<string | undefined> {
	const items = parseReflectAiRememberCommands(output);
	if (!items.length) return undefined;
	const result = await ctx.ui.custom<"apply" | "report" | null>((tui, theme, _keybindings, done) => {
		const panel = (s: string) => theme.bg("customMessageBg", theme.fg("text", s));
		const header = (s: string) => theme.bg("selectedBg", theme.fg("accent", s));
		const border = (s: string) => theme.bg("customMessageBg", theme.fg("borderAccent", s));
		const dim = (s: string) => theme.bg("customMessageBg", theme.fg("dim", s));
		const selectedStyle = (s: string) => theme.bg("selectedBg", theme.fg("text", s));
		const success = (s: string) => theme.fg("success", s);
		const approval = new ReflectApprovalComponent(items, done, panel, header, border, dim, selectedStyle, success);
		return {
			render: (width: number) => approval.render(width),
			handleInput: (data: string) => {
				approval.handleInput(data);
				tui.requestRender();
			},
			invalidate: () => approval.invalidate(),
		};
	}, { overlay: true, overlayOptions: { width: "94%", maxHeight: "85%", anchor: "center", margin: 1 } });
	if (result === "report") {
		await showOutputViewer(ctx, "pi-harness: reflect-ai report", output);
		return "Opened full reflect-ai report. No memories applied.";
	}
	if (result !== "apply") return "reflect-ai approval cancelled. No memories applied.";
	const selected = items.filter((item) => item.selected);
	if (!selected.length) return "No reflect-ai suggestions selected. No memories applied.";
	const applied: string[] = [];
	for (const item of selected) {
		await rememberMemory(root, `${item.type}: ${item.content}`);
		applied.push(`- ${item.type}: ${item.content}`);
	}
	await appendTrace(root, { type: "reflect_ai_approval", applied: selected.length });
	return [`Applied ${selected.length} reflect-ai memory suggestion(s):`, ...applied].join("\n");
}

async function buildTaskList(root: string, includeDone = false): Promise<string> {
	if (!(await exists(path.join(harnessPath(root), "index.json")))) {
		return `pi-harness is not initialized in ${root}. Run /harness init or call harness({ action: "init" }).`;
	}
	const index = await loadIndex(root);
	const tasks = includeDone ? index.tasks : index.tasks.filter((task) => task.status !== "done");
	const doneCount = index.tasks.filter((task) => task.status === "done").length;
	const lines = [
		includeDone ? `pi-harness tasks: ${tasks.length}` : `pi-harness open tasks: ${tasks.length}`,
		`Root: ${root}`,
	];
	if (doneCount && !includeDone) lines.push(`Done tasks hidden: ${doneCount} (use /harness tasks all)`);
	if (!tasks.length) {
		lines.push("No tasks found.");
		return lines.join("\n");
	}
	lines.push("");
	for (const task of tasks) {
		const marker = task.id === index.activeTaskId ? "*" : "-";
		lines.push(`${marker} ${task.title}`);
		lines.push(`  id: ${taskDisplayId(task)}`);
		lines.push(`  phase: ${task.phase} ${PHASE_LABELS[task.phase]} | status: ${task.status}`);
	}
	return lines.join("\n");
}

async function buildHarnessSummary(root: string): Promise<string> {
	await ensureHarness(root);
	const index = await loadIndex(root);
	const active = await getActiveTask(root);
	const openTasks = index.tasks.filter((task) => task.status !== "done");
	const lines = [
		"# Harness Summary",
		"",
		`Generated: ${now()}`,
		`Root: ${root}`,
		`Version: ${VERSION}`,
		`Tasks: ${index.tasks.length} total, ${openTasks.length} open`,
	];
	if (active) {
		const dir = taskDir(root, active);
		const goal = await readGoal(root, active);
		lines.push(
			"",
			"## Active Task",
			`- Title: ${active.title}`,
			`- ID: ${active.id}-${active.slug}`,
			`- Phase: ${active.phase} (${PHASE_LABELS[active.phase]})`,
			`- Status: ${active.status}`,
			"",
			"### Goal",
			goal ? formatGoal(goal) : "none",
			"",
			"### Contract",
			truncate(await readText(path.join(dir, "contract.md")), 1800),
			"",
			"### Plan",
			truncate(await readText(path.join(dir, "plan.md")), 1800),
			"",
			"### Latest Evidence",
			truncate((await recentLines(path.join(dir, "evidence.md"), 30)).join("\n"), 1600),
			"",
			"### Latest Journal",
			truncate((await recentLines(path.join(dir, "journal.md"), 30)).join("\n"), 1600),
			"",
			"### Ideas Backlog",
			truncate(await readText(path.join(dir, "ideas.md")), 1200),
			"",
			"### Recent Trace",
			truncate(await recentTraceSection(root, active), 1800),
		);
	} else {
		lines.push("", "## Active Task", "none");
	}
	lines.push(
		"",
		"## Durable Context",
		truncate(await readText(path.join(harnessPath(root), "project.md")), 1200),
		"",
		"## Recent Decisions",
		truncate((await recentLines(path.join(harnessPath(root), "decisions.md"), 40)).join("\n"), 1800),
	);
	return lines.filter((line) => line !== undefined).join("\n");
}

async function rebuildSummary(root: string): Promise<string> {
	const summary = await buildHarnessSummary(root);
	await writeText(path.join(harnessPath(root), SUMMARY_FILE), summary);
	await appendTrace(root, { type: "summary_rebuild" });
	return summary;
}

async function generateReport(root: string, note?: string): Promise<string> {
	const task = await getActiveTask(root);
	const status = await buildStatus(root);
	const report = [`# Harness Report`, "", status, ""];
	if (note) report.push("## Note", "", note, "");
	if (task) {
		const dir = taskDir(root, task);
		const goal = await readGoal(root, task);
		report.push("## Goal", "", goal ? formatGoal(goal) : "none", "");
		report.push("## Contract", "", truncate(await readText(path.join(dir, "contract.md")), 3000), "");
		report.push("## Plan", "", truncate(await readText(path.join(dir, "plan.md")), 3000), "");
		report.push("## Evidence", "", truncate(await readText(path.join(dir, "evidence.md")), 3000), "");
		report.push("## Journal", "", truncate(await readText(path.join(dir, "journal.md")), 3000), "");
		report.push("## Ideas", "", truncate(await readText(path.join(dir, "ideas.md")), 2000), "");
		report.push("## Recent Trace", "", truncate(await recentTraceSection(root, task), 3000), "");
		const output = report.join("\n");
		await writeText(path.join(dir, "report.md"), output);
		return output;
	}
	return report.join("\n");
}

// --- Memory subsystem ---

function memoryDir(root: string): string {
	return path.join(harnessPath(root), MEMORY_DIR);
}

function memoryFilePath(root: string, type: MemoryType): string {
	return path.join(memoryDir(root), `${type}.md`);
}

function parseMemoryInput(text: string): { type: MemoryType; content: string } {
	const colonIdx = text.indexOf(":");
	if (colonIdx < 1) throw new Error(`Format: 'type: content'. Valid types: ${MEMORY_TYPES.join(", ")}`);
	const rawType = text.slice(0, colonIdx).trim().toLowerCase();
	const content = text.slice(colonIdx + 1).trim();
	if (!content) throw new Error("Memory content cannot be empty.");
	if (!MEMORY_TYPES.includes(rawType as MemoryType)) {
		throw new Error(`Invalid memory type '${rawType}'. Valid: ${MEMORY_TYPES.join(", ")}`);
	}
	return { type: rawType as MemoryType, content };
}

async function rememberMemory(root: string, text: string): Promise<string> {
	await ensureHarness(root);
	const { type, content } = parseMemoryInput(text);
	const filePath = memoryFilePath(root, type);
	if (!(await exists(filePath))) {
		await writeText(filePath, `# Memory: ${type}\n`);
	}
	const entry = content.startsWith("-") ? content : `- ${content}`;
	const normalizeMemory = (value: string) => value.replace(/^[-*]\s*/, "").replace(/\s+/g, " ").trim().toLowerCase();
	const existing = await readText(filePath);
	const duplicate = existing.split("\n").some((line) => normalizeMemory(line) === normalizeMemory(entry));
	if (duplicate) {
		await appendTrace(root, { type: "memory_duplicate_skipped", memoryType: type, content: redact(content) });
		return `Memory already exists in ${type}: ${content.slice(0, 120)}`;
	}
	await appendText(filePath, `${entry}\n`);
	await appendTrace(root, { type: "memory_remember", memoryType: type, content: redact(content) });
	return `Remembered in ${type}: ${content.slice(0, 120)}`;
}

async function recallMemory(root: string, filter?: string): Promise<string> {
	await ensureHarness(root);
	const dir = memoryDir(root);
	if (!(await exists(dir))) return "No memories stored yet.";
	const typeFilter = filter?.trim().toLowerCase();
	const types = typeFilter && MEMORY_TYPES.includes(typeFilter as MemoryType)
		? [typeFilter as MemoryType]
		: MEMORY_TYPES;
	const sections: string[] = [];
	for (const type of types) {
		const content = (await readText(memoryFilePath(root, type))).trim();
		if (content && content !== `# Memory: ${type}`) {
			sections.push(content);
		}
	}
	if (!sections.length) return typeFilter ? `No memories of type '${typeFilter}'.` : "No memories stored yet.";
	if (typeFilter && filter && !MEMORY_TYPES.includes(typeFilter as MemoryType)) {
		// Substring search across all memories
		const needle = filter.toLowerCase();
		const matches = sections.filter((s) => s.toLowerCase().includes(needle));
		if (!matches.length) return `No memories matching '${filter}'.`;
		return matches.join("\n\n");
	}
	return sections.join("\n\n");
}

async function forgetMemory(root: string, text: string): Promise<string> {
	await ensureHarness(root);
	const { type, content } = parseMemoryInput(text);
	const filePath = memoryFilePath(root, type);
	const existing = await readText(filePath);
	if (!existing) return `No memories of type '${type}'.`;
	const needle = content.toLowerCase();
	const lines = existing.split("\n");
	const filtered = lines.filter((line) => !line.toLowerCase().includes(needle));
	if (filtered.length === lines.length) return `No memory matching '${content}' in ${type}.`;
	const removed = lines.length - filtered.length;
	await writeText(filePath, filtered.join("\n"));
	await appendTrace(root, { type: "memory_forget", memoryType: type, content: redact(content) });
	return `Removed ${removed} entry(ies) from ${type}.`;
}

function normalizeMemoryLine(value: string): string {
	return value.replace(/^[-*]\s*/, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function memoryEntryLines(content: string): string[] {
	return content.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

async function memoryAudit(root: string): Promise<string> {
	await ensureHarness(root);
	const lines = [
		"# Memory Audit",
		"",
		`Generated: ${now()}`,
		"",
		"This is deterministic and read-only. Use `/harness memory-dedupe` to remove exact normalized duplicates.",
		"",
		"| Type | Entries | Duplicates | Prompted | Characters | Notes |",
		"| --- | ---: | ---: | --- | ---: | --- |",
	];
	let totalEntries = 0;
	let totalDuplicates = 0;
	for (const type of MEMORY_TYPES) {
		const content = await readText(memoryFilePath(root, type));
		const entries = memoryEntryLines(content);
		const seen = new Set<string>();
		let duplicates = 0;
		for (const entry of entries) {
			const key = normalizeMemoryLine(entry);
			if (seen.has(key)) duplicates++;
			else seen.add(key);
		}
		totalEntries += entries.length;
		totalDuplicates += duplicates;
		const prompted = (["preferences", "playbooks", "mistakes"] as string[]).includes(type) ? "yes" : "no";
		const notes: string[] = [];
		if (duplicates) notes.push("dedupe recommended");
		if (prompted === "yes" && content.length > 1200) notes.push("lean context may truncate");
		if (!entries.length) notes.push("empty");
		lines.push(`| ${type} | ${entries.length} | ${duplicates} | ${prompted} | ${content.length} | ${notes.join(", ") || "ok"} |`);
	}
	lines.push(
		"",
		"## Recommendations",
		"",
		totalDuplicates ? `- Run \`/harness memory-dedupe\` to remove ${totalDuplicates} duplicate entr${totalDuplicates === 1 ? "y" : "ies"}.` : "- No duplicate memory entries detected.",
		"- Keep `preferences`, `playbooks`, and `mistakes` high-signal: these are injected into lean context.",
		"- Store broad project facts in `facts` and domain vocabulary in `glossary`; they are available through recall but not always injected.",
		"- Prefer durable, reusable lessons over one-off task notes.",
	);
	const report = lines.join("\n");
	await writeText(path.join(harnessPath(root), "memory-audit.md"), report);
	await appendTrace(root, { type: "memory_audit", entries: totalEntries, duplicates: totalDuplicates });
	return report;
}

async function memoryDedupe(root: string): Promise<string> {
	await ensureHarness(root);
	const report: string[] = ["Memory dedupe:"];
	let totalRemoved = 0;
	for (const type of MEMORY_TYPES) {
		const filePath = memoryFilePath(root, type);
		const content = await readText(filePath);
		if (!content.trim()) continue;
		const output: string[] = [];
		const seen = new Set<string>();
		let removed = 0;
		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) {
				output.push(line);
				continue;
			}
			const key = normalizeMemoryLine(trimmed);
			if (seen.has(key)) {
				removed++;
				continue;
			}
			seen.add(key);
			output.push(line);
		}
		if (removed) {
			totalRemoved += removed;
			await writeText(filePath, output.join("\n").replace(/\n{3,}/g, "\n\n"));
		}
		report.push(`- ${type}: removed ${removed}`);
	}
	await appendTrace(root, { type: "memory_dedupe", removed: totalRemoved });
	report.push(`Total removed: ${totalRemoved}`);
	return report.join("\n");
}

async function taskForReflection(root: string, selector?: string): Promise<TaskState> {
	const trimmed = selector?.trim();
	const task = trimmed ? await findTask(root, trimmed) : await getActiveTask(root);
	if (!task) {
		throw new Error(trimmed ? `Task not found: ${trimmed}` : "No active task. Use startTask first or pass a task id/title.");
	}
	return task;
}

async function reflectOnTask(root: string, selector?: string): Promise<string> {
	const task = await taskForReflection(root, selector);
	const dir = taskDir(root, task);
	const evidence = await readText(path.join(dir, "evidence.md"));
	const journal = await readText(path.join(dir, "journal.md"));
	const decisions = await readText(path.join(harnessPath(root), "decisions.md"));
	const ideas = await readText(path.join(dir, "ideas.md"));
	// Heuristic memory candidates
	const allText = `${evidence}\n${journal}`;
	const candidates: string[] = [];
	for (const line of allText.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		if (/lesson|learned|pattern|mistake|always|never|prefer|important|gotcha|workaround|tip|note.*:|caveat|watch out|remember/i.test(trimmed)) {
			candidates.push(`  - ${trimmed.replace(/^[-*]\s*/, "")}`);
		}
	}
	const lines = [
		"# Reflection: what to remember from this task?",
		"",
		`Task: ${task.title}`,
		`Phase: ${task.phase} (${PHASE_LABELS[task.phase]})`,
		"",
	];
	if (candidates.length) {
		lines.push(
			"## Memory candidates (auto-detected)",
			"",
			...candidates.slice(0, 15),
			"",
		);
	}
	lines.push(
		"## Task artifacts for manual review",
		"",
		"Persist only high-signal reusable lessons. Examples:",
		"  /harness remember mistakes: <reusable lesson to avoid repeating>",
		"  /harness remember playbooks: <repeatable procedure>",
		`Valid types: ${MEMORY_TYPES.join(", ")}`,
		"",
		"### Evidence (last 20 lines)",
		truncate((evidence.split("\n").slice(-20)).join("\n"), 1500),
		"",
		"### Journal (last 15 lines)",
		truncate((journal.split("\n").slice(-15)).join("\n"), 1200),
		"",
		"### Decisions (last 10 lines)",
		truncate((decisions.split("\n").slice(-10)).join("\n"), 800),
		"",
		"### Ideas",
		truncate(ideas, 600),
	);
	await appendTrace(root, { type: "reflect", taskId: task.id });
	return lines.join("\n");
}

// memoryCandidates now just calls reflect (merged)
async function memoryCandidates(root: string, selector?: string): Promise<string> {
	return await reflectOnTask(root, selector);
}

async function reflectOnTaskWithModel(ctx: ExtensionContext, root: string, selector?: string): Promise<string> {
	const task = await taskForReflection(root, selector);
	const model = ctx.model ?? ctx.modelRegistry.find("google", "gemini-2.5-flash");
	if (!model) throw new Error("No model available for AI reflection.");
	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth.ok) throw new Error(String((auth as any).error));
	if (!auth.apiKey) throw new Error(`No API key for ${model.provider}.`);

	const [{ complete }] = await Promise.all([
		import("@earendil-works/pi-ai"),
	]);
	const dir = taskDir(root, task);
	const evidence = truncate(await readText(path.join(dir, "evidence.md")), 6000);
	const journal = truncate(await readText(path.join(dir, "journal.md")), 5000);
	const ideas = truncate(await readText(path.join(dir, "ideas.md")), 2500);
	const decisions = truncate((await recentLines(path.join(harnessPath(root), "decisions.md"), 40)).join("\n"), 4000);
	const existingMemory = truncate(await recallMemory(root), 6000);
	const prompt = `You are pi-harness continuous-improvement reviewer. Analyze the completed or active task artifacts and propose ONLY high-signal reusable improvements.

Rules:
- Read-only: do not claim anything was applied.
- Prefer 0-5 suggestions total; quality over quantity.
- Every suggested memory must use exactly one valid type: ${MEMORY_TYPES.join(", ")}.
- Reject generic operational notes, one-off facts, and anything not useful one month later.
- Deduplicate against existing memory.
- Do not include secrets or authentication material.
- Output Markdown with these sections exactly:
  1. Suggested memories
  2. Suggested policy/playbook/code improvements
  3. Rejected candidates
  4. Copy-paste commands
- In copy-paste commands, use executable examples like: /harness remember mistakes: <content>

Task: ${task.title}
Phase: ${task.phase} (${PHASE_LABELS[task.phase]})

Existing memory:
${existingMemory || "(none)"}

Recent decisions:
${decisions || "(none)"}

Evidence:
${evidence || "(none)"}

Journal:
${journal || "(none)"}

Ideas:
${ideas || "(none)"}`;
	const response = await complete(
		model,
		{
			messages: [{
				role: "user" as const,
				content: [{ type: "text" as const, text: prompt }],
				timestamp: Date.now(),
			}],
		},
		{ apiKey: auth.apiKey, headers: auth.headers, maxTokens: 1800, signal: ctx.signal },
	);
	const text = response.content
		.filter((item): item is { type: "text"; text: string } => item.type === "text")
		.map((item) => item.text)
		.join("\n")
		.trim();
	await appendTrace(root, { type: "reflect_ai", taskId: task.id, model: `${model.provider}/${model.id}` });
	return [`# AI Reflection: continuous improvement suggestions`, "", `Model: ${model.provider}/${model.id}`, "", text || "(model returned no text)", "", "This report is read-only. Apply only approved suggestions manually."].join("\n");
}

async function improveReport(root: string): Promise<string> {
	await ensureHarness(root);
	const dir = harnessPath(root);
	const mDir = memoryDir(root);
	const mistakes = await readText(path.join(mDir, "mistakes.md"));
	const patterns = await readText(path.join(mDir, "patterns.md"));
	const decisions = await readText(path.join(dir, "decisions.md"));
	const lines = [
		"# Improvement Report",
		"",
		`Generated: ${now()}`,
		"",
		"## Recorded Mistakes",
		mistakes.trim() || "(none)",
		"",
		"## Patterns",
		patterns.trim() || "(none)",
		"",
		"## Decisions (recent 30)",
		truncate((decisions.split("\n").slice(-30)).join("\n"), 2000),
		"",
		"## Suggestions",
		"",
		"Based on mistakes and patterns above, consider:",
		mistakes.trim() ? "- Review mistakes for recurring themes that could become policies or playbooks." : "- No mistakes recorded yet; use `remember` to capture them when they happen.",
		patterns.trim() ? "- Consider formalizing patterns into playbooks or project policies." : "- No patterns recorded yet.",
		"- Run `/harness reflect` at the end of each task to surface memory candidates.",
		"",
		"This report is read-only. Apply improvements manually via `remember`, `writePolicy`, or skill edits.",
	];
	const report = lines.join("\n");
	await writeText(path.join(dir, "improve-report.md"), report);
	await appendTrace(root, { type: "improve_report" });
	return report;
}

async function buildLeanMemory(root: string): Promise<string> {
	const dir = memoryDir(root);
	if (!(await exists(dir))) return "";
	const sections: string[] = [];
	// Only include high-signal types in lean context
	for (const type of ["preferences", "playbooks", "mistakes"] as MemoryType[]) {
		const content = (await readText(memoryFilePath(root, type))).trim();
		if (content && content !== `# Memory: ${type}`) {
			sections.push(truncate(content, 600));
		}
	}
	if (!sections.length) return "";
	return `## Memory (preferences/playbooks/mistakes)\n${sections.join("\n\n")}`;
}

// --- End memory subsystem ---

async function handleHarness(root: string, params: HarnessParamsType): Promise<string> {
	switch (params.action) {
		case "init":
			await ensureHarness(root);
			return await buildStatus(root);
		case "status":
			return await buildStatus(root);
		case "tasks":
			return await buildTaskList(root, params.text === "all");
		case "startTask": {
			if (!params.title) throw new Error("title is required for startTask");
			const task = await startTask(root, params.title);
			return `Started task ${task.id}-${task.slug} in phase ${task.phase} (${PHASE_LABELS[task.phase]}).`;
		}
		case "setPhase": {
			if (!params.phase || !PHASES.includes(params.phase as Phase)) throw new Error("phase must be one of P, R, E, V, C");
			const task = await setPhase(root, params.phase as Phase);
			return `Set phase to ${task.phase} (${PHASE_LABELS[task.phase]}).`;
		}
		case "advancePhase": {
			const task = await advancePhase(root);
			return `Advanced to ${task.phase} (${PHASE_LABELS[task.phase]}).`;
		}
		case "completeTask": {
			const { task, reflectionHint } = await completeTask(root, params.text);
			return `Completed task ${task.id}-${task.slug}.${reflectionHint}`;
		}
		case "closeTask": {
			const { task, reflectionHint } = await closeTask(root, params.text);
			return `Closed task ${task.id}-${task.slug}.${reflectionHint}`;
		}
		case "recordDecision":
			if (!params.text) throw new Error("text is required for recordDecision");
			await recordDecision(root, params.text);
			return "Decision recorded.";
		case "recordEvidence":
			if (!params.text) throw new Error("text is required for recordEvidence");
			await recordEvidence(root, params.text);
			return "Evidence recorded.";
		case "recordCheck":
			if (!params.text && !params.command) throw new Error("text or command is required for recordCheck");
			await recordCheck(root, { command: params.command, exitCode: params.exitCode, passed: params.passed, text: params.text });
			return "Check recorded.";
		case "recordNote":
			if (!params.text) throw new Error("text is required for recordNote");
			await recordNote(root, params.text);
			return "Note recorded.";
		case "appendIdea":
			if (!params.text) throw new Error("text is required for appendIdea");
			await appendIdea(root, params.text);
			return "Idea appended.";
		case "readContext":
			await ensureHarness(root);
			return await buildContext(root);
		case "writeProjectContext":
			if (!params.text) throw new Error("text is required for writeProjectContext");
			await ensureHarness(root);
			await writeText(path.join(harnessPath(root), "project.md"), params.text);
			await appendTrace(root, { type: "project_context_update" });
			return "Project context updated.";
		case "writePolicy":
			if (!params.text) throw new Error("text is required for writePolicy");
			await ensureHarness(root);
			await writeText(path.join(harnessPath(root), "policies.md"), params.text);
			await appendTrace(root, { type: "policy_update" });
			return "Policies updated.";
		case "updateContract":
		case "recordContract": {
			if (!params.text) throw new Error(`text is required for ${params.action}`);
			const task = await getActiveTask(root);
			if (!task) throw new Error("No active task. Use startTask first.");
			await writeText(path.join(taskDir(root, task), "contract.md"), params.text);
			await appendTrace(root, { type: "contract_update", taskId: task.id });
			await autoInferPhase(root, "P");
			return "Task contract updated.";
		}
		case "updatePlan":
		case "recordPlan": {
			if (!params.text) throw new Error(`text is required for ${params.action}`);
			const task = await getActiveTask(root);
			if (!task) throw new Error("No active task. Use startTask first.");
			await writeText(path.join(taskDir(root, task), "plan.md"), params.text);
			await appendTrace(root, { type: "plan_update", taskId: task.id });
			await autoInferPhase(root, "P");
			return "Task plan updated.";
		}
		case "setGoal": {
			if (!params.text) throw new Error("text is required for setGoal");
			const goal = await setGoal(root, params.text);
			return `Goal set.\n${formatGoal(goal)}`;
		}
		case "goalStatus": {
			return formatGoal(await readGoal(root));
		}
		case "clearGoal": {
			const goal = await clearGoal(root);
			return `Goal cleared.\n${formatGoal(goal)}`;
		}
		case "achieveGoal": {
			const goal = await achieveGoal(root, params.text);
			return `Goal achieved.\n${formatGoal(goal)}`;
		}
		case "summary":
			return await buildHarnessSummary(root);
		case "rebuildSummary":
			return await rebuildSummary(root);
		case "report":
			await ensureHarness(root);
			return await generateReport(root, params.text);
		case "remember":
			if (!params.text) throw new Error("text is required for remember. Format: 'type: content'. Valid types: " + MEMORY_TYPES.join(", "));
			return await rememberMemory(root, params.text);
		case "recall":
			return await recallMemory(root, params.text);
		case "forget":
			if (!params.text) throw new Error("text is required for forget. Format: 'type: content substring'");
			return await forgetMemory(root, params.text);
		case "reflect":
			return await reflectOnTask(root, params.text);
		case "reflectAi":
			throw new Error("reflectAi requires Pi extension context; use /harness reflect-ai.");
		case "memoryCandidates":
			return await memoryCandidates(root, params.text);
		case "memoryAudit":
			return await memoryAudit(root);
		case "memoryDedupe":
			return await memoryDedupe(root);
		case "improveReport":
			return await improveReport(root);
		default:
			return `Unknown action: ${(params as any).action}`;
	}
}

function commandHelp(): string {
	return [
		"Usage: /harness <command>",
		"",
		"Commands:",
		"  init                         initialize .pi/harness in this project",
		"  status                       show harness status",
		"  tasks [all]                  list tasks; with 'all' opens navigable browser for closed tasks",
		"  tasks-ui [all]               open navigable task browser without widget truncation",
		"  context                      show injected context summary",
		"  task <title>                 start a task in phase P",
		"  phase <P|R|E|V|C>            set active task phase",
		"  advance                      advance active task phase",
		"  done [note]                  mark active task as done and hide it from open list",
		"  close <task-id> [note]        mark any task as done by id/slug/title",
		"  decision <text>              record durable decision",
		"  evidence <text>              record validation evidence",
		"  check [pass|fail] <cmd> -- <summary>  record structured validation check",
		"  note <text>                  append an operational task journal note",
		"  idea <text>                  append a task idea/backlog item",
		"  contract <markdown>          replace active task contract",
		"  plan <markdown>              replace active task plan",
		"  goal [status]                show active task goal status",
		"  goal [--max-turns N] <cond>  set an autonomous verifiable goal",
		"  goal clear                   clear active task goal",
		"  goal achieved <evidence>     mark active task goal achieved",
		"  summary                      show deterministic harness summary",
		"  rebuild-summary              write .pi/harness/summary.md from current state",
		"  report [note]                generate active task report",
		"  remember <type>: <content>   save to durable memory (types: facts, preferences, patterns, mistakes, playbooks, glossary)",
		"  recall [type|query]          retrieve memories (all, by type, or substring search)",
		"  forget <type>: <substring>   remove memory entries matching substring",
		"  reflect [task-id]            review active or selected task and suggest what to memorize",
		"  reflect-ai [task-id]         ask current model for suggestions, then approve memories with checkboxes",
		"  memory-candidates [task-id]  heuristic scan for memorizable lines in a task",
		"  memory-audit                 deterministic report of memory counts, duplicates, prompt footprint",
		"  memory-dedupe                remove exact normalized duplicate memory entries",
		"  improve-report               generate improvement report from mistakes/patterns",
	].join("\n");
}

function commandOutputLines(output: string): string[] {
	const lines = output.split("\n");
	const maxLines = 80;
	const maxChars = 180;
	const visible = lines.slice(0, maxLines).map((line) => (line.length > maxChars ? `${line.slice(0, maxChars - 1)}…` : line));
	if (lines.length > maxLines) visible.push(`… truncated ${lines.length - maxLines} more lines`);
	return visible;
}

function parseCheckArgs(rest: string): { command?: string; text?: string; exitCode?: number; passed?: boolean } {
	let input = rest.trim();
	let passed: boolean | undefined;
	const statusMatch = input.match(/^(pass|passed|ok|fail|failed|error)\s+/i);
	if (statusMatch) {
		passed = /^(pass|passed|ok)$/i.test(statusMatch[1]!);
		input = input.slice(statusMatch[0].length).trim();
	}
	const separator = input.indexOf(" -- ");
	let command = separator >= 0 ? input.slice(0, separator).trim() : input;
	let text = separator >= 0 ? input.slice(separator + 4).trim() : undefined;
	const exitMatch = `${command} ${text ?? ""}`.match(/\bexit(?:=|\s+)(-?\d+)\b/i);
	const exitCode = exitMatch ? Number(exitMatch[1]) : undefined;
	if (typeof passed !== "boolean" && typeof exitCode === "number") passed = exitCode === 0;
	command = command.replace(/\bexit(?:=|\s+)-?\d+\b/i, "").trim();
	if (text) text = text.replace(/\bexit(?:=|\s+)-?\d+\b/i, "").trim();
	return { command: command || undefined, text: text || undefined, exitCode, passed };
}

async function evaluateGoalWithModel(ctx: ExtensionContext, goal: GoalState): Promise<{ achieved: boolean; reason: string }> {
	const model = ctx.modelRegistry.find("google", "gemini-2.5-flash") ?? ctx.model;
	if (!model) throw new Error("No model available for goal evaluation.");
	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth.ok) throw new Error(String((auth as any).error));
	if (!auth.apiKey) throw new Error(`No API key for ${model.provider}.`);

	const [{ complete }, { convertToLlm, serializeConversation }] = await Promise.all([
		import("@earendil-works/pi-ai"),
		import("@earendil-works/pi-coding-agent"),
	]);
	const branchEntries = ctx.sessionManager.getBranch().slice(-GOAL_CONVERSATION_ENTRY_LIMIT);
	const conversation = serializeConversation(convertToLlm(branchEntries as any));
	const response = await complete(
		model,
		{
			messages: [{
				role: "user" as const,
				content: [{
					type: "text" as const,
					text: `You are the pi-harness goal evaluator. Decide whether the goal condition is satisfied by evidence visible in the conversation transcript.\n\nRules:\n- Do not assume commands passed unless their output/result is visible.\n- Prefer explicit harness evidence, test/build output, exit codes, completed checklists, or file inspection results.\n- Return strict JSON only: {"achieved": boolean, "reason": "short reason"}.\n- If evidence is missing, achieved must be false and reason should say what evidence is missing.\n\nGoal condition:\n${goal.condition}\n\nConversation transcript:\n${conversation}`,
				}],
				timestamp: Date.now(),
			}],
		},
		{ apiKey: auth.apiKey, headers: auth.headers, maxTokens: 512, signal: ctx.signal },
	);
	const text = response.content
		.filter((item): item is { type: "text"; text: string } => item.type === "text")
		.map((item) => item.text)
		.join("\n")
		.trim();
	const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
	try {
		const parsed = JSON.parse(jsonText) as { achieved?: unknown; reason?: unknown };
		return { achieved: parsed.achieved === true, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 500) : "No evaluator reason returned." };
	} catch {
		return { achieved: false, reason: `Evaluator returned non-JSON output: ${text.slice(0, 300)}` };
	}
}

function goalFollowUpPrompt(goal: GoalState): string {
	return [
		`Continue working toward the active pi-harness goal.`,
		`Condition: ${goal.condition}`,
		`Last evaluator reason: ${goal.lastEvaluatorReason ?? "not evaluated yet"}`,
		`Turns evaluated: ${goal.turns}/${goal.maxTurns}`,
		"Before claiming completion, surface verifiable evidence in the conversation and record validation evidence with harness({ action: \"recordEvidence\", text: ... }).",
		"If the condition is now satisfied, call harness({ action: \"achieveGoal\", text: \"evidence summary\" }); otherwise continue the next concrete step.",
	].join("\n");
}

async function processGoalAfterAgent(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
	const root = await resolveProjectRoot(ctx.cwd);
	if (activeGoalEvaluations.has(root)) return;
	const task = await getActiveTask(root);
	if (!task) return;
	let goal = await readGoal(root, task);
	if (!goal || goal.status !== "active") return;
	activeGoalEvaluations.add(root);
	try {
		goal.turns += 1;
		goal.lastEvaluationAt = now();
		const elapsedMinutes = (Date.now() - Date.parse(goal.createdAt)) / 60000;
		if (goal.maxMinutes && elapsedMinutes >= goal.maxMinutes) {
			goal.status = "budget-limited";
			goal.lastEvaluatorReason = `Stopped before evaluation: max minutes (${goal.maxMinutes}) reached.`;
			await writeGoal(root, task, goal);
			await appendTrace(root, { type: "goal_budget_limited", taskId: task.id, reason: goal.lastEvaluatorReason });
			ctx.ui.notify("pi-harness goal stopped: time budget reached", "warning");
			return;
		}

		await writeGoal(root, task, goal);
		let evaluation: { achieved: boolean; reason: string };
		try {
			evaluation = await evaluateGoalWithModel(ctx, goal);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			evaluation = { achieved: false, reason: `Evaluator unavailable; continuing agent-driven goal loop. Agent should call achieveGoal when evidence proves completion. (${message})` };
			await appendTrace(root, { type: "goal_evaluator_unavailable", taskId: task.id, error: redact(message) });
		}
		goal = (await readGoal(root, task)) ?? goal;
		if (goal.status !== "active") return;
		goal.lastEvaluationAt = now();
		goal.lastEvaluatorReason = evaluation.reason;
		await appendTrace(root, { type: "goal_evaluation", taskId: task.id, achieved: evaluation.achieved, turns: goal.turns, reason: redact(evaluation.reason) });

		if (evaluation.achieved) {
			goal.status = "achieved";
			goal.achievedAt = now();
			await writeGoal(root, task, goal);
			await appendText(path.join(taskDir(root, task), "evidence.md"), `\n## ${now()}\n\nGoal achieved: ${goal.condition}\n\nEvaluator reason: ${evaluation.reason}\n`);
			await appendTrace(root, { type: "goal_achieved", taskId: task.id });
			await refreshHarnessUi(ctx, root);
			ctx.ui.notify("pi-harness goal achieved", "info");
			return;
		}

		if (goal.turns >= goal.maxTurns) {
			goal.status = "budget-limited";
			await writeGoal(root, task, goal);
			await appendText(path.join(taskDir(root, task), "journal.md"), `\n## ${now()}\n\nGoal stopped by turn budget: ${goal.condition}\n\nLast evaluator reason: ${evaluation.reason}\n`);
			await appendTrace(root, { type: "goal_budget_limited", taskId: task.id, reason: redact(evaluation.reason) });
			await refreshHarnessUi(ctx, root);
			ctx.ui.notify("pi-harness goal stopped: turn budget reached", "warning");
			return;
		}

		await writeGoal(root, task, goal);
		await refreshHarnessUi(ctx, root);
		const prompt = goalFollowUpPrompt(goal);
		if (ctx.isIdle()) pi.sendUserMessage(prompt);
		else pi.sendUserMessage(prompt, { deliverAs: "followUp" });
	} catch (error) {
		const latest = await readGoal(root, task);
		if (latest?.status === "active") {
			latest.status = "error";
			latest.error = error instanceof Error ? error.message : String(error);
			latest.lastEvaluatorReason = `Goal evaluator failed: ${latest.error}`;
			await writeGoal(root, task, latest);
			await appendTrace(root, { type: "goal_error", taskId: task.id, error: redact(latest.error) });
			await refreshHarnessUi(ctx, root);
		}
		ctx.ui.notify(`pi-harness goal error: ${error instanceof Error ? error.message : String(error)}`, "error");
	} finally {
		activeGoalEvaluations.delete(root);
	}
}

async function runCommand(pi: ExtensionAPI, args: string, ctx: ExtensionContext): Promise<void> {
	const root = await resolveProjectRoot(ctx.cwd);
	const trimmed = args.trim();
	const [cmdRaw, ...restParts] = trimmed.split(/\s+/);
	const cmd = cmdRaw || "status";
	const rest = restParts.join(" ").trim();
	let output: string;
	let goalKickoff: string | undefined;
	try {
		switch (cmd) {
			case "help":
				output = commandHelp();
				break;
			case "init":
				output = await handleHarness(root, { action: "init" } as HarnessParamsType);
				break;
			case "status":
				output = await handleHarness(root, { action: "status" } as HarnessParamsType);
				break;
			case "tasks":
				if (rest.split(/\s+/).includes("all") && !rest.split(/\s+/).includes("text")) output = await showTaskBrowser(ctx, root, true);
				else output = await handleHarness(root, { action: "tasks", text: rest } as HarnessParamsType);
				break;
			case "tasks-ui":
				output = await showTaskBrowser(ctx, root, rest.split(/\s+/).includes("all"));
				break;
			case "context":
				output = await handleHarness(root, { action: "readContext" } as HarnessParamsType);
				break;
			case "task":
				output = await handleHarness(root, { action: "startTask", title: rest } as HarnessParamsType);
				break;
			case "phase":
				output = await handleHarness(root, { action: "setPhase", phase: rest.toUpperCase() } as unknown as HarnessParamsType);
				break;
			case "advance":
				output = await handleHarness(root, { action: "advancePhase" } as HarnessParamsType);
				break;
			case "done":
				output = await handleHarness(root, { action: "completeTask", text: rest || undefined } as HarnessParamsType);
				break;
			case "close":
				output = await handleHarness(root, { action: "closeTask", text: rest } as HarnessParamsType);
				break;
			case "decision":
				output = await handleHarness(root, { action: "recordDecision", text: rest } as HarnessParamsType);
				break;
			case "evidence":
				output = await handleHarness(root, { action: "recordEvidence", text: rest } as HarnessParamsType);
				break;
			case "check": {
				const parsed = parseCheckArgs(rest);
				output = await handleHarness(root, { action: "recordCheck", ...parsed } as HarnessParamsType);
				break;
			}
			case "note":
				output = await handleHarness(root, { action: "recordNote", text: rest } as HarnessParamsType);
				break;
			case "idea":
				output = await handleHarness(root, { action: "appendIdea", text: rest } as HarnessParamsType);
				break;
			case "contract":
				output = await handleHarness(root, { action: "updateContract", text: rest } as HarnessParamsType);
				break;
			case "plan":
				output = await handleHarness(root, { action: "updatePlan", text: rest } as HarnessParamsType);
				break;
			case "goal":
				if (!rest || rest === "status") output = await handleHarness(root, { action: "goalStatus" } as HarnessParamsType);
				else if (["clear", "stop", "off", "reset", "none", "cancel"].includes(rest.toLowerCase())) output = await handleHarness(root, { action: "clearGoal" } as HarnessParamsType);
				else if (rest.toLowerCase().startsWith("achieved") || rest.toLowerCase().startsWith("done")) {
					output = await handleHarness(root, { action: "achieveGoal", text: rest.replace(/^(achieved|done)\s*/i, "") } as HarnessParamsType);
				} else {
					output = await handleHarness(root, { action: "setGoal", text: rest } as HarnessParamsType);
					const goal = await readGoal(root);
					if (goal?.status === "active") goalKickoff = goalFollowUpPrompt(goal);
				}
				break;
			case "summary":
				output = await handleHarness(root, { action: "summary" } as HarnessParamsType);
				break;
			case "rebuild-summary":
				output = await handleHarness(root, { action: "rebuildSummary" } as HarnessParamsType);
				break;
			case "report":
				output = await handleHarness(root, { action: "report", text: rest || undefined } as HarnessParamsType);
				break;
			case "remember":
				output = await handleHarness(root, { action: "remember", text: rest } as HarnessParamsType);
				break;
			case "recall":
				output = await handleHarness(root, { action: "recall", text: rest || undefined } as HarnessParamsType);
				break;
			case "forget":
				output = await handleHarness(root, { action: "forget", text: rest } as HarnessParamsType);
				break;
			case "reflect":
				output = await handleHarness(root, { action: "reflect", text: rest || undefined } as HarnessParamsType);
				break;
			case "reflect-ai": {
				const target = rest || "active task";
				const modelLabel = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "fallback model";
				ctx.ui.setWidget(HARNESS_COMMAND_OUTPUT_WIDGET, [
					`pi-harness: reflect-ai analyzing ${target}...`,
					`model: ${modelLabel}`,
					"This can take a moment. Result will open in a scrollable panel.",
				], { placement: "aboveEditor" });
				ctx.ui.notify("pi-harness reflect-ai: analyzing task", "info");
				output = await reflectOnTaskWithModel(ctx, root, rest || undefined);
				output = await showReflectAiApproval(ctx, root, output) ?? output;
				break;
			}
			case "memory-candidates":
				output = await handleHarness(root, { action: "memoryCandidates", text: rest || undefined } as HarnessParamsType);
				break;
			case "memory-audit":
				output = await handleHarness(root, { action: "memoryAudit" } as HarnessParamsType);
				break;
			case "memory-dedupe":
				output = await handleHarness(root, { action: "memoryDedupe" } as HarnessParamsType);
				break;
			case "improve-report":
				output = await handleHarness(root, { action: "improveReport" } as HarnessParamsType);
				break;
			default:
				output = commandHelp();
		}
		if (await exists(path.join(harnessPath(root), "index.json"))) await refreshHarnessUi(ctx, root);
		const approvalSummary = cmd === "reflect-ai" && !output.startsWith("# AI Reflection");
		if (shouldUseOutputViewer(cmd, output) && !approvalSummary) {
			ctx.ui.setWidget(HARNESS_COMMAND_OUTPUT_WIDGET, undefined);
			await showOutputViewer(ctx, `pi-harness: ${cmd}`, output);
		} else {
			ctx.ui.setWidget(HARNESS_COMMAND_OUTPUT_WIDGET, commandOutputLines(output), { placement: "aboveEditor" });
		}

		// Clear the widget automatically at the start of the next turn.
		// Register once for the whole extension to avoid piling up listeners.
		if (!turnStartCleanupHookInstalled) {
			turnStartCleanupHookInstalled = true;
			pi.on("turn_start", async (_event, turnCtx) => {
				clearHarnessCommandOutput(turnCtx);
			});
		}

		ctx.ui.notify(`pi-harness: ${cmd}`, "info");
		if (goalKickoff) {
			if (ctx.isIdle()) pi.sendUserMessage(goalKickoff);
			else pi.sendUserMessage(goalKickoff, { deliverAs: "followUp" });
		}
	} catch (error) {
		ctx.ui.notify(`pi-harness error: ${error instanceof Error ? error.message : String(error)}`, "error");
	}
}

export default function piHarness(pi: ExtensionAPI) {
	pi.registerCommand("harness", {
		description: "Project harness: durable context, PREVC tasks, goals, evidence, and reports",
		getArgumentCompletions: (prefix) => {
			const commands = ["init", "status", "tasks", "tasks-ui", "context", "task", "phase", "advance", "done", "close", "decision", "evidence", "check", "note", "idea", "contract", "plan", "goal", "summary", "rebuild-summary", "report", "remember", "recall", "forget", "reflect", "reflect-ai", "memory-candidates", "memory-audit", "memory-dedupe", "improve-report", "help"];
			const filtered = commands.filter((cmd) => cmd.startsWith(prefix.trim()));
			return filtered.length ? filtered.map((cmd) => ({ value: cmd, label: cmd })) : null;
		},
		handler: async (args, ctx) => runCommand(pi, args, ctx),
	});

	pi.registerTool({
		name: "harness",
		label: "Harness",
		description: "Manage project-local pi-harness files: context, PREVC workflow, goals, decisions, evidence/checks, notes, ideas, summaries, and reports.",
		promptSnippet: "Manage durable project context, PREVC task workflow, and verifiable goals via .pi/harness",
		promptGuidelines: [
			"Use harness for non-trivial tasks to create or inspect project context, start a task, track PREVC phase, record decisions, call updatePlan/updateContract for plans/contracts, manage active goals, and record validation evidence.",
			"Use harness recordNote for operational handoffs/lessons and appendIdea for promising follow-up ideas that should survive context resets.",
			"Use harness remember to persist learnings (format: 'type: content'). Use recall to retrieve memories. Use reflect at task end to surface candidates.",
			"Never put API keys, tokens, passwords, cookies, OAuth material, or authentication secrets into harness records.",
		],
		parameters: HarnessParams,
		async execute(_toolCallId, params: HarnessParamsType, _signal, onUpdate, ctx) {
			onUpdate?.({ content: [{ type: "text", text: `pi-harness ${params.action}...` }], details: {} });
			const root = await resolveProjectRoot(ctx.cwd);
			try {
				const output = await handleHarness(root, params);
				if (await exists(path.join(harnessPath(root), "index.json"))) await refreshHarnessUi(ctx, root);
				return { content: [{ type: "text", text: output }], details: { root, action: params.action } };
			} catch (error) {
				return {
					content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
					details: { root, action: params.action, error: String(error) },
					isError: true,
				};
			}
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		const root = await resolveProjectRoot(ctx.cwd);
		if (await exists(path.join(harnessPath(root), "index.json"))) await refreshHarnessUi(ctx, root);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setStatus(HARNESS_STATUS_WIDGET, undefined);
		ctx.ui.setWidget(HARNESS_STATUS_WIDGET, undefined);
		clearHarnessCommandOutput(ctx);
	});

	pi.on("session_before_compact", async (_event, ctx) => {
		const root = await resolveProjectRoot(ctx.cwd);
		if (!(await exists(path.join(harnessPath(root), "index.json")))) return;
		await rebuildSummary(root);
	});

	pi.on("agent_end", async (_event, ctx) => {
		await processGoalAfterAgent(pi, ctx);
	});

	pi.on("before_agent_start", async (event, ctx) => {
		const root = await resolveProjectRoot(ctx.cwd);
		if (!(await exists(path.join(harnessPath(root), "index.json")))) return;
		const context = await buildLeanContext(root);
		const active = await getActiveTask(root);
		const goal = active ? await readGoal(root, active) : undefined;
		const goalInstructions = goal?.status === "active"
			? `\n\n# pi-harness active goal\n\nCondition: ${goal.condition}\nProgress: ${goal.turns}/${goal.maxTurns} evaluated turns\nLast evaluator reason: ${goal.lastEvaluatorReason ?? "none yet"}\n\nWork toward this condition until it is verifiably satisfied or the budget is reached. Surface proof in the conversation, record validation evidence with harness({ action: "recordEvidence", text: ... }), then mark success with harness({ action: "achieveGoal", text: "evidence summary" }).`
			: "";
		return {
			systemPrompt: `${event.systemPrompt}\n\n# pi-harness lean project context\n\n${context}${goalInstructions}\n\n# pi-harness operating rules\n\n- Treat .pi/harness as durable, project-local memory/workflow state; call harness({ action: "readContext" }) only when the lean context is insufficient.\n- For non-trivial tasks, keep an active harness task; call harness({ action: "updatePlan", text: ... }) or harness({ action: "updateContract", text: ... }) when scope changes; record validation evidence before final confirmation.\n- Record durable decisions with harness({ action: "recordDecision", text: ... }); use harness({ action: "recordNote", text: ... }) for handoffs/lessons and harness({ action: "appendIdea", text: ... }) for deferred ideas.\n- Never store secrets, tokens, cookies, OAuth material, private keys, or auth data in harness files.`,
		};
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName === "harness") return;
		const root = await resolveProjectRoot(ctx.cwd);
		if (!(await exists(path.join(harnessPath(root), "index.json")))) return;
		await appendTrace(root, {
			type: "tool_call",
			toolName: event.toolName,
			input: summarizeToolInput(event.toolName, event.input),
		});
		await recordPhaseActionNotice(root, event.toolName, event.input);
		// Auto-infer phase → E only for clear mutations. Read-only bash can be planning/review/validation.
		if (event.toolName === "edit" || event.toolName === "write" || (event.toolName === "bash" && isLikelyMutatingShellCommand(shellCommandFromInput(event.input) ?? ""))) {
			await autoInferPhase(root, "E");
		}
	});

	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName === "harness") return;
		const root = await resolveProjectRoot(ctx.cwd);
		if (!(await exists(path.join(harnessPath(root), "index.json")))) return;
		await appendTrace(root, {
			type: "tool_result",
			toolName: event.toolName,
			isError: Boolean(event.isError),
		});
	});
}
