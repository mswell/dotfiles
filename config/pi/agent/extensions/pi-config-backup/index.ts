import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import { execSync } from "node:child_process";

const VERSION = "0.4.0";
const DEFAULT_DESTINATION = "~/Projects/dotfiles/config/pi";
const PI_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
const AGENTS_SKILLS_DIR = path.join(os.homedir(), ".agents", "skills");
const PRE_RESTORE_SNAPSHOT_DIR = path.join(PI_AGENT_DIR, ".pre-restore-snapshot");
const MANIFEST_FILENAME = ".backup-manifest.json";

const SENSITIVE_KEY_RE = /(api[_-]?key|token|secret|password|passwd|cookie|credential|oauth|authorization|bearer|client[_-]?secret|private[_-]?key|refresh[_-]?token|access[_-]?token|session[_-]?token|pat|sessionid|csrf|xsrf)/i;
const SKIP_NAME_RE = /^(sessions|node_modules|\.git|\.cache|cache|tmp|temp|logs?|npm|git|\.pre-restore-snapshot)$/i;
const SKIP_FILE_RE = /(\.env($|\.)|secret|secrets|credential|credentials|cookie|cookies|oauth|auth|token|tokens|keychain|known_hosts|id_rsa|id_ed25519|\.pem$|\.p12$|\.pfx$|\.key$|\.crt$|secrets\.json$|credentials\.json$)/i;
const TEXT_FILE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|txt|yaml|yml|toml|sh|bash|zsh|fish|ini|conf|config|gitignore)$/i;
const JSON_FILE_RE = /\.json$/i;
const TS_JS_FILE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;
const VERSION_RE = /(?:const|let|var)\s+VERSION\s*=\s*["']([^"']+)["']/;
const MAX_COPY_BYTES = 1024 * 1024;
const SECRET_LINE_RE = /(authorization|proxy-authorization|cookie|set-cookie)\s*:\s*[^\n\r]+/gi;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+\/-]{16,}=*/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g;
const PRIVATE_KEY_RE = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const SECRET_ASSIGNMENT_RE = /(^|\n)(\s*)([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PASSWD|COOKIE|OAUTH|AUTHORIZATION|CLIENT[_-]?SECRET|PRIVATE[_-]?KEY|ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN|SESSION[_-]?TOKEN|CSRF|XSRF)[A-Z0-9_]*)\s*[:=]\s*([^\n\r]+)/g;
const GENERIC_SECRET_VALUE_RE = /\b[A-Za-z0-9+\/_-]{32,}=*\b/g;
const SUSPICIOUS_SECRET_CONTENT_RE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._~+\/-]{16,}=*|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|(?:authorization|cookie|set-cookie)\s*:|(?:api[_-]?key|token|secret|password|passwd|cookie|credential|oauth|authorization|bearer|client[_-]?secret|private[_-]?key|refresh[_-]?token|access[_-]?token|session[_-]?token|pat|sessionid|csrf|xsrf)\s*[:=])/i;

// --- Manifest types ---

interface ManifestFileEntry {
	hash: string;
	version?: string;
	backedUpAt: string;
	size: number;
}

interface BackupManifest {
	manifestVersion: 1;
	lastBackupAt: string;
	files: Record<string, ManifestFileEntry>;
}

// --- Result types ---

type BackupResult = {
	destination: string;
	filesWritten: string[];
	filesSkipped: Array<{ path: string; reason: string }>;
	filesPruned: string[];
	dryRun: boolean;
};

type RestoreResult = {
	destination: string;
	filesWritten: string[];
	filesSkipped: Array<{ path: string; reason: string }>;
	filesDiverged: Array<{ path: string; localVersion?: string; backupVersion?: string }>;
	filesPruned: string[];
	snapshotDir?: string;
	dryRun: boolean;
};

// --- Params ---

const BackupParams = Type.Object({
	destination: Type.Optional(Type.String({ description: `Destination directory. Defaults to ${DEFAULT_DESTINATION}.` })),
	dryRun: Type.Optional(Type.Boolean({ description: "Preview what would be copied without writing files." })),
	includeAgentsSkills: Type.Optional(Type.Boolean({ description: "Also back up ~/.agents/skills. Default: false." })),
});

type BackupParamsType = Static<typeof BackupParams>;

const RestoreParams = Type.Object({
	source: Type.Optional(Type.String({ description: `Source directory. Defaults to ${DEFAULT_DESTINATION}.` })),
	dryRun: Type.Optional(Type.Boolean({ description: "Preview what would be copied without writing files." })),
	force: Type.Optional(Type.Boolean({ description: "Overwrite diverged local files without checking." })),
	// sync vs merge mode
	sync: Type.Optional(Type.Boolean({ description: "Sync mode: delete local managed files not in the backup so the destination is an exact mirror of the source. Use this to keep machines identical. Alias: --sync on the command line." })),
	merge: Type.Optional(Type.Boolean({ description: "Merge mode (default): restore new/updated files from backup without deleting local extras. Alias: --merge on the command line." })),
});

type RestoreParamsType = Static<typeof RestoreParams>;

// --- Utility functions ---

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

function fileHash(content: Buffer): string {
	return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
}

function extractVersion(content: string): string | undefined {
	const match = content.match(VERSION_RE);
	return match?.[1];
}

function syntaxCheck(filePath: string): { ok: boolean; error?: string } {
	if (!TS_JS_FILE_RE.test(filePath)) return { ok: true };
	try {
		execSync(`node --check "${filePath}"`, { stdio: "pipe", timeout: 10000 });
		return { ok: true };
	} catch (err: any) {
		return { ok: false, error: err.stderr?.toString()?.slice(0, 200) || "syntax error" };
	}
}

// --- Manifest operations ---

async function loadManifest(dotfilesDir: string): Promise<BackupManifest> {
	const manifestPath = path.join(dotfilesDir, MANIFEST_FILENAME);
	try {
		const data = JSON.parse(await fs.readFile(manifestPath, "utf8"));
		if (data.manifestVersion === 1) return data;
	} catch {}
	return { manifestVersion: 1, lastBackupAt: "", files: {} };
}

async function saveManifest(dotfilesDir: string, manifest: BackupManifest, dryRun: boolean): Promise<void> {
	if (dryRun) return;
	const manifestPath = path.join(dotfilesDir, MANIFEST_FILENAME);
	await fs.mkdir(path.dirname(manifestPath), { recursive: true });
	await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

// --- Sanitization (unchanged from original) ---

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
	text = text.replace(PRIVATE_KEY_RE, "<REDACTED_PRIVATE_KEY>");
	text = text.replace(BEARER_RE, "Bearer <REDACTED>");
	text = text.replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})\b/g, "<REDACTED>");
	text = text.replace(JWT_RE, "<REDACTED_JWT>");
	text = text.replace(SECRET_ASSIGNMENT_RE, "$1$2$3=<REDACTED>");
	text = text.replace(SECRET_LINE_RE, "$1: <REDACTED>");
	text = text.replace(/\b(?:AKIA|ASIA|AIDA|ANPA|AROA|AGPA|A3T[A-Z0-9])[A-Z0-9]{12,}\b/g, "<REDACTED_AWS_KEY>");
	text = text.replace(GENERIC_SECRET_VALUE_RE, (value) => {
		if (value.length < 32) return value;
		if (/^[A-Za-z]+$/.test(value)) return value;
		return "<REDACTED>";
	});
	return text;
}

function containsSensitiveContent(text: string): boolean {
	return SUSPICIOUS_SECRET_CONTENT_RE.test(text);
}

async function readJsonFile(filePath: string): Promise<unknown | undefined> {
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

// --- Backup logic ---

async function writeTextToBackup(filePath: string, content: string, result: BackupResult): Promise<void> {
	result.filesWritten.push(filePath);
	if (result.dryRun) return;
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

async function writeJsonToBackup(filePath: string, value: unknown, result: BackupResult): Promise<void> {
	await writeTextToBackup(filePath, JSON.stringify(value, null, 2), result);
}

async function copySanitizedFile(source: string, destination: string, result: BackupResult, manifest: BackupManifest, dotfilesDir: string): Promise<void> {
	const stat = await fs.stat(source);
	if (stat.size > MAX_COPY_BYTES) {
		result.filesSkipped.push({ path: source, reason: `larger than ${MAX_COPY_BYTES} bytes` });
		return;
	}

	// Syntax check for .ts/.js files before backing up
	if (TS_JS_FILE_RE.test(source)) {
		const check = syntaxCheck(source);
		if (!check.ok) {
			result.filesSkipped.push({ path: source, reason: `syntax error: ${check.error}` });
			return;
		}
	}

	const rawContent = await fs.readFile(source);
	const hash = fileHash(rawContent);
	const relPath = path.relative(dotfilesDir, destination);

	if (JSON_FILE_RE.test(source)) {
		try {
			const parsed = JSON.parse(rawContent.toString("utf8"));
			const sanitized = sanitizeJson(parsed);
			await writeJsonToBackup(destination, sanitized, result);
			manifest.files[relPath] = { hash, backedUpAt: new Date().toISOString(), size: stat.size };
			return;
		} catch {}
	}

	if (TEXT_FILE_RE.test(source)) {
		const textContent = rawContent.toString("utf8");
		const isSourceCode = TS_JS_FILE_RE.test(source);

		// Source code files (.ts/.js) are copied verbatim — they are code, not config.
		// Redaction and sensitive-content checks are only for config/text files.
		if (isSourceCode) {
			const version = extractVersion(textContent);
			await writeTextToBackup(destination, textContent, result);
			manifest.files[relPath] = { hash, version, backedUpAt: new Date().toISOString(), size: stat.size };
			return;
		}

		if (containsSensitiveContent(textContent)) {
			result.filesSkipped.push({ path: source, reason: "contains sensitive content" });
			return;
		}
		const version = extractVersion(textContent);
		await writeTextToBackup(destination, redactText(textContent), result);
		manifest.files[relPath] = { hash, version, backedUpAt: new Date().toISOString(), size: stat.size };
		return;
	}

	result.filesSkipped.push({ path: source, reason: "non-text file" });
}

async function copySanitizedDir(source: string, destination: string, result: BackupResult, manifest: BackupManifest, dotfilesDir: string): Promise<void> {
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
		if (entry.isDirectory()) await copySanitizedDir(src, dst, result, manifest, dotfilesDir);
		else if (entry.isFile()) await copySanitizedFile(src, dst, result, manifest, dotfilesDir);
		else result.filesSkipped.push({ path: src, reason: "not a regular file or directory" });
	}
}

async function backupPiConfig(params: BackupParamsType = {}): Promise<BackupResult> {
	const destination = path.resolve(expandHome(params.destination || DEFAULT_DESTINATION));
	const result: BackupResult = { destination, filesWritten: [], filesSkipped: [], filesPruned: [], dryRun: Boolean(params.dryRun) };
	const manifest = await loadManifest(destination);

	await ensureDir(destination, result.dryRun);

	const settingsPath = path.join(PI_AGENT_DIR, "settings.json");
	const settings = await readJsonFile(settingsPath);
	if (settings !== undefined) {
		const dstPath = path.join(destination, "agent", "settings.example.json");
		await writeJsonToBackup(dstPath, sanitizeJson(settings), result);
		const rawContent = await fs.readFile(settingsPath);
		const relPath = path.relative(destination, dstPath);
		manifest.files[relPath] = { hash: fileHash(rawContent), backedUpAt: new Date().toISOString(), size: rawContent.length };
	} else {
		result.filesSkipped.push({ path: settingsPath, reason: "missing or invalid JSON" });
	}

	// Note: `skills` is intentionally excluded — Pi skills are controlled by a separate project.
	for (const dirName of ["extensions", "prompts", "themes"]) {
		await copySanitizedDir(path.join(PI_AGENT_DIR, dirName), path.join(destination, "agent", dirName), result, manifest, destination);
	}

	if (params.includeAgentsSkills) {
		await copySanitizedDir(AGENTS_SKILLS_DIR, path.join(destination, "agents", "skills"), result, manifest, destination);
	}

	// Prune destination files that no longer exist locally so removed extensions/themes don't get restored later.
	const writtenSet = new Set(result.filesWritten.map((p) => path.resolve(p)));
	const managedDirs = [
		path.join(destination, "agent", "extensions"),
		path.join(destination, "agent", "prompts"),
		path.join(destination, "agent", "themes"),
	];
	if (params.includeAgentsSkills) {
		managedDirs.push(path.join(destination, "agents", "skills"));
	}
	for (const dir of managedDirs) {
		await pruneOrphans(dir, writtenSet, result, manifest, destination);
	}
	pruneStaleManifestEntries(destination, writtenSet, manifest, Boolean(params.includeAgentsSkills));

	// Update manifest
	manifest.lastBackupAt = new Date().toISOString();
	await saveManifest(destination, manifest, result.dryRun);

	await writeTextToBackup(path.join(destination, "README.md"), buildReadme(params.includeAgentsSkills), result);

	return result;
}

// --- Restore logic with guardrails ---

function isManagedManifestPath(relPath: string, includeAgentsSkills: boolean): boolean {
	if (relPath === "agent/settings.example.json") return true;
	if (relPath.startsWith("agent/extensions/")) return true;
	if (relPath.startsWith("agent/prompts/")) return true;
	if (relPath.startsWith("agent/themes/")) return true;
	if (includeAgentsSkills && relPath.startsWith("agents/skills/")) return true;
	return false;
}

function pruneStaleManifestEntries(dotfilesDir: string, writtenSet: Set<string>, manifest: BackupManifest, includeAgentsSkills: boolean): void {
	for (const relPath of Object.keys(manifest.files)) {
		if (!isManagedManifestPath(relPath, includeAgentsSkills)) continue;
		const absolutePath = path.resolve(path.join(dotfilesDir, relPath));
		if (!writtenSet.has(absolutePath)) delete manifest.files[relPath];
	}
}

async function pruneOrphans(dir: string, writtenSet: Set<string>, result: BackupResult, manifest: BackupManifest, dotfilesDir: string): Promise<boolean> {
	if (!(await exists(dir))) return true;
	const entries = await fs.readdir(dir, { withFileTypes: true });
	let emptied = true;
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			const childEmpty = await pruneOrphans(full, writtenSet, result, manifest, dotfilesDir);
			if (childEmpty) {
				result.filesPruned.push(full);
				if (!result.dryRun) {
					try { await fs.rm(full, { recursive: true, force: true }); } catch {}
				}
			} else {
				emptied = false;
			}
		} else if (entry.isFile()) {
			if (writtenSet.has(path.resolve(full))) {
				emptied = false;
				continue;
			}
			result.filesPruned.push(full);
			if (!result.dryRun) {
				try { await fs.rm(full, { force: true }); } catch {}
			}
			const relPath = path.relative(dotfilesDir, full);
			delete manifest.files[relPath];
		} else {
			emptied = false;
		}
	}
	return emptied;
}

async function createPreRestoreSnapshot(filesToRestore: string[], dryRun: boolean): Promise<string | undefined> {
	if (dryRun || filesToRestore.length === 0) return undefined;
	// Clean previous snapshot
	try { await fs.rm(PRE_RESTORE_SNAPSHOT_DIR, { recursive: true }); } catch {}
	await fs.mkdir(PRE_RESTORE_SNAPSHOT_DIR, { recursive: true });

	for (const filePath of filesToRestore) {
		if (!(await exists(filePath))) continue;
		const relPath = path.relative(PI_AGENT_DIR, filePath);
		const snapshotPath = path.join(PRE_RESTORE_SNAPSHOT_DIR, relPath);
		await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
		await fs.copyFile(filePath, snapshotPath);
	}
	return PRE_RESTORE_SNAPSHOT_DIR;
}

async function pruneRestoreOrphans(dir: string, expectedFiles: Set<string>, result: RestoreResult): Promise<boolean> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	let emptied = true;
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			const childEmpty = await pruneRestoreOrphans(full, expectedFiles, result);
			if (childEmpty) {
				result.filesPruned.push(full);
				if (!result.dryRun) {
					try { await fs.rm(full, { recursive: true, force: true }); } catch {}
				}
			} else {
				emptied = false;
			}
		} else if (entry.isFile()) {
			if (expectedFiles.has(path.resolve(full))) {
				emptied = false;
				continue;
			}
			result.filesPruned.push(full);
			if (!result.dryRun) {
				try { await fs.rm(full, { force: true }); } catch {}
			}
		} else {
			emptied = false;
		}
	}
	return emptied;
}

async function collectRestoreFiles(srcDir: string, dstDir: string, files: Array<{ src: string; dst: string }>): Promise<void> {
	if (!(await exists(srcDir))) return;
	const entries = await fs.readdir(srcDir, { withFileTypes: true });
	for (const entry of entries) {
		const reason = shouldSkipEntry(entry.name);
		if (reason) continue;
		const src = path.join(srcDir, entry.name);
		const dst = path.join(dstDir, entry.name);
		if (entry.isDirectory()) await collectRestoreFiles(src, dst, files);
		else if (entry.isFile()) files.push({ src, dst });
	}
}

async function restorePiConfig(params: RestoreParamsType = {}): Promise<RestoreResult> {
	const sourceDir = path.resolve(expandHome(params.source || DEFAULT_DESTINATION));
	const destination = PI_AGENT_DIR;
	const result: RestoreResult = {
		destination,
		filesWritten: [],
		filesSkipped: [],
		filesDiverged: [],
		filesPruned: [],
		dryRun: Boolean(params.dryRun),
	};

	if (!(await exists(sourceDir))) {
		throw new Error(`Source directory ${sourceDir} does not exist`);
	}

	const agentSrcDir = path.join(sourceDir, "agent");
	if (!(await exists(agentSrcDir))) {
		throw new Error(`Invalid backup: missing agent directory at ${agentSrcDir}`);
	}

	// Load manifest to check divergence
	const manifest = await loadManifest(sourceDir);

	// Collect all files that would be restored
	const filesToRestore: Array<{ src: string; dst: string }> = [];

	// Settings
	const settingsExamplePath = path.join(agentSrcDir, "settings.example.json");
	const settingsDstPath = path.join(destination, "settings.json");
	if (await exists(settingsExamplePath)) {
		if (await exists(settingsDstPath)) {
			result.filesSkipped.push({ path: settingsExamplePath, reason: "settings.json already exists in destination" });
		} else {
			filesToRestore.push({ src: settingsExamplePath, dst: settingsDstPath });
		}
	}

	// Directories
	// Note: `skills` is intentionally excluded — Pi skills are controlled by a separate project.
	for (const dirName of ["extensions", "prompts", "themes"]) {
		const srcDir = path.join(agentSrcDir, dirName);
		const dstDir = path.join(destination, dirName);
		await collectRestoreFiles(srcDir, dstDir, filesToRestore);
	}

	// Check divergence for each file
	const safeFiles: Array<{ src: string; dst: string }> = [];
	const divergedFiles: Array<{ src: string; dst: string; localVersion?: string; backupVersion?: string }> = [];

	for (const { src, dst } of filesToRestore) {
		if (!(await exists(dst))) {
			// New file, safe to restore
			safeFiles.push({ src, dst });
			continue;
		}

		if (params.force) {
			safeFiles.push({ src, dst });
			continue;
		}

		// Compare local file hash with what manifest recorded at backup time
		const relDst = path.relative(destination, dst);
		// Map destination path to manifest key (agent/extensions/... relative to dotfiles root)
		const manifestKey = `agent/${relDst}`;
		const manifestEntry = manifest.files[manifestKey];

		if (!manifestEntry) {
			// No manifest entry — file existed locally but was never tracked; safe to restore (overwrite with backup)
			safeFiles.push({ src, dst });
			continue;
		}

		// Compare current local file hash with the hash at backup time
		const localContent = await fs.readFile(dst);
		const localHash = fileHash(localContent);

		if (localHash === manifestEntry.hash) {
			// Local file unchanged since backup — safe to overwrite
			safeFiles.push({ src, dst });
		} else {
			// Local file was modified since last backup — DIVERGED
			const localVersion = TEXT_FILE_RE.test(dst) ? extractVersion(localContent.toString("utf8")) : undefined;
			divergedFiles.push({ src, dst, localVersion, backupVersion: manifestEntry.version });
		}
	}

	// Create pre-restore snapshot of files we'll overwrite
	const snapshotTargets = safeFiles.filter(({ dst }) => exists(dst)).map(({ dst }) => dst);
	result.snapshotDir = await createPreRestoreSnapshot(snapshotTargets, result.dryRun);

	// Restore safe files
	for (const { src, dst } of safeFiles) {
		if (!result.dryRun) {
			await fs.mkdir(path.dirname(dst), { recursive: true });
			await fs.copyFile(src, dst);
		}
		result.filesWritten.push(dst);
	}

	// --sync: delete local extras so destination is an exact mirror of the backup
	// --merge (default): restore files without deleting local extras
	const isSyncMode = params.sync === true;
	if (isSyncMode) {
		const expected = new Set(filesToRestore.map(({ dst }) => path.resolve(dst)));
		const managedRoots = [path.join(destination, "extensions"), path.join(destination, "prompts"), path.join(destination, "themes")];
		for (const root of managedRoots) {
			if (!(await exists(root))) continue;
			await pruneRestoreOrphans(root, expected, result);
		}
	}

	// Record diverged files
	for (const { dst, localVersion, backupVersion } of divergedFiles) {
		result.filesDiverged.push({
			path: path.relative(destination, dst),
			localVersion,
			backupVersion,
		});
	}

	return result;
}

// --- Formatting ---

function buildReadme(includeAgentsSkills?: boolean): string {
	return `# Pi config backup

Generated by the global \`pi-config-backup\` extension (v${VERSION}).

This directory is intended to be committed to dotfiles. It excludes or redacts sensitive material.

## Contains

- \`agent/settings.example.json\` sanitized from \`~/.pi/agent/settings.json\`
- \`agent/extensions/\` sanitized global Pi extensions
- \`agent/prompts/\` and \`agent/themes/\` when present (note: \`agent/skills/\` is intentionally excluded — Pi skills are managed in a separate project)
- \`.backup-manifest.json\` with hashes for divergence detection
${includeAgentsSkills ? "- `agents/skills/` sanitized copy of `~/.agents/skills/`\n" : ""}
## Intentionally not copied

- \`~/.pi/agent/sessions/\`
- package caches/install dirs such as \`npm/\`, \`git/\`, \`node_modules/\`
- files with sensitive-looking names
- API keys, tokens, cookies, OAuth material, and similar strings
- Files with syntax errors (validated with node --check)

## Restore modes

Use \`/pi-restore\` or the \`pi_config_restore\` tool.

| Mode | Command | Behavior |
|------|---------|----------|
| **merge** (default) | \`/pi-restore\` or \`/pi-restore --merge\` | Restore new/updated files; keep local extras that are not in the backup |
| **sync** | \`/pi-restore --sync\` | Restore + delete local extras so the machine is an exact mirror of the backup |

Guardrails (both modes):
- Files modified locally since last backup are **skipped** (not overwritten)
- A pre-restore snapshot is saved to \`~/.pi/agent/.pre-restore-snapshot/\`
- Use \`--force\` to override divergence protection

### Keeping machines in sync

\`\`\`bash
# On the source machine (after changes):
/pi-backup
git commit && git push

# On each other machine:
git pull
/pi-restore --sync
\`\`\`
`;
}

function formatBackupResult(result: BackupResult): string {
	const verb = result.dryRun ? "dry-run" : "complete";
	const fileLabel = result.dryRun ? "would write" : "written";
	const skipped = result.filesSkipped.length ? `, ${result.filesSkipped.length} skipped` : "";
	const prunedLabel = result.dryRun ? "would prune" : "pruned";
	const pruned = result.filesPruned.length ? `, ${result.filesPruned.length} ${prunedLabel}` : "";
	return `Pi config backup ${verb}: ${result.filesWritten.length} files ${fileLabel}${skipped}${pruned} → ${result.destination}`;
}

function formatRestoreResult(result: RestoreResult): string {
	const verb = result.dryRun ? "dry-run" : "complete";
	const lines = [
		`Pi config restore ${verb}`,
		`Destination: ${result.destination}`,
		`Files ${result.dryRun ? "would write" : "written"}: ${result.filesWritten.length}`,
	];
	if (result.snapshotDir) {
		lines.push(`Pre-restore snapshot: ${result.snapshotDir}`);
	}
	if (result.filesSkipped.length) {
		lines.push(`Skipped: ${result.filesSkipped.length}`);
		for (const item of result.filesSkipped.slice(0, 10)) {
			lines.push(`  - ${item.path}: ${item.reason}`);
		}
	}
	if (result.filesPruned.length) {
		lines.push("", `🧹 ${result.filesPruned.length} extra file(s) pruned to mirror backup:`);
		for (const item of result.filesPruned.slice(0, 20)) {
			lines.push(`  - ${item}`);
		}
	}
	if (result.filesDiverged.length) {
		lines.push("", `⚠️  ${result.filesDiverged.length} file(s) modified locally since last backup (SKIPPED):`);
		for (const item of result.filesDiverged.slice(0, 20)) {
			const versions = item.localVersion && item.backupVersion
				? ` (local: v${item.localVersion}, backup: v${item.backupVersion})`
				: "";
			lines.push(`  - ${item.path}${versions}`);
		}
		lines.push("", "Run pi_config_backup first to capture local changes, or use --force to overwrite.");
	}
	return lines.join("\n");
}

// --- Extension registration ---

export default function piConfigBackup(pi: ExtensionAPI) {
	pi.registerCommand("pi-restore", {
		description: "Restore Pi configuration from dotfiles (with divergence protection)",
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/).filter(Boolean);
			const dryRun = parts.includes("--dry-run");
			const force = parts.includes("--force");
			const sync = parts.includes("--sync") || parts.includes("--mirror"); // --mirror kept as alias
			const merge = parts.includes("--merge");
			const source = parts.find((part) => !part.startsWith("--"));
			try {
				const result = await restorePiConfig({ source, dryRun, force, sync, merge });
				ctx.ui.setWidget("pi-restore", undefined);
				const mode = sync ? "sync" : "merge";
				const msg = result.filesDiverged.length
					? `Pi config restore [${mode}]: ${result.filesWritten.length} files restored, ${result.filesDiverged.length} skipped (locally modified)`
					: `Pi config restore [${mode}] ${dryRun ? "dry-run " : ""}complete: ${result.filesWritten.length} files written${result.filesPruned.length ? `, ${result.filesPruned.length} pruned` : ""}`;
				ctx.ui.notify(msg, result.filesDiverged.length ? "warning" : "info");
			} catch (error) {
				ctx.ui.notify(`pi-restore failed: ${error instanceof Error ? error.message : String(error)}`, "error");
			}
		},
	});

	pi.registerCommand("pi-backup", {
		description: "Back up sanitized Pi configuration to dotfiles (with syntax validation)",
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/).filter(Boolean);
			const dryRun = parts.includes("--dry-run");
			const includeAgentsSkills = parts.includes("--include-agents-skills");
			const destination = parts.find((part) => !part.startsWith("--"));
			try {
				const result = await backupPiConfig({ destination, dryRun, includeAgentsSkills });
				ctx.ui.setWidget("pi-backup", undefined);
				ctx.ui.notify(formatBackupResult(result), "info");
			} catch (error) {
				ctx.ui.notify(`pi-backup failed: ${error instanceof Error ? error.message : String(error)}`, "error");
			}
		},
	});

	pi.registerTool({
		name: "pi_config_restore",
		label: "Pi Config Restore",
		description: "Restore Pi configuration files from dotfiles backup.",
		promptSnippet: "Restore Pi configuration from dotfiles",
		promptGuidelines: [
			"Use pi_config_restore to load backup configurations into the local Pi agent directory.",
			"Restore skips files that were modified locally since last backup. Use force: true to override.",
			"Use sync: true for sync mode (mirror): restores and deletes local extras so the destination matches the backup exactly. This is what you want to keep machines in sync.",
		"Use merge: true (or omit) for merge mode (default): restores new/updated files but keeps local extras.",
		],
		parameters: RestoreParams,
		async execute(_toolCallId, params: RestoreParamsType) {
			try {
				const result = await restorePiConfig(params);
				return { content: [{ type: "text", text: formatRestoreResult(result) }], details: result };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				const details: RestoreResult = {
					destination: expandHome(params.source ?? DEFAULT_DESTINATION),
					filesWritten: [],
					filesSkipped: [{ path: "", reason: message }],
					filesDiverged: [],
					filesPruned: [],
					dryRun: Boolean(params.dryRun),
				};
				return {
					content: [{ type: "text", text: `Error: ${message}` }],
					details,
					isError: true,
				};
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
			"pi_config_backup validates syntax of .ts/.js files before backing up (skips files with errors).",
		],
		parameters: BackupParams,
		async execute(_toolCallId, params: BackupParamsType): Promise<any> {
			try {
				const result = await backupPiConfig(params);
				return { content: [{ type: "text", text: formatBackupResult(result) }], details: result };
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
