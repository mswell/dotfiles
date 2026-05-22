/**
 * Copilot Context Extension
 *
 * Amp-style automatic context scout for GitHub Copilot workflows.
 *
 * When a Copilot task likely needs codebase discovery, this extension runs a
 * read-only scout in an isolated Pi subprocess, captures a compact Markdown
 * brief, and injects that brief into the main session as a visible custom
 * message before the primary model answers.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const COPILOT_PROVIDER = "github-copilot";
const CUSTOM_TYPE = "copilot-context-scout";
const STATE_TYPE = "copilot-context-state";
const MAX_BRIEF_CHARS = 12 * 1024;
const SCOUT_TIMEOUT_MS = 30_000;
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const MAX_PROMPT_CHARS = 24 * 1024;

type ScoutModel = "gemini" | "haiku";

interface ScoutConfig {
	enabled: boolean;
	model: ScoutModel;
}

interface ScoutDecision {
	shouldScout: boolean;
	reason: string;
}

interface RecentScout {
	key: string;
	timestamp: number;
}

const MODEL_MAP: Record<ScoutModel, string> = {
	gemini: "github-copilot/gemini-3-flash-preview:low",
	haiku: "github-copilot/claude-haiku-4.5:low",
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
	"onde está", "onde fica", "where is",
	"ache", "achar", "find", "search", "procure", "procurar", "review", "revisar",
	"melhore", "melhorar", "rode testes", "run tests", "arquitetura", "architecture",
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

function normalizePrompt(prompt: string): string {
	return prompt
		.toLowerCase()
		.replace(/`{3}[\s\S]*?`{3}/g, " codeblock ")
		.replace(/\s+/g, " ")
		.replace(/[^\p{L}\p{N}/_. -]/gu, "")
		.trim()
		.slice(0, 240);
}

function truncate(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text;
	return `${text.slice(0, maxChars - 220)}\n\n## Truncation note\nScout output was truncated to ${maxChars} characters. Prefer the cited files and likely next reads above.`;
}

function hasInlineOptOut(prompt: string): boolean {
	return /^\s*(sem scout|no scout)\s*:/i.test(prompt) || /\b(sem scout|no scout)\b/i.test(prompt);
}

function hasImages(prompt: string, images?: unknown[]): boolean {
	return (
		Boolean(images && Array.isArray(images) && images.length > 0) ||
		IMAGE_PATTERN.test(prompt) ||
		CLIPBOARD_IMAGE_PATTERN.test(prompt)
	);
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

function decideScout(prompt: string, images: unknown[] | undefined, ctx: ExtensionContext): ScoutDecision {
	if (!ctx.model || ctx.model.provider !== COPILOT_PROVIDER) return { shouldScout: false, reason: "provider is not github-copilot" };
	if (hasInlineOptOut(prompt)) return { shouldScout: false, reason: "inline opt-out" };
	if (hasImages(prompt, images)) return { shouldScout: false, reason: "image prompt handled by router" };
	if (isContinuation(prompt)) return { shouldScout: false, reason: "continuation prompt" };
	if (isDiscussion(prompt)) return { shouldScout: false, reason: "idea/discussion prompt" };
	if (prompt.trim().length < 40 && !STACK_OR_LOG_PATTERN.test(prompt)) return { shouldScout: false, reason: "short prompt" };

	const files = explicitFiles(prompt);
	if (files.length > 0 && files.length <= 2) return { shouldScout: false, reason: "explicit file(s) provided" };

	const recent = getRecentUserText(ctx);
	const combined = `${prompt}\n${recent}`;
	if (STACK_OR_LOG_PATTERN.test(prompt) && files.length === 0) return { shouldScout: true, reason: "error/log without explicit file" };
	if (includesAny(combined, CODEBASE_INTENT) && files.length === 0) return { shouldScout: true, reason: "codebase task needs discovery" };
	if (files.length > 2 && includesAny(prompt, CODEBASE_INTENT)) return { shouldScout: true, reason: "many explicit files need triage" };

	return { shouldScout: false, reason: "no codebase discovery signal" };
}

async function writeScoutPrompt(cwd: string, userPrompt: string): Promise<{ dir: string; filePath: string }> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-copilot-context-"));
	const prompt = `You are Copilot Context Scout, a read-only codebase retrieval subagent.\n\nCurrent working directory: ${cwd}\n\nUser task:\n${userPrompt.slice(0, MAX_PROMPT_CHARS)}\n\nYour job:\n- Locate relevant files and symbols for the user task.\n- Use deterministic read-only tools first: find, grep, read, ls.\n- Read the minimum needed evidence.\n- Do NOT implement. Do NOT edit. Do NOT write files.\n- Do NOT provide final code changes.\n- Prefer real paths, line ranges, and short evidence.\n- If evidence is missing, say so.\n\nHard limits:\n- Mention at most 7 relevant files.\n- Mention at most 12 symbols.\n- Include at most 5 short snippets.\n- Keep final answer under 12 KB.\n\nReturn exactly this Markdown structure:\n\n# Copilot Scout Brief\n\n## Task\n{one sentence summary}\n\n## Relevant files\n- \`path\` — why it matters\n\n## Key facts\n- fact with evidence\n\n## Snippets\n### \`path:start-end\`\n\`\`\`text\nshort snippet or summary\n\`\`\`\n\n## Likely next reads\n- \`path:start-end\`\n\n## Non-relevant / skipped\n- \`path\` — reason\n\n## Confidence\nlow|medium|high\n`;
	const filePath = path.join(dir, "scout-prompt.md");
	await fs.writeFile(filePath, prompt, "utf8");
	return { dir, filePath };
}

async function runScout(cwd: string, model: string, userPrompt: string): Promise<string> {
	const { dir, filePath } = await writeScoutPrompt(cwd, userPrompt);
	try {
		const args = [
			"--print",
			"--no-session",
			"--no-extensions",
			"--no-skills",
			"--no-prompt-templates",
			"--no-themes",
			"--no-context-files",
			"--model", model,
			"--tools", "read,grep,find,ls",
			`@${filePath}`,
		];

		return await new Promise<string>((resolve, reject) => {
			const child = spawn("pi", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
			let stdout = "";
			let stderr = "";
			let settled = false;

			const timeout = setTimeout(() => {
				if (settled) return;
				settled = true;
				child.kill("SIGTERM");
				reject(new Error(`scout timed out after ${SCOUT_TIMEOUT_MS}ms`));
			}, SCOUT_TIMEOUT_MS);

			child.stdout.on("data", (chunk) => {
				stdout += String(chunk);
				if (stdout.length > MAX_BRIEF_CHARS * 3) stdout = stdout.slice(-MAX_BRIEF_CHARS * 3);
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
				if (code !== 0) {
					reject(new Error(`scout exited with code ${code}: ${stderr || stdout}`));
					return;
				}
				resolve(stdout.trim());
			});
		});
	} finally {
		await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
	}
}

export default function copilotContext(pi: ExtensionAPI) {
	let config: ScoutConfig = { enabled: true, model: "gemini" };
	let recentScouts: RecentScout[] = [];
	let lastReason = "—";
	let lastBriefChars = 0;
	let scoutState: "idle" | "running" | "done" | "failed" = "idle";

	function updateStatus(ctx: ExtensionContext) {
		const theme = ctx.ui.theme;
		if (!config.enabled) {
			ctx.ui.setStatus("copilot-context", theme.fg("dim", "ctx:off"));
			return;
		}
		if (scoutState === "running") {
			ctx.ui.setStatus("copilot-context", theme.fg("accent", `ctx:🔎 ${config.model}`));
			return;
		}
		if (scoutState === "done") {
			ctx.ui.setStatus("copilot-context", theme.fg("accent", `ctx:✓ ${config.model}`));
			return;
		}
		if (scoutState === "failed") {
			ctx.ui.setStatus("copilot-context", theme.fg("warning", `ctx:! ${config.model}`));
			return;
		}
		ctx.ui.setStatus("copilot-context", theme.fg("dim", `ctx:${config.model}`));
	}

	function rememberState() {
		pi.appendEntry(STATE_TYPE, { enabled: config.enabled, model: config.model });
	}

	function isDuplicate(key: string): boolean {
		const now = Date.now();
		recentScouts = recentScouts.filter((item) => now - item.timestamp < DEDUPE_WINDOW_MS);
		return recentScouts.some((item) => item.key === key);
	}

	pi.on("session_start", async (_event, ctx) => {
		for (const entry of ctx.sessionManager.getEntries() as Array<{ type?: string; customType?: string; data?: Partial<ScoutConfig> }>) {
			if (entry.type === "custom" && entry.customType === STATE_TYPE && entry.data) {
				if (typeof entry.data.enabled === "boolean") config.enabled = entry.data.enabled;
				if (entry.data.model === "gemini" || entry.data.model === "haiku") config.model = entry.data.model;
			}
		}
		updateStatus(ctx);
	});

	pi.on("model_select", async (_event, ctx) => updateStatus(ctx));

	pi.on("before_agent_start", async (event, ctx) => {
		if (!config.enabled) return;
		const prompt = event.prompt ?? "";
		const decision = decideScout(prompt, event.images as unknown[] | undefined, ctx);
		lastReason = decision.reason;
		if (!decision.shouldScout) {
			scoutState = "idle";
			updateStatus(ctx);
			return;
		}

		const key = normalizePrompt(prompt);
		if (isDuplicate(key)) {
			lastReason = "dedupe: similar recent scout";
			return;
		}

		recentScouts.push({ key, timestamp: Date.now() });
		const model = MODEL_MAP[config.model];
		scoutState = "running";
		updateStatus(ctx);
		ctx.ui.notify(`Copilot context scout running (${config.model})...`, "info");

		try {
			const rawBrief = await runScout(ctx.cwd, model, prompt);
			const brief = truncate(rawBrief || "# Copilot Scout Brief\n\n## Confidence\nlow\n", MAX_BRIEF_CHARS);
			lastBriefChars = brief.length;
			lastReason = `scouted: ${decision.reason}`;
			scoutState = "done";
			updateStatus(ctx);
			return {
				message: {
					customType: CUSTOM_TYPE,
					content: brief,
					display: true,
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			lastReason = `scout failed: ${message.slice(0, 120)}`;
			scoutState = "failed";
			ctx.ui.notify(`Copilot context scout failed: ${message}`, "warning");
			updateStatus(ctx);
			return;
		}
	});

	async function commandHandler(args: string | undefined, ctx: ExtensionContext) {
		const parts = (args ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
		const cmd = parts[0] ?? "status";

		if (cmd === "status") {
			const info = [
				"Copilot Context Scout",
				`  Status: ${config.enabled ? "✅ on" : "⏸️ off"}`,
				`  Model: ${config.model} → ${MODEL_MAP[config.model]}`,
				`  Scout state: ${scoutState}`,
				`  Last reason: ${lastReason}`,
				`  Last brief chars: ${lastBriefChars}`,
				`  Recent scouts: ${recentScouts.length}`,
				"",
				"Use: /copilot-context on|off|status|model gemini|haiku|reset",
			].join("\n");
			ctx.ui.notify(info, "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "on") {
			config.enabled = true;
			rememberState();
			ctx.ui.notify("Copilot context scout ativado ✅", "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "off") {
			config.enabled = false;
			rememberState();
			ctx.ui.notify("Copilot context scout desativado ⏸️", "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "model") {
			const model = parts[1] as ScoutModel | undefined;
			if (model !== "gemini" && model !== "haiku") {
				ctx.ui.notify("Use: /copilot-context model gemini|haiku", "error");
				return;
			}
			config.model = model;
			rememberState();
			ctx.ui.notify(`Copilot context scout model: ${model} (${MODEL_MAP[model]})`, "info");
			updateStatus(ctx);
			return;
		}

		if (cmd === "reset") {
			recentScouts = [];
			lastReason = "reset";
			lastBriefChars = 0;
			scoutState = "idle";
			ctx.ui.notify("Copilot context scout dedupe resetado", "info");
			updateStatus(ctx);
			return;
		}

		ctx.ui.notify("Use: /copilot-context on|off|status|model gemini|haiku|reset", "error");
	}

	pi.registerCommand("copilot-context", {
		description: "Control automatic Copilot context scout",
		handler: commandHandler,
	});

	pi.registerCommand("cop-context", {
		description: "Alias for /copilot-context",
		handler: commandHandler,
	});
}
