import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type, type Static } from "typebox";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const VERSION = "0.1.0";
const HARNESS_DIR = path.join(".pi", "harness");
const PHASES = ["P", "R", "E", "V", "C"] as const;
const PHASE_LABELS: Record<Phase, string> = {
	P: "Planning",
	R: "Review",
	E: "Execution",
	V: "Validation",
	C: "Confirmation",
};

type Phase = (typeof PHASES)[number];

type HarnessStatus = "active" | "paused" | "done";

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
		Type.Literal("init"),
		Type.Literal("startTask"),
		Type.Literal("setPhase"),
		Type.Literal("advancePhase"),
		Type.Literal("recordDecision"),
		Type.Literal("recordEvidence"),
		Type.Literal("readContext"),
		Type.Literal("writeProjectContext"),
		Type.Literal("writePolicy"),
		Type.Literal("report"),
	], { description: "Harness action to run." }),
	title: Type.Optional(Type.String({ description: "Task title for startTask." })),
	text: Type.Optional(Type.String({ description: "Text for decisions, evidence, project context, policy, or report note." })),
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
	index.activeTaskId = task.id;
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
	if (next === "C" && task.phase === "C") task.status = "active";
	task.updatedAt = now();
	await saveTask(root, task);
	await appendTrace(root, { type: "phase_advance", taskId: task.id, phase: next });
	return task;
}

async function appendTrace(root: string, event: Record<string, unknown>): Promise<void> {
	const task = await getActiveTask(root);
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

async function recordDecision(root: string, text: string): Promise<void> {
	await ensureHarness(root);
	await appendText(path.join(harnessPath(root), "decisions.md"), `\n## ${now()}\n\n${text}\n`);
	await appendTrace(root, { type: "decision", text: redact(text) });
}

async function recordEvidence(root: string, text: string): Promise<void> {
	const task = await getActiveTask(root);
	if (!task) throw new Error("No active task. Use startTask first.");
	await appendText(path.join(taskDir(root, task), "evidence.md"), `\n## ${now()}\n\n${text}\n`);
	await appendTrace(root, { type: "evidence", text: redact(text) });
}

function truncate(value: string, max = 4000): string {
	return value.length <= max ? value : `${value.slice(0, max)}\n\n[truncated ${value.length - max} chars]`;
}

async function buildContext(root: string): Promise<string> {
	const index = await loadIndex(root);
	const active = await getActiveTask(root);
	const dir = harnessPath(root);
	const project = truncate(await readText(path.join(dir, "project.md")), 2500);
	const policies = truncate(await readText(path.join(dir, "policies.md")), 2000);
	const decisions = truncate(await readText(path.join(dir, "decisions.md")), 2500);
	let taskFiles = "";
	if (active) {
		const dir = taskDir(root, active);
		taskFiles = [
			`# Active Task\n- ${active.title}\n- Phase: ${active.phase} (${PHASE_LABELS[active.phase]})\n- Status: ${active.status}`,
			truncate(await readText(path.join(dir, "contract.md")), 2000),
			truncate(await readText(path.join(dir, "plan.md")), 2000),
			truncate(await readText(path.join(dir, "evidence.md")), 2000),
		].filter(Boolean).join("\n\n");
	}
	return [
		`pi-harness v${VERSION}`,
		`Root: ${root}`,
		`Tasks: ${index.tasks.length}`,
		project,
		policies,
		decisions,
		taskFiles,
	].filter(Boolean).join("\n\n---\n\n");
}

async function buildStatus(root: string): Promise<string> {
	if (!(await exists(path.join(harnessPath(root), "index.json")))) {
		return `pi-harness is not initialized in ${root}. Run /harness init or call harness({ action: "init" }).`;
	}
	const index = await loadIndex(root);
	const active = await getActiveTask(root);
	const lines = [`pi-harness v${VERSION}`, `Root: ${root}`, `Tasks: ${index.tasks.length}`];
	if (active) lines.push(`Active: ${active.title} [${active.phase} ${PHASE_LABELS[active.phase]}] ${active.status}`);
	else lines.push("Active: none");
	return lines.join("\n");
}

async function generateReport(root: string, note?: string): Promise<string> {
	const task = await getActiveTask(root);
	const status = await buildStatus(root);
	const report = [`# Harness Report`, "", status, ""];
	if (note) report.push("## Note", "", note, "");
	if (task) {
		const dir = taskDir(root, task);
		report.push("## Contract", "", truncate(await readText(path.join(dir, "contract.md")), 3000), "");
		report.push("## Plan", "", truncate(await readText(path.join(dir, "plan.md")), 3000), "");
		report.push("## Evidence", "", truncate(await readText(path.join(dir, "evidence.md")), 3000), "");
		const output = report.join("\n");
		await writeText(path.join(dir, "report.md"), output);
		return output;
	}
	return report.join("\n");
}

async function handleHarness(root: string, params: HarnessParamsType): Promise<string> {
	switch (params.action) {
		case "init":
			await ensureHarness(root);
			return await buildStatus(root);
		case "status":
			return await buildStatus(root);
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
		case "recordDecision":
			if (!params.text) throw new Error("text is required for recordDecision");
			await recordDecision(root, params.text);
			return "Decision recorded.";
		case "recordEvidence":
			if (!params.text) throw new Error("text is required for recordEvidence");
			await recordEvidence(root, params.text);
			return "Evidence recorded.";
		case "readContext":
			await ensureHarness(root);
			return await buildContext(root);
		case "writeProjectContext":
			if (!params.text) throw new Error("text is required for writeProjectContext");
			await ensureHarness(root);
			await writeText(path.join(harnessPath(root), "project.md"), params.text);
			return "Project context updated.";
		case "writePolicy":
			if (!params.text) throw new Error("text is required for writePolicy");
			await ensureHarness(root);
			await writeText(path.join(harnessPath(root), "policies.md"), params.text);
			return "Policies updated.";
		case "report":
			await ensureHarness(root);
			return await generateReport(root, params.text);
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
		"  context                      show injected context summary",
		"  task <title>                 start a task in phase P",
		"  phase <P|R|E|V|C>            set active task phase",
		"  advance                      advance active task phase",
		"  decision <text>              record durable decision",
		"  evidence <text>              record validation evidence",
		"  report [note]                generate active task report",
	].join("\n");
}

async function runCommand(pi: ExtensionAPI, args: string, ctx: ExtensionContext): Promise<void> {
	const root = await resolveProjectRoot(ctx.cwd);
	const trimmed = args.trim();
	const [cmdRaw, ...restParts] = trimmed.split(/\s+/);
	const cmd = cmdRaw || "status";
	const rest = restParts.join(" ").trim();
	let output: string;
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
			case "context":
				output = await handleHarness(root, { action: "readContext" } as HarnessParamsType);
				break;
			case "task":
				output = await handleHarness(root, { action: "startTask", title: rest } as HarnessParamsType);
				break;
			case "phase":
				output = await handleHarness(root, { action: "setPhase", phase: rest.toUpperCase() } as HarnessParamsType);
				break;
			case "advance":
				output = await handleHarness(root, { action: "advancePhase" } as HarnessParamsType);
				break;
			case "decision":
				output = await handleHarness(root, { action: "recordDecision", text: rest } as HarnessParamsType);
				break;
			case "evidence":
				output = await handleHarness(root, { action: "recordEvidence", text: rest } as HarnessParamsType);
				break;
			case "report":
				output = await handleHarness(root, { action: "report", text: rest || undefined } as HarnessParamsType);
				break;
			default:
				output = commandHelp();
		}
		ctx.ui.setWidget("pi-harness", output.split("\n").slice(0, 80));
		ctx.ui.notify(`pi-harness: ${cmd}`, "info");
		pi.sendMessage({ customType: "pi-harness", content: output, display: true }, { deliverAs: "nextTurn" });
	} catch (error) {
		ctx.ui.notify(`pi-harness error: ${error instanceof Error ? error.message : String(error)}`, "error");
	}
}

export default function piHarness(pi: ExtensionAPI) {
	pi.registerCommand("harness", {
		description: "Project harness: durable context, PREVC tasks, evidence, and reports",
		getArgumentCompletions: (prefix) => {
			const commands = ["init", "status", "context", "task", "phase", "advance", "decision", "evidence", "report", "help"];
			const filtered = commands.filter((cmd) => cmd.startsWith(prefix.trim()));
			return filtered.length ? filtered.map((cmd) => ({ value: cmd, label: cmd })) : null;
		},
		handler: async (args, ctx) => runCommand(pi, args, ctx),
	});

	pi.registerTool({
		name: "harness",
		label: "Harness",
		description: "Manage project-local pi-harness files: context, PREVC workflow, decisions, evidence, and reports.",
		promptSnippet: "Manage durable project context and PREVC task workflow via .pi/harness",
		promptGuidelines: [
			"Use harness for non-trivial tasks to create or inspect project context, start a task, track PREVC phase, record decisions, and record validation evidence.",
			"Never put API keys, tokens, passwords, cookies, OAuth material, or authentication secrets into harness records.",
		],
		parameters: HarnessParams,
		async execute(_toolCallId, params: HarnessParamsType, _signal, onUpdate, ctx) {
			onUpdate?.({ content: [{ type: "text", text: `pi-harness ${params.action}...` }] });
			const root = await resolveProjectRoot(ctx.cwd);
			try {
				const output = await handleHarness(root, params);
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
		if (await exists(path.join(harnessPath(root), "index.json"))) {
			ctx.ui.setStatus("pi-harness", "harness:on");
			const status = await buildStatus(root);
			ctx.ui.setWidget("pi-harness", status.split("\n"));
		}
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setStatus("pi-harness", undefined);
		ctx.ui.setWidget("pi-harness", undefined);
	});

	pi.on("before_agent_start", async (event, ctx) => {
		const root = await resolveProjectRoot(ctx.cwd);
		if (!(await exists(path.join(harnessPath(root), "index.json")))) return;
		const context = truncate(await buildContext(root), 9000);
		return {
			systemPrompt: `${event.systemPrompt}\n\n# pi-harness project context\n\n${context}\n\n# pi-harness operating rules\n\n- Treat .pi/harness as durable, project-local memory and workflow state.\n- For non-trivial tasks, ensure there is an active harness task before major edits.\n- Record important decisions with harness({ action: "recordDecision", text: ... }).\n- Record validation evidence with harness({ action: "recordEvidence", text: ... }) before final confirmation.\n- Do not store secrets or authentication data in harness files.`,
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
