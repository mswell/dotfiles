import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type, type Static } from "typebox";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

const VERSION = "0.1.0";
const DEFAULT_DESTINATION = "~/Projects/dotfiles/config/pi";
const PI_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
const AGENTS_SKILLS_DIR = path.join(os.homedir(), ".agents", "skills");

const SENSITIVE_KEY_RE = /(api[_-]?key|token|secret|password|passwd|cookie|credential|oauth|authorization|bearer|client[_-]?secret|private[_-]?key|refresh[_-]?token|access[_-]?token|session[_-]?token|pat)/i;
const SKIP_NAME_RE = /^(sessions|node_modules|\.git|\.cache|cache|tmp|temp|logs?|npm|git)$/i;
const SKIP_FILE_RE = /(\.env($|\.)|secret|secrets|credential|credentials|cookie|cookies|oauth|auth|token|tokens|keychain|known_hosts|id_rsa|id_ed25519|\.pem$|\.p12$|\.pfx$)/i;
const TEXT_FILE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|txt|yaml|yml|toml|sh|bash|zsh|fish|ini|conf|config|gitignore)$/i;
const JSON_FILE_RE = /\.json$/i;
const MAX_COPY_BYTES = 1024 * 1024;

type BackupResult = {
	destination: string;
	filesWritten: string[];
	filesSkipped: Array<{ path: string; reason: string }>;
	dryRun: boolean;
};

const BackupParams = Type.Object({
	destination: Type.Optional(Type.String({ description: `Destination directory. Defaults to ${DEFAULT_DESTINATION}.` })),
	dryRun: Type.Optional(Type.Boolean({ description: "Preview what would be copied without writing files." })),
	includeAgentsSkills: Type.Optional(Type.Boolean({ description: "Also back up ~/.agents/skills. Default: false." })),
});

type BackupParamsType = Static<typeof BackupParams>;

function expandHome(inputPath: string): string {
	if (inputPath === "~") return os.homedir();
	if (inputPath.startsWith("~/")) return path.join(os.homedir(), inputPath.slice(2));
	return inputPath;
}

async function exists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function ensureDir(dir: string, dryRun: boolean): Promise<void> {
	if (!dryRun) await fs.mkdir(dir, { recursive: true });
}

async function writeText(filePath: string, content: string, result: BackupResult): Promise<void> {
	result.filesWritten.push(filePath);
	if (result.dryRun) return;
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

async function writeJson(filePath: string, value: unknown, result: BackupResult): Promise<void> {
	await writeText(filePath, JSON.stringify(value, null, 2), result);
}

function sanitizeJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sanitizeJson);
	if (value && typeof value === "object") {
		const output: Record<string, unknown> = {};
		for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
			output[key] = SENSITIVE_KEY_RE.test(key) ? "<REDACTED>" : sanitizeJson(nested);
		}
		return output;
	}
	if (typeof value === "string") return redactText(value);
	return value;
}

function redactText(input: string): string {
	let text = input;
	text = text.replace(/Bearer\s+[A-Za-z0-9._~+\/-]{16,}=*/gi, "Bearer <REDACTED>");
	text = text.replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})\b/g, "<REDACTED>");
	text = text.replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g, "<REDACTED_JWT>");
	// Redact shell-style env assignments. Keep this uppercase-only so source code
	// identifiers such as redactsSensitiveKeysAndTokenPatterns are not corrupted.
	text = text.replace(new RegExp(`(^|\\n)(\\s*)([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PASSWD|COOKIE|OAUTH|AUTHORIZATION|CLIENT[_-]?SECRET|PRIVATE[_-]?KEY)[A-Z0-9_]*)\\s*[:=]\\s*([^\\n\\r]+)`, "g"), "$1$2$3=<REDACTED>");
	text = text.replace(/(authorization|cookie|set-cookie)\s*:\s*[^\n\r]+/gi, "$1: <REDACTED>");
	return text;
}

async function readJson(filePath: string): Promise<unknown | undefined> {
	try {
		return JSON.parse(await fs.readFile(filePath, "utf8"));
	} catch {
		return undefined;
	}
}

function shouldSkipEntry(name: string): string | undefined {
	if (SKIP_NAME_RE.test(name)) return "sensitive or generated directory";
	if (SKIP_FILE_RE.test(name)) return "sensitive-looking filename";
	return undefined;
}

async function copySanitizedFile(source: string, destination: string, result: BackupResult): Promise<void> {
	const stat = await fs.stat(source);
	if (stat.size > MAX_COPY_BYTES) {
		result.filesSkipped.push({ path: source, reason: `larger than ${MAX_COPY_BYTES} bytes` });
		return;
	}

	if (JSON_FILE_RE.test(source)) {
		const parsed = await readJson(source);
		if (parsed !== undefined) {
			await writeJson(destination, sanitizeJson(parsed), result);
			return;
		}
	}

	if (TEXT_FILE_RE.test(source)) {
		const content = await fs.readFile(source, "utf8");
		await writeText(destination, redactText(content), result);
		return;
	}

	result.filesSkipped.push({ path: source, reason: "non-text file" });
}

async function copySanitizedDir(source: string, destination: string, result: BackupResult): Promise<void> {
	if (!(await exists(source))) return;
	await ensureDir(destination, result.dryRun);
	const entries = await fs.readdir(source, { withFileTypes: true });
	for (const entry of entries) {
		const reason = shouldSkipEntry(entry.name);
		const src = path.join(source, entry.name);
		const dst = path.join(destination, entry.name);
		if (reason) {
			result.filesSkipped.push({ path: src, reason });
			continue;
		}
		if (entry.isDirectory()) await copySanitizedDir(src, dst, result);
		else if (entry.isFile()) await copySanitizedFile(src, dst, result);
		else result.filesSkipped.push({ path: src, reason: "not a regular file or directory" });
	}
}

async function backupPiConfig(params: BackupParamsType = {}): Promise<BackupResult> {
	const destination = path.resolve(expandHome(params.destination || DEFAULT_DESTINATION));
	const result: BackupResult = { destination, filesWritten: [], filesSkipped: [], dryRun: Boolean(params.dryRun) };

	await ensureDir(destination, result.dryRun);

	const settingsPath = path.join(PI_AGENT_DIR, "settings.json");
	const settings = await readJson(settingsPath);
	if (settings !== undefined) {
		await writeJson(path.join(destination, "agent", "settings.example.json"), sanitizeJson(settings), result);
	} else {
		result.filesSkipped.push({ path: settingsPath, reason: "missing or invalid JSON" });
	}

	for (const dirName of ["extensions", "skills", "prompts", "themes"]) {
		await copySanitizedDir(path.join(PI_AGENT_DIR, dirName), path.join(destination, "agent", dirName), result);
	}

	if (params.includeAgentsSkills) {
		await copySanitizedDir(AGENTS_SKILLS_DIR, path.join(destination, "agents", "skills"), result);
	}

	await writeText(path.join(destination, "README.md"), buildReadme(params.includeAgentsSkills), result);
	await writeJson(path.join(destination, "manifest.json"), {
		version: VERSION,
		createdAt: new Date().toISOString(),
		source: {
			piAgentDir: PI_AGENT_DIR,
			agentsSkillsDir: params.includeAgentsSkills ? AGENTS_SKILLS_DIR : undefined,
		},
		redaction: {
			skipsSessions: true,
			skipsPackageCaches: true,
			skipsSensitiveFilenames: true,
			redactsSensitiveKeysAndTokenPatterns: true,
		},
		filesWritten: result.filesWritten.map((file) => path.relative(destination, file)),
		filesSkipped: result.filesSkipped.map((item) => ({ ...item, path: item.path.startsWith(destination) ? path.relative(destination, item.path) : item.path })),
	}, result);

	return result;
}

function buildReadme(includeAgentsSkills?: boolean): string {
	return `# Pi config backup

Generated by the global \`pi-config-backup\` extension.

This directory is intended to be committed to dotfiles. It excludes or redacts sensitive material.

## Contains

- \`agent/settings.example.json\` sanitized from \`~/.pi/agent/settings.json\`
- \`agent/extensions/\` sanitized global Pi extensions
- \`agent/skills/\`, \`agent/prompts/\`, and \`agent/themes/\` when present
${includeAgentsSkills ? "- `agents/skills/` sanitized copy of `~/.agents/skills/`\n" : ""}
## Intentionally not copied

- \`~/.pi/agent/sessions/\`
- package caches/install dirs such as \`npm/\`, \`git/\`, \`node_modules/\`
- files with sensitive-looking names such as \`.env\`, \`*token*\`, \`*secret*\`, \`*cookie*\`, private keys, and auth files
- API keys, tokens, cookies, OAuth material, bearer tokens, JWTs, and similar strings found in text files

## Restore sketch

Review files before restoring. Then copy only what you want:

\`\`\`bash
mkdir -p ~/.pi/agent
cp -R agent/extensions ~/.pi/agent/
cp agent/settings.example.json ~/.pi/agent/settings.json  # review/edit first
\`\`\`
`;
}

function formatResult(result: BackupResult): string {
	const lines = [
		`Pi config backup ${result.dryRun ? "dry-run" : "complete"}`,
		`Destination: ${result.destination}`,
		`Files ${result.dryRun ? "would write" : "written"}: ${result.filesWritten.length}`,
		`Skipped: ${result.filesSkipped.length}`,
	];
	if (result.filesSkipped.length) {
		lines.push("", "Skipped files:");
		for (const item of result.filesSkipped.slice(0, 30)) lines.push(`- ${item.path}: ${item.reason}`);
		if (result.filesSkipped.length > 30) lines.push(`- ... ${result.filesSkipped.length - 30} more`);
	}
	return lines.join("\n");
}

function formatCompactResult(result: BackupResult): string {
	const verb = result.dryRun ? "dry-run" : "complete";
	const fileLabel = result.dryRun ? "would write" : "written";
	const skipped = result.filesSkipped.length ? `, ${result.filesSkipped.length} skipped` : "";
	return `Pi config backup ${verb}: ${result.filesWritten.length} files ${fileLabel}${skipped} → ${result.destination}`;
}

export default function piConfigBackup(pi: ExtensionAPI) {
	pi.registerCommand("pi-backup", {
		description: "Back up sanitized Pi configuration to dotfiles",
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/).filter(Boolean);
			const dryRun = parts.includes("--dry-run");
			const includeAgentsSkills = parts.includes("--include-agents-skills");
			const destination = parts.find((part) => !part.startsWith("--"));
			try {
				const result = await backupPiConfig({ destination, dryRun, includeAgentsSkills });
				ctx.ui.setWidget("pi-backup", undefined);
				ctx.ui.notify(formatCompactResult(result), dryRun ? "info" : "success");
			} catch (error) {
				ctx.ui.notify(`pi-backup failed: ${error instanceof Error ? error.message : String(error)}`, "error");
			}
		},
	});

	pi.registerTool({
		name: "pi_config_backup",
		label: "Pi Config Backup",
		description: "Back up sanitized Pi configuration files to dotfiles without copying sessions or secrets.",
		promptSnippet: "Back up sanitized Pi configuration to dotfiles",
		promptGuidelines: [
			"Use pi_config_backup only when the user asks to back up Pi configuration files.",
			"pi_config_backup must not copy sessions, API keys, tokens, cookies, OAuth material, private keys, or auth files.",
		],
		parameters: BackupParams,
		async execute(_toolCallId, params: BackupParamsType) {
			try {
				const result = await backupPiConfig(params);
				return { content: [{ type: "text", text: formatCompactResult(result) }], details: result };
			} catch (error) {
				return {
					content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
					details: { error: String(error) },
					isError: true,
				};
			}
		},
	});
}
