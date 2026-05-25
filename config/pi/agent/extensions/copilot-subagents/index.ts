/**
 * Copilot Subagents Extension
 *
 * Amp-style subagent layer for GitHub Copilot workflows.
 *
 * Roles mirror Amp's public model architecture:
 *   search    → fast codebase retrieval / context scout
 *   oracle    → complex reasoning and planning on code
 *   review    → bug identification and code review assistance
 *   librarian → large-scale external/library research
 *   handoff   → compact continuation context analysis
 *
 * Each subagent runs in an isolated `pi` subprocess with its own context window.
 * The parent session receives only a compact result, keeping noisy retrieval,
 * logs, and review exploration out of the main context.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const COPILOT_PROVIDER = "github-copilot";
const STATE_TYPE = "copilot-subagents-state";
const SEARCH_BRIEF_TYPE = "copilot-subagents-search";

const MAX_PROMPT_CHARS = 32 * 1024;
const MAX_RESULT_CHARS = 24 * 1024;
const AUTO_SEARCH_MAX_CHARS = 12 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;
const AUTO_SEARCH_TIMEOUT_MS = 30_000;
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const MAX_PARALLEL_TASKS = 5;
const MAX_CHAIN_STEPS = 5;

type AgentName = "search" | "oracle" | "review" | "librarian" | "handoff";
type SubagentMode = "single" | "parallel" | "chain" | "auto-search";

interface AgentDefinition {
	name: AgentName;
	label: string;
	description: string;
	model: string;
	tools: string[];
	timeoutMs: number;
	systemPrompt: string;
}

interface RunResult {
	agent: AgentName;
	task: string;
	model: string;
	exitCode: number;
	output: string;
	stderr: string;
	durationMs: number;
}

interface RecentRun {
	key: string;
	timestamp: number;
}

interface SubagentsConfig {
	enabled: boolean;
	autoSearch: boolean;
}

const AGENTS: Record<AgentName, AgentDefinition> = {
	search: {
		name: "search",
		label: "Search",
		description: "Fast codebase retrieval and compressed context scouting.",
		model: "github-copilot/gemini-3-flash-preview:low",
		tools: ["read", "grep", "find", "ls"],
		timeoutMs: AUTO_SEARCH_TIMEOUT_MS,
		systemPrompt: `You are Copilot Search, an Amp-style codebase retrieval subagent.

Your job is to find the minimum useful code context for the parent agent.
You are read-only. Do not implement, edit, or write files.
Use deterministic tools first: find, grep, ls, read.
Prefer precise paths, symbols, line ranges, and short evidence over broad summaries.
Stop when you have enough context for another agent to act.

Return Markdown with exactly this shape:

# Copilot Search Brief

## Task
One sentence summary.

## Relevant files
- \`path\` — why it matters

## Key facts
- Fact backed by a path/line reference where possible.

## Snippets
### \`path:start-end\`
\`\`\`text
Short snippet or concise summary.
\`\`\`

## Likely next reads
- \`path:start-end\`

## Non-relevant / skipped
- \`path\` — reason

## Confidence
low|medium|high`,
	},
	oracle: {
		name: "oracle",
		label: "Oracle",
		description: "Deep code reasoning, planning, and second-opinion analysis.",
		model: "github-copilot/gpt-5.4:high",
		tools: ["read", "grep", "find", "ls", "bash"],
		timeoutMs: DEFAULT_TIMEOUT_MS,
		systemPrompt: `You are Copilot Oracle, an Amp-style reasoning subagent.

Your job is to think deeply about hard code questions before the parent edits anything.
You are advisory by default. Do not edit or write files.
Use tools for inspection and verification only.
Challenge assumptions, identify missing constraints, and recommend the safest next move.

Output Markdown with this shape:

# Oracle Recommendation

## Diagnosis
- What is actually going on.

## Evidence
- Concrete code facts with paths/line ranges.

## Options
- Option A: tradeoffs.
- Option B: tradeoffs.

## Recommendation
- Best next move and why.

## Risks
- What could still go wrong.

## Suggested execution prompt
A compact prompt the parent can give to an implementation agent, or "No implementation handoff recommended."`,
	},
	review: {
		name: "review",
		label: "Review",
		description: "Bug identification and code review assistance.",
		model: "github-copilot/gemini-3.1-pro-preview:medium",
		tools: ["read", "grep", "find", "ls", "bash"],
		timeoutMs: DEFAULT_TIMEOUT_MS,
		systemPrompt: `You are Copilot Review, an Amp-style code review subagent.

Your job is to find concrete bugs, regressions, missing tests, and unnecessary complexity.
You are review-only. Do not edit or write files.
Inspect the relevant diff/files/tests directly when possible.
Every finding must cite evidence. Avoid generic advice.

Output Markdown with this shape:

# Review Findings

## Blockers
- [severity] \`path:line\` — issue, impact, smallest fix.

## Non-blocking issues
- [severity] \`path:line\` — issue, impact, smallest fix.

## Tests / validation gaps
- Gap and suggested validation.

## Things that look okay
- Important checked areas with no issue found.

## Verdict
block|revise|pass`,
	},
	librarian: {
		name: "librarian",
		label: "Librarian",
		description: "Large-scale retrieval and research on external/library code.",
		model: "github-copilot/claude-sonnet-4.6:medium",
		tools: ["read", "grep", "find", "ls", "bash", "web_search", "fetch_content", "get_search_content"],
		timeoutMs: 90_000,
		systemPrompt: `You are Copilot Librarian, an Amp-style research subagent.

Your job is to research external libraries, docs, APIs, and upstream code, then return a compact evidence-backed brief.
Use web/search/fetch tools when available. Prefer primary sources and exact links.
Use local repo tools only to connect external facts to this project.
Do not edit or write files.

Output Markdown with this shape:

# Librarian Brief

## Question
- What was researched.

## Findings
- Evidence-backed finding with source URL or local path.

## Source notes
- Strongest sources and why they matter.

## Local implications
- How this affects the current codebase/task.

## Uncertainties
- Missing or conflicting evidence.

## Recommended next move
- Practical next action.`,
	},
	handoff: {
		name: "handoff",
		label: "Handoff",
		description: "Fallback context analysis for task continuation.",
		model: "github-copilot/gemini-3-flash-preview:low",
		tools: ["read", "grep", "find", "ls", "bash"],
		timeoutMs: DEFAULT_TIMEOUT_MS,
		systemPrompt: `You are Copilot Handoff, an Amp-style continuation subagent.

Your job is to reconstruct the current task state for continuation without bloating the parent context.
Summarize durable decisions, touched files, validation evidence, unresolved risks, and the next safest action.
Do not edit or write files.

Output Markdown with this shape:

# Handoff Brief

## Current objective
- One sentence.

## Decisions and constraints
- Durable decisions the next agent must preserve.

## Relevant files and state
- \`path\` — what changed or matters.

## Validation evidence
- Commands/results already known, or "not run".

## Open questions / risks
- Items that still need attention.

## Next actions
1. Concrete next step.
2. Validation step.

## Continuation prompt
A compact prompt for continuing this task.`,
	},
};

const IMAGE_PATTERN = /(?:^|\s|@|[\w./-]*\/)[\w./-]+\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico|avif)\b/i;
const CLIPBOARD_IMAGE_PATTERN = /\/tmp\/pi-clipboard-[a-f0-9-]+\.(png|jpg|jpeg|gif|webp)/i;
const FILE_PATTERN = /(?:^|\s|@)(?:[\w.-]+\/)*[\w.-]+\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|cpp|c|h|rb|php|sh|yaml|yml|json|toml|sql|md|vue|svelte)\b/gi;
const STACK_OR_LOG_PATTERN = /(stack trace|traceback|exception|error:|failed|failing|panic:|segmentation fault|npm ERR!|tests? failed|falhou|erro)/i;

const CODEBASE_INTENT = [
	"corrija", "corrigir", "fix", "debug", "depurar", "diagnosticar", "diagnose",
	"implemente", "implementar", "implement", "add feature", "adicione", "crie", "criar",
	"refatore", "refatorar", "refactor", "investigue", "investigar", "investigate",
	"analise", "analisar", "análise", "analyze", "analysis", "audite", "auditar", "audit",
	"codebase", "base de código", "codigo legado", "código legado", "legada", "legado", "legacy",
	"entenda", "entender", "entenda o fluxo", "understand", "understand the flow",
	"mapear", "mapeie", "map", "overview", "visão geral", "visao geral",
	"onde está", "onde fica", "where is", "ache", "achar", "find", "search", "procure", "procurar",
	"review", "revisar", "melhore", "melhorar", "rode testes", "run tests", "arquitetura", "architecture",
];

const DISCUSSION_PATTERNS = [
	/tive uma ideia/i,
	/o que (vc|você) acha/i,
	/what do you think/i,
	/vamos pensar/i,
	/brainstorm/i,
	/conversar/i,
	/s[óo] discutir/i,
	/sem implementar/i,
	/n[aã]o (mexe|alterar|edite|editar|implemente)/i,
	/planejar conceitualmente/i,
	/me ajuda a decidir/i,
	/grill me/i,
	/grill/i,
];

const CONTINUATION_PATTERNS = [
	/^(continua|continue|segue|go on|vai|pr[óo]ximo|next|ok|okay|faz isso|do it|sim|yes|feito|done|pode|beleza)\.?$/i,
];

function truncate(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text;
	return `${text.slice(0, maxChars - 220)}\n\n## Truncation note\nSubagent output was truncated to ${maxChars} characters. Ask the subagent a narrower follow-up if more detail is needed.`;
}

function normalizePrompt(prompt: string): string {
	return prompt
		.toLowerCase()
		.replace(/`{3}[\s\S]*?`{3}/g, " codeblock ")
		.replace(/\s+/g, " ")
		.replace(/[^\p{L}\p{N}/_. -]/gu, "")
		.trim()
		.slice(0, 240);
}

function hasInlineOptOut(prompt: string): boolean {
	return /^\s*(sem scout|no scout|sem search|no search)\s*:/i.test(prompt)
		|| /\b(sem scout|no scout|sem search|no search)\b/i.test(prompt);
}

function hasImages(prompt: string, images?: unknown[]): boolean {
	return Boolean(images && Array.isArray(images) && images.length > 0)
		|| IMAGE_PATTERN.test(prompt)
		|| CLIPBOARD_IMAGE_PATTERN.test(prompt);
}

function isContinuation(prompt: string): boolean {
	const trimmed = prompt.trim();
	if (trimmed.length > 45) return false;
	return CONTINUATION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isDiscussion(prompt: string): boolean {
	return DISCUSSION_PATTERNS.some((pattern) => pattern.test(prompt));
}

function explicitFiles(prompt: string): string[] {
	return Array.from(prompt.matchAll(FILE_PATTERN)).map((match) => match[0].trim().replace(/^@/, ""));
}

function includesAny(text: string, keywords: string[]): boolean {
	const lower = text.toLowerCase();
	return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function getRecentUserText(ctx: ExtensionContext, maxEntries = 8): string {
	const entries = ctx.sessionManager.getEntries().slice(-maxEntries) as Array<{ type?: string; message?: { role?: string; content?: unknown[] } }>;
	const parts: string[] = [];
	for (const entry of entries) {
		if (entry.type !== "message" || entry.message?.role !== "user" || !Array.isArray(entry.message.content)) continue;
		for (const part of entry.message.content) {
			if (part && typeof part === "object" && "text" in part) {
				parts.push(String((part as { text?: unknown }).text ?? ""));
			}
		}
	}
	return parts.join("\n").slice(-4000);
}

function decideAutoSearch(prompt: string, images: unknown[] | undefined, ctx: ExtensionContext): { shouldSearch: boolean; reason: string } {
	if (!ctx.model || ctx.model.provider !== COPILOT_PROVIDER) return { shouldSearch: false, reason: "provider is not github-copilot" };
	if (hasInlineOptOut(prompt)) return { shouldSearch: false, reason: "inline opt-out" };
	if (hasImages(prompt, images)) return { shouldSearch: false, reason: "image prompt handled by router" };
	if (isContinuation(prompt)) return { shouldSearch: false, reason: "continuation prompt" };
	if (isDiscussion(prompt)) return { shouldSearch: false, reason: "idea/discussion prompt" };
	if (prompt.trim().length < 40 && !STACK_OR_LOG_PATTERN.test(prompt)) return { shouldSearch: false, reason: "short prompt" };

	const files = explicitFiles(prompt);
	if (files.length > 0 && files.length <= 2) return { shouldSearch: false, reason: "explicit file(s) provided" };

	const recent = getRecentUserText(ctx);
	const combined = `${prompt}\n${recent}`;
	if (STACK_OR_LOG_PATTERN.test(prompt) && files.length === 0) return { shouldSearch: true, reason: "error/log without explicit file" };
	if (includesAny(combined, CODEBASE_INTENT) && files.length === 0) return { shouldSearch: true, reason: "codebase task needs discovery" };
	if (files.length > 2 && includesAny(prompt, CODEBASE_INTENT)) return { shouldSearch: true, reason: "many explicit files need triage" };

	return { shouldSearch: false, reason: "no codebase discovery signal" };
}

async function writeTempPrompt(agent: AgentDefinition, task: string): Promise<{ dir: string; systemPath: string; taskPath: string }> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-copilot-subagent-"));
	const systemPath = path.join(dir, `${agent.name}-system.md`);
	const taskPath = path.join(dir, `${agent.name}-task.md`);
	await fs.writeFile(systemPath, agent.systemPrompt, "utf8");
	await fs.writeFile(taskPath, `# Subagent Task\n\n${task.slice(0, MAX_PROMPT_CHARS)}\n`, "utf8");
	return { dir, systemPath, taskPath };
}

async function runAgent(cwd: string, agentName: AgentName, task: string, options: { timeoutMs?: number; maxChars?: number } = {}): Promise<RunResult> {
	const agent = AGENTS[agentName];
	const startedAt = Date.now();
	const { dir, systemPath, taskPath } = await writeTempPrompt(agent, task);
	try {
		const args = [
			"--print",
			"--no-session",
			...(agentName === "librarian" ? [] : ["--no-extensions"]),
			"--no-skills",
			"--no-prompt-templates",
			"--no-themes",
			"--no-context-files",
			"--model", agent.model,
			"--tools", agent.tools.join(","),
			"--append-system-prompt", systemPath,
			`@${taskPath}`,
		];

		const timeoutMs = options.timeoutMs ?? agent.timeoutMs;
		const maxChars = options.maxChars ?? MAX_RESULT_CHARS;

		return await new Promise<RunResult>((resolve, reject) => {
			const child = spawn("pi", args, {
				cwd,
				stdio: ["ignore", "pipe", "pipe"],
				env: { ...process.env, COPILOT_SUBAGENT_CHILD: "1" },
			});
			let stdout = "";
			let stderr = "";
			let settled = false;

			const timeout = setTimeout(() => {
				if (settled) return;
				settled = true;
				child.kill("SIGTERM");
				reject(new Error(`${agentName} timed out after ${timeoutMs}ms`));
			}, timeoutMs);

			child.stdout.on("data", (chunk) => {
				stdout += String(chunk);
				if (stdout.length > maxChars * 3) stdout = stdout.slice(-maxChars * 3);
			});
			child.stderr.on("data", (chunk) => {
				stderr += String(chunk);
				if (stderr.length > 8000) stderr = stderr.slice(-8000);
			});
			child.on("error", (error) => {
				if (settled) return;
				settled = true;
				clearTimeout(timeout);
				reject(error);
			});
			child.on("close", (code) => {
				if (settled) return;
				settled = true;
				clearTimeout(timeout);
				const output = truncate(stdout.trim(), maxChars);
				resolve({
					agent: agentName,
					task,
					model: agent.model,
					exitCode: code ?? 0,
					output,
					stderr,
					durationMs: Date.now() - startedAt,
				});
			});
		});
	} finally {
		await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
	}
}

async function mapWithConcurrencyLimit<TIn, TOut>(items: TIn[], limit: number, fn: (item: TIn, index: number) => Promise<TOut>): Promise<TOut[]> {
	const results: TOut[] = new Array(items.length);
	let next = 0;
	const workers = new Array(Math.max(1, Math.min(limit, items.length))).fill(null).map(async () => {
		while (true) {
			const index = next++;
			if (index >= items.length) return;
			results[index] = await fn(items[index], index);
		}
	});
	await Promise.all(workers);
	return results;
}

function formatResult(result: RunResult): string {
	const status = result.exitCode === 0 ? "completed" : `failed (exit ${result.exitCode})`;
	let text = `## ${AGENTS[result.agent].label} — ${status}\n\n`;
	text += `Model: \`${result.model}\` · ${Math.round(result.durationMs / 1000)}s\n\n`;
	if (result.output) text += result.output;
	if (result.exitCode !== 0 && result.stderr) text += `\n\n### stderr\n\`\`\`text\n${truncate(result.stderr, 4000)}\n\`\`\``;
	return text;
}

function exactOneMode(single: boolean, parallel: boolean, chain: boolean): boolean {
	return [single, parallel, chain].filter(Boolean).length === 1;
}

const AgentEnum = Type.String({ enum: Object.keys(AGENTS), description: "Subagent role: search, oracle, review, librarian, or handoff." });
const TaskItem = Type.Object({
	agent: AgentEnum,
	task: Type.String({ description: "Task for this subagent." }),
});
const ChainItem = Type.Object({
	agent: AgentEnum,
	task: Type.String({ description: "Task for this step. Use {previous} to include the prior step output." }),
});
const SubagentParams = Type.Object({
	agent: Type.Optional(AgentEnum),
	task: Type.Optional(Type.String({ description: "Task for single-agent mode." })),
	tasks: Type.Optional(Type.Array(TaskItem, { description: "Parallel mode: array of {agent, task}." })),
	chain: Type.Optional(Type.Array(ChainItem, { description: "Chain mode: sequential steps with {previous} substitution." })),
	concurrency: Type.Optional(Type.Integer({ minimum: 1, maximum: MAX_PARALLEL_TASKS, description: "Parallel concurrency. Default: 3." })),
});

export default function copilotSubagents(pi: ExtensionAPI) {
	if (process.env.COPILOT_SUBAGENT_CHILD === "1") return;

	let config: SubagentsConfig = { enabled: true, autoSearch: true };
	let recentAutoSearches: RecentRun[] = [];
	let lastReason = "—";
	let lastMode: SubagentMode | "idle" = "idle";
	let lastAgent: AgentName | "—" = "—";
	let lastResultChars = 0;

	function updateStatus(ctx: ExtensionContext) {
		const theme = ctx.ui.theme;
		if (!config.enabled) {
			ctx.ui.setStatus("copilot-subagents", theme.fg("dim", "subagents:off"));
			return;
		}
		const auto = config.autoSearch ? "auto" : "manual";
		ctx.ui.setStatus("copilot-subagents", theme.fg("dim", `sub:${auto}:${lastMode}:${lastAgent}`));
	}

	function rememberState() {
		pi.appendEntry(STATE_TYPE, { enabled: config.enabled, autoSearch: config.autoSearch });
	}

	function isDuplicateAutoSearch(key: string): boolean {
		const now = Date.now();
		recentAutoSearches = recentAutoSearches.filter((item) => now - item.timestamp < DEDUPE_WINDOW_MS);
		return recentAutoSearches.some((item) => item.key === key);
	}

	pi.on("session_start", async (_event, ctx) => {
		for (const entry of ctx.sessionManager.getEntries() as Array<{ type?: string; customType?: string; data?: Partial<SubagentsConfig> }>) {
			if (entry.type === "custom" && entry.customType === STATE_TYPE && entry.data) {
				if (typeof entry.data.enabled === "boolean") config.enabled = entry.data.enabled;
				if (typeof entry.data.autoSearch === "boolean") config.autoSearch = entry.data.autoSearch;
			}
		}
		updateStatus(ctx);
	});

	pi.on("model_select", async (_event, ctx) => updateStatus(ctx));

	pi.on("before_agent_start", async (event, ctx) => {
		if (!config.enabled || !config.autoSearch) return;
		const prompt = event.prompt ?? "";
		const decision = decideAutoSearch(prompt, event.images as unknown[] | undefined, ctx);
		lastReason = decision.reason;
		if (!decision.shouldSearch) {
			lastMode = "idle";
			lastAgent = "—";
			updateStatus(ctx);
			return;
		}

		const key = normalizePrompt(prompt);
		if (isDuplicateAutoSearch(key)) {
			lastReason = "dedupe: similar recent search";
			return;
		}
		recentAutoSearches.push({ key, timestamp: Date.now() });

		lastMode = "auto-search";
		lastAgent = "search";
		updateStatus(ctx);
		ctx.ui.notify("Copilot Search subagent running...", "info");

		try {
			const result = await runAgent(ctx.cwd, "search", prompt, { timeoutMs: AUTO_SEARCH_TIMEOUT_MS, maxChars: AUTO_SEARCH_MAX_CHARS });
			lastResultChars = result.output.length;
			lastReason = `auto-search: ${decision.reason}`;
			updateStatus(ctx);
			return {
				message: {
					customType: SEARCH_BRIEF_TYPE,
					content: result.output || "# Copilot Search Brief\n\n## Confidence\nlow\n",
					display: true,
					details: { agent: result.agent, model: result.model, durationMs: result.durationMs, reason: decision.reason },
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			lastReason = `auto-search failed: ${message.slice(0, 120)}`;
			ctx.ui.notify(`Copilot Search subagent failed: ${message}`, "warning");
			updateStatus(ctx);
		}
	});

	pi.registerTool({
		name: "copilot_subagent",
		label: "Copilot Subagent",
		description: [
			"Delegate work to Amp-style Copilot subagents with isolated context windows.",
			"Roles: search (codebase retrieval), oracle (deep reasoning/planning), review (bug/code review), librarian (external/library research), handoff (continuation context).",
			"Modes: single {agent, task}, parallel {tasks:[...]}, or chain {chain:[...]}. Use for side work that would flood the main context.",
		].join(" "),
		promptSnippet: "Delegate noisy or specialized side work to Amp-style Copilot subagents: search, oracle, review, librarian, handoff.",
		promptGuidelines: [
			"Use copilot_subagent search when codebase retrieval would otherwise flood the main context.",
			"Use copilot_subagent oracle for hard planning/debugging second opinions before editing.",
			"Use copilot_subagent review for evidence-backed code review after changes.",
			"Use copilot_subagent librarian for external docs/library research with sources.",
			"Use copilot_subagent handoff to create compact continuation context.",
		],
		parameters: SubagentParams,
		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			if (!config.enabled) {
				return { content: [{ type: "text", text: "Copilot subagents are disabled. Run /copilot-subagents on to enable." }], details: {} };
			}

			const single = Boolean(params.agent && params.task);
			const parallel = Array.isArray(params.tasks) && params.tasks.length > 0;
			const chain = Array.isArray(params.chain) && params.chain.length > 0;
			if (!exactOneMode(single, parallel, chain)) {
				return {
					content: [{ type: "text", text: "Invalid copilot_subagent call. Provide exactly one mode: {agent, task}, {tasks}, or {chain}." }],
					details: { agents: AGENTS },
				};
			}

			if (single) {
				const agent = params.agent as AgentName;
				lastMode = "single";
				lastAgent = agent;
				updateStatus(ctx);
				onUpdate?.({ content: [{ type: "text", text: `${AGENTS[agent].label} running...` }], details: {} });
				const result = await runAgent(ctx.cwd, agent, String(params.task));
				lastResultChars = result.output.length;
				updateStatus(ctx);
				return {
					content: [{ type: "text", text: formatResult(result) }],
					details: { mode: "single", results: [result] },
					isError: result.exitCode !== 0,
				};
			}

			if (parallel) {
				const tasks = params.tasks as Array<{ agent: AgentName; task: string }>;
				if (tasks.length > MAX_PARALLEL_TASKS) {
					return { content: [{ type: "text", text: `Too many parallel subagents (${tasks.length}). Max is ${MAX_PARALLEL_TASKS}.` }], details: {} };
				}
				lastMode = "parallel";
				lastAgent = "—";
				updateStatus(ctx);
				const concurrency = Math.min(Number(params.concurrency ?? 3), MAX_PARALLEL_TASKS);
				let completed = 0;
				const results = await mapWithConcurrencyLimit(tasks, concurrency, async (taskItem) => {
					const result = await runAgent(ctx.cwd, taskItem.agent, taskItem.task);
					completed++;
					onUpdate?.({ content: [{ type: "text", text: `Copilot subagents: ${completed}/${tasks.length} done...` }], details: {} });
					return result;
				});
				lastResultChars = results.reduce((sum, result) => sum + result.output.length, 0);
				updateStatus(ctx);
				const ok = results.filter((result) => result.exitCode === 0).length;
				return {
					content: [{ type: "text", text: `# Copilot Subagents Parallel Result\n\n${ok}/${results.length} succeeded.\n\n${results.map(formatResult).join("\n\n---\n\n")}` }],
					details: { mode: "parallel", results },
					isError: ok !== results.length,
				};
			}

			const steps = params.chain as Array<{ agent: AgentName; task: string }>;
			if (steps.length > MAX_CHAIN_STEPS) {
				return { content: [{ type: "text", text: `Too many chain steps (${steps.length}). Max is ${MAX_CHAIN_STEPS}.` }], details: {} };
			}
			lastMode = "chain";
			lastAgent = "—";
			updateStatus(ctx);
			const results: RunResult[] = [];
			let previous = "";
			for (let i = 0; i < steps.length; i++) {
				const step = steps[i];
				lastAgent = step.agent;
				updateStatus(ctx);
				onUpdate?.({ content: [{ type: "text", text: `Copilot subagent chain: step ${i + 1}/${steps.length} (${step.agent})...` }], details: {} });
				const task = step.task.replace(/\{previous\}/g, previous);
				const result = await runAgent(ctx.cwd, step.agent, task);
				results.push(result);
				if (result.exitCode !== 0) {
					lastResultChars = results.reduce((sum, item) => sum + item.output.length, 0);
					updateStatus(ctx);
					return {
						content: [{ type: "text", text: `# Copilot Subagents Chain Failed\n\nStopped at step ${i + 1}/${steps.length}.\n\n${results.map(formatResult).join("\n\n---\n\n")}` }],
						details: { mode: "chain", results },
						isError: true,
					};
				}
				previous = result.output;
			}
			lastResultChars = results.reduce((sum, item) => sum + item.output.length, 0);
			updateStatus(ctx);
			return {
				content: [{ type: "text", text: `# Copilot Subagents Chain Result\n\n${results.map(formatResult).join("\n\n---\n\n")}` }],
				details: { mode: "chain", results },
			};
		},
	});

	async function commandHandler(args: string | undefined, ctx: ExtensionContext) {
		const parts = (args ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
		const cmd = parts[0] ?? "status";
		const value = parts[1];

		if (cmd === "status" || cmd === "list") {
			let info = "Copilot Subagents\n\n";
			info += `  Status: ${config.enabled ? "✅ on" : "⏸️ off"}\n`;
			info += `  Auto Search: ${config.autoSearch ? "✅ on" : "⏸️ off"}\n`;
			info += `  Last mode: ${lastMode}\n`;
			info += `  Last agent: ${lastAgent}\n`;
			info += `  Last reason: ${lastReason}\n`;
			info += `  Last result chars: ${lastResultChars}\n\n`;
			info += "  Agents:\n";
			for (const agent of Object.values(AGENTS)) {
				info += `    ${agent.name.padEnd(9)} → ${agent.model} — ${agent.description}\n`;
			}
			info += "\n  Use: /copilot-subagents on|off|status|list|auto on|auto off|reset";
			ctx.ui.notify(info, "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "on") {
			config.enabled = true;
			rememberState();
			ctx.ui.notify("Copilot subagents ativados ✅", "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "off") {
			config.enabled = false;
			rememberState();
			ctx.ui.notify("Copilot subagents desativados ⏸️", "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "auto") {
			if (value !== "on" && value !== "off") {
				ctx.ui.notify("Use: /copilot-subagents auto on|off", "error");
				return;
			}
			config.autoSearch = value === "on";
			rememberState();
			ctx.ui.notify(`Copilot auto-search: ${config.autoSearch ? "on" : "off"}`, "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "reset") {
			recentAutoSearches = [];
			lastReason = "reset";
			lastMode = "idle";
			lastAgent = "—";
			lastResultChars = 0;
			ctx.ui.notify("Copilot subagents state resetado", "info");
			updateStatus(ctx);
			return;
		}

		ctx.ui.notify("Use: /copilot-subagents on|off|status|list|auto on|auto off|reset", "error");
	}

	pi.registerCommand("copilot-subagents", {
		description: "Control Amp-style Copilot subagents",
		handler: commandHandler,
	});

	pi.registerCommand("cop-subagents", {
		description: "Alias for /copilot-subagents",
		handler: commandHandler,
	});
}
