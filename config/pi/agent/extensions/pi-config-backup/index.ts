import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
	JSON_FILE_RE,
	TEXT_FILE_RE,
	TS_FILE_RE,
	expandHome,
	extractVersion,
	fileHash,
	redactText,
	redactionWouldBreakFile,
	sanitizeJson,
	shouldSkipEntry,
	syntaxCheck,
} from "./lib.ts";

const VERSION = "0.4.0";
const DEFAULT_DESTINATION = "~/Projects/dotfiles/config/pi";
const PI_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
const AGENTS_SKILLS_DIR = path.join(os.homedir(), ".agents", "skills");
const PRE_RESTORE_SNAPSHOT_DIR = path.join(PI_AGENT_DIR, ".pre-restore-snapshot");
const MANIFEST_FILENAME = ".backup-manifest.json";
const MANAGED_DIRS = ["extensions", "prompts", "themes"];
const MAX_COPY_BYTES = 1024 * 1024;

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
	warnings: string[];
	redactedFiles: number;
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
	force: Type.Optional(Type.Boolean({ description: "Overwrite diverged or untracked local files (and settings.json) without checking." })),
	prune: Type.Optional(Type.Boolean({ description: "Remove local extension/prompt/theme files that no longer exist in the backup (mirror restore)." })),
});

type RestoreParamsType = Static<typeof RestoreParams>;

// --- Utility functions ---

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

async function readJsonFile(filePath: string): Promise<unknown | undefined> {
	try {
		return JSON.parse(await fs.readFile(filePath, "utf8"));
	} catch {
		return undefined;
	}
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

	// Syntax check for JS/TS files before backing up. Loadable JS that fails is
	// excluded; TypeScript that fails is kept with a warning (see lib.syntaxCheck).
	if (LOADABLE_OR_TS(source)) {
		const check = syntaxCheck(source);
		if (!check.ok) {
			result.filesSkipped.push({ path: source, reason: `syntax error: ${check.error}` });
			return;
		}
		if (check.warning) result.warnings.push(`${source}: ${check.warning}`);
	}

	const rawContent = await fs.readFile(source);
	const hash = fileHash(rawContent);
	const relPath = path.relative(dotfilesDir, destination);

	if (JSON_FILE_RE.test(source)) {
		if (shouldPreserveJsonKeys(source)) {
			const textContent = rawContent.toString("utf8");
			const version = extractVersion(textContent);
			const sanitized = redactText(textContent);
			if (sanitized !== textContent) result.redactedFiles++;
			await writeTextToBackup(destination, sanitized, result);
			manifest.files[relPath] = { hash, version, backedUpAt: new Date().toISOString(), size: stat.size };
			return;
		}

		try {
			const parsed = JSON.parse(rawContent.toString("utf8"));
			const sanitized = sanitizeJson(parsed);
			if (JSON.stringify(sanitized) !== JSON.stringify(parsed)) result.redactedFiles++;
			await writeJsonToBackup(destination, sanitized, result);
			manifest.files[relPath] = { hash, backedUpAt: new Date().toISOString(), size: stat.size };
			return;
		} catch {}
	}

	if (TEXT_FILE_RE.test(source)) {
		const textContent = rawContent.toString("utf8");
		const version = extractVersion(textContent);
		const sanitized = redactText(textContent);
		if (redactionWouldBreakFile(source, textContent, sanitized)) {
			const reason = "redaction would alter code/script file; move the secret to settings/env or split test fixtures before backing up";
			result.filesSkipped.push({ path: source, reason });
			result.warnings.push(`${source}: ${reason}`);
			return;
		}
		if (sanitized !== textContent) result.redactedFiles++;
		await writeTextToBackup(destination, sanitized, result);
		manifest.files[relPath] = { hash, version, backedUpAt: new Date().toISOString(), size: stat.size };
		return;
	}

	result.filesSkipped.push({ path: source, reason: "non-text file" });
}

function LOADABLE_OR_TS(filePath: string): boolean {
	return /\.(js|cjs|mjs|jsx)$/i.test(filePath) || TS_FILE_RE.test(filePath);
}

function shouldPreserveJsonKeys(filePath: string): boolean {
	return /(?:^|[\\/])(?:package-lock|npm-shrinkwrap)\.json$/i.test(filePath);
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
		if (entry.isSymbolicLink()) {
			result.filesSkipped.push({ path: src, reason: "symlink (not followed)" });
			continue;
		}
		if (entry.isDirectory()) await copySanitizedDir(src, dst, result, manifest, dotfilesDir);
		else if (entry.isFile()) await copySanitizedFile(src, dst, result, manifest, dotfilesDir);
		else result.filesSkipped.push({ path: src, reason: "not a regular file or directory" });
	}
}

async function backupPiConfig(params: BackupParamsType = {}): Promise<BackupResult> {
	const destination = path.resolve(expandHome(params.destination || DEFAULT_DESTINATION));
	const result: BackupResult = { destination, filesWritten: [], filesSkipped: [], filesPruned: [], warnings: [], redactedFiles: 0, dryRun: Boolean(params.dryRun) };
	const manifest = await loadManifest(destination);

	await ensureDir(destination, result.dryRun);

	const settingsPath = path.join(PI_AGENT_DIR, "settings.json");
	const settings = await readJsonFile(settingsPath);
	if (settings !== undefined) {
		const dstPath = path.join(destination, "agent", "settings.example.json");
		const sanitized = sanitizeJson(settings);
		if (JSON.stringify(sanitized) !== JSON.stringify(settings)) result.redactedFiles++;
		await writeJsonToBackup(dstPath, sanitized, result);
		const rawContent = await fs.readFile(settingsPath);
		const relPath = path.relative(destination, dstPath);
		manifest.files[relPath] = { hash: fileHash(rawContent), backedUpAt: new Date().toISOString(), size: rawContent.length };
	} else {
		result.filesSkipped.push({ path: settingsPath, reason: "missing or invalid JSON" });
	}

	// Note: `skills` is intentionally excluded — Pi skills are controlled by a separate project.
	for (const dirName of MANAGED_DIRS) {
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

interface RestoreCandidate {
	src: string;
	dst: string;
	manifestKey: string;
}

async function collectRestoreFiles(srcDir: string, dstDir: string, manifestPrefix: string, files: RestoreCandidate[]): Promise<void> {
	if (!(await exists(srcDir))) return;
	const entries = await fs.readdir(srcDir, { withFileTypes: true });
	for (const entry of entries) {
		const reason = shouldSkipEntry(entry.name);
		if (reason) continue;
		const src = path.join(srcDir, entry.name);
		const dst = path.join(dstDir, entry.name);
		const key = `${manifestPrefix}/${entry.name}`;
		if (entry.isDirectory()) await collectRestoreFiles(src, dst, key, files);
		else if (entry.isFile()) files.push({ src, dst, manifestKey: key });
	}
}

async function pruneLocalOrphans(localDir: string, keepSet: Set<string>, result: RestoreResult): Promise<boolean> {
	if (!(await exists(localDir))) return true;
	const entries = await fs.readdir(localDir, { withFileTypes: true });
	let emptied = true;
	for (const entry of entries) {
		const full = path.join(localDir, entry.name);
		if (shouldSkipEntry(entry.name)) { emptied = false; continue; }
		if (entry.isDirectory()) {
			const childEmpty = await pruneLocalOrphans(full, keepSet, result);
			if (childEmpty) {
				result.filesPruned.push(full);
				if (!result.dryRun) { try { await fs.rm(full, { recursive: true, force: true }); } catch {} }
			} else {
				emptied = false;
			}
		} else if (entry.isFile()) {
			if (keepSet.has(path.resolve(full))) { emptied = false; continue; }
			result.filesPruned.push(full);
			if (!result.dryRun) { try { await fs.rm(full, { force: true }); } catch {} }
		} else {
			emptied = false;
		}
	}
	return emptied;
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

	const manifest = await loadManifest(sourceDir);

	// Settings is special: the backup is a SANITIZED example (secrets redacted),
	// so we never auto-overwrite a populated settings.json. Restore only when it
	// is missing, or when --force is given (explicitly accepting the redacted copy).
	const settingsExamplePath = path.join(agentSrcDir, "settings.example.json");
	const settingsDstPath = path.join(destination, "settings.json");
	const settingsToRestore: RestoreCandidate[] = [];
	if (await exists(settingsExamplePath)) {
		if (!(await exists(settingsDstPath))) {
			settingsToRestore.push({ src: settingsExamplePath, dst: settingsDstPath, manifestKey: "agent/settings.example.json" });
		} else if (params.force) {
			settingsToRestore.push({ src: settingsExamplePath, dst: settingsDstPath, manifestKey: "agent/settings.example.json" });
			result.filesSkipped.push({ path: settingsExamplePath, reason: "--force: overwriting settings.json with SANITIZED example (redacted secrets)" });
		} else {
			const entry = manifest.files["agent/settings.example.json"];
			const diverged = entry ? fileHash(await fs.readFile(settingsDstPath)) !== entry.hash : true;
			result.filesSkipped.push({
				path: settingsExamplePath,
				reason: diverged
					? "settings.json exists and differs from backup (sanitized example; use --force to overwrite)"
					: "settings.json already exists (in sync; use --force to re-apply example)",
			});
		}
	}

	// Managed directories.
	const dirCandidates: RestoreCandidate[] = [];
	for (const dirName of MANAGED_DIRS) {
		await collectRestoreFiles(path.join(agentSrcDir, dirName), path.join(destination, dirName), `agent/${dirName}`, dirCandidates);
	}

	const allCandidates = [...settingsToRestore, ...dirCandidates];

	const safeFiles: RestoreCandidate[] = [];
	const divergedFiles: Array<RestoreCandidate & { localVersion?: string; backupVersion?: string }> = [];

	for (const cand of allCandidates) {
		const { src, dst, manifestKey } = cand;
		if (!(await exists(dst))) { safeFiles.push(cand); continue; }
		if (params.force) { safeFiles.push(cand); continue; }
		// settings handled above; if it reached safeFiles via !exists it's fine.
		const manifestEntry = manifest.files[manifestKey];
		if (!manifestEntry) {
			// File exists locally but the backup never tracked it. Don't clobber
			// untracked local edits silently — skip and report.
			result.filesSkipped.push({ path: dst, reason: "exists locally but not tracked in backup manifest (use --force to overwrite)" });
			continue;
		}
		const localContent = await fs.readFile(dst);
		if (fileHash(localContent) === manifestEntry.hash) {
			safeFiles.push(cand);
		} else {
			const localVersion = TEXT_FILE_RE.test(dst) ? extractVersion(localContent.toString("utf8")) : undefined;
			divergedFiles.push({ ...cand, localVersion, backupVersion: manifestEntry.version });
		}
	}

	// Snapshot the files we are about to overwrite (skip settings example dst since
	// it's only written when missing or forced).
	const snapshotTargets: string[] = [];
	for (const { dst } of safeFiles) {
		if (await exists(dst)) snapshotTargets.push(dst);
	}
	result.snapshotDir = await createPreRestoreSnapshot(snapshotTargets, result.dryRun);

	for (const { src, dst } of safeFiles) {
		if (!result.dryRun) {
			await fs.mkdir(path.dirname(dst), { recursive: true });
			await fs.copyFile(src, dst);
		}
		result.filesWritten.push(dst);
	}

	for (const { dst, localVersion, backupVersion } of divergedFiles) {
		result.filesDiverged.push({ path: path.relative(destination, dst), localVersion, backupVersion });
	}

	// Optional mirror prune: remove local managed files that aren't in the backup.
	if (params.prune) {
		const keepSet = new Set(dirCandidates.map(({ dst }) => path.resolve(dst)));
		for (const dirName of MANAGED_DIRS) {
			await pruneLocalOrphans(path.join(destination, dirName), keepSet, result);
		}
	}

	return result;
}

async function undoLastRestore(dryRun: boolean): Promise<{ restored: string[]; snapshotDir: string; found: boolean }> {
	const restored: string[] = [];
	if (!(await exists(PRE_RESTORE_SNAPSHOT_DIR))) {
		return { restored, snapshotDir: PRE_RESTORE_SNAPSHOT_DIR, found: false };
	}
	const walk = async (dir: string): Promise<void> => {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) { await walk(full); continue; }
			if (!entry.isFile()) continue;
			const rel = path.relative(PRE_RESTORE_SNAPSHOT_DIR, full);
			const target = path.join(PI_AGENT_DIR, rel);
			if (!dryRun) {
				await fs.mkdir(path.dirname(target), { recursive: true });
				await fs.copyFile(full, target);
			}
			restored.push(target);
		}
	};
	await walk(PRE_RESTORE_SNAPSHOT_DIR);
	return { restored, snapshotDir: PRE_RESTORE_SNAPSHOT_DIR, found: true };
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
- \`~/.pi/agent/skills/\` (managed by a separate project)
- package caches/install dirs such as \`npm/\`, \`git/\`, \`node_modules/\`
- symlinks (not followed)
- files with sensitive-looking names
- API keys, tokens, cookies, OAuth material, and similar strings

## Syntax validation

- Loadable JS (\`.js/.cjs/.mjs/.jsx\`) is validated with \`node --check\`; files with errors are skipped.
- TypeScript sources are best-effort checked but never skipped on parse failure (kept with a warning).

## Redaction safety

- If redaction would modify a code/script file (\`.ts/.js/.sh\` and related extensions), the file is skipped instead of backing up broken redacted code.
- Move real secrets to \`settings.json\`/environment variables, or split fake test fixtures so they are assembled at runtime.

## Restore

Use \`/pi-restore\` or the \`pi_config_restore\` tool. Guardrails:
- Files modified locally since last backup are **skipped** (not overwritten)
- Local files not tracked in the backup manifest are **skipped** (use \`--force\`)
- \`settings.json\` is never auto-overwritten (the backup is a sanitized example); use \`--force\` to apply it
- A pre-restore snapshot is saved to \`~/.pi/agent/.pre-restore-snapshot/\`
- \`/pi-restore-undo\` rolls back the most recent restore from that snapshot
- \`--force\` overrides divergence/untracked protection; \`--prune\` mirrors the backup by removing local orphans
`;
}

function formatBackupResult(result: BackupResult): string {
	const verb = result.dryRun ? "dry-run" : "complete";
	const fileLabel = result.dryRun ? "would write" : "written";
	const skipped = result.filesSkipped.length ? `, ${result.filesSkipped.length} skipped` : "";
	const prunedLabel = result.dryRun ? "would prune" : "pruned";
	const pruned = result.filesPruned.length ? `, ${result.filesPruned.length} ${prunedLabel}` : "";
	const redacted = result.redactedFiles ? `, ${result.redactedFiles} redacted` : "";
	const warned = result.warnings.length ? `, ${result.warnings.length} warning(s)` : "";
	return `Pi config backup ${verb}: ${result.filesWritten.length} files ${fileLabel}${skipped}${pruned}${redacted}${warned} → ${result.destination}`;
}

function formatRestoreResult(result: RestoreResult): string {
	const verb = result.dryRun ? "dry-run" : "complete";
	const lines = [
		`Pi config restore ${verb}`,
		`Destination: ${result.destination}`,
		`Files ${result.dryRun ? "would write" : "written"}: ${result.filesWritten.length}`,
	];
	if (result.snapshotDir) {
		lines.push(`Pre-restore snapshot: ${result.snapshotDir} (undo with /pi-restore-undo)`);
	}
	if (result.filesPruned.length) {
		lines.push(`Pruned (mirror): ${result.filesPruned.length}`);
	}
	if (result.filesSkipped.length) {
		lines.push(`Skipped: ${result.filesSkipped.length}`);
		for (const item of result.filesSkipped.slice(0, 10)) {
			lines.push(`  - ${item.path}: ${item.reason}`);
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
		description: "Restore Pi configuration from dotfiles (divergence protection; --force, --prune, --dry-run)",
		handler: async (args, ctx) => {
			const parts = args.trim().split(/\s+/).filter(Boolean);
			const dryRun = parts.includes("--dry-run");
			const force = parts.includes("--force");
			const prune = parts.includes("--prune");
			const source = parts.find((part) => !part.startsWith("--"));
			try {
				const result = await restorePiConfig({ source, dryRun, force, prune });
				ctx.ui.setWidget("pi-restore", undefined);
				const extras = [
					result.filesDiverged.length ? `${result.filesDiverged.length} diverged` : "",
					result.filesSkipped.length ? `${result.filesSkipped.length} skipped` : "",
					result.filesPruned.length ? `${result.filesPruned.length} pruned` : "",
				].filter(Boolean).join(", ");
				const msg = `Pi config restore ${dryRun ? "dry-run " : ""}complete: ${result.filesWritten.length} written${extras ? ` (${extras})` : ""}`;
				ctx.ui.notify(msg, result.filesDiverged.length ? "warning" : "info");
			} catch (error) {
				ctx.ui.notify(`pi-restore failed: ${error instanceof Error ? error.message : String(error)}`, "error");
			}
		},
	});

	pi.registerCommand("pi-restore-undo", {
		description: "Roll back the most recent /pi-restore using the pre-restore snapshot (--dry-run)",
		handler: async (args, ctx) => {
			const dryRun = args.trim().split(/\s+/).includes("--dry-run");
			try {
				const result = await undoLastRestore(dryRun);
				ctx.ui.setWidget("pi-restore-undo", undefined);
				if (!result.found) {
					ctx.ui.notify("No pre-restore snapshot found — nothing to undo.", "warning");
					return;
				}
				ctx.ui.notify(`Restore undo ${dryRun ? "dry-run " : ""}complete: ${result.restored.length} file(s) rolled back from snapshot`, "info");
			} catch (error) {
				ctx.ui.notify(`pi-restore-undo failed: ${error instanceof Error ? error.message : String(error)}`, "error");
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
			"Restore skips files that were modified locally since last backup or not tracked in the manifest. Use force: true to override.",
			"settings.json is never auto-overwritten (the backup is a sanitized example); force: true applies the redacted example.",
			"Use prune: true to mirror the backup by removing local extension/prompt/theme files absent from the backup.",
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
			"pi_config_backup validates loadable JS with node --check; TypeScript is kept even if the best-effort check cannot parse it (reported as a warning).",
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
