var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var index_exports = {};
__export(index_exports, {
  default: () => piConfigBackup
});
module.exports = __toCommonJS(index_exports);
var import_typebox = require("typebox");
var fs = __toESM(require("node:fs/promises"));
var path2 = __toESM(require("node:path"));
var os2 = __toESM(require("node:os"));

// lib.ts
var crypto = __toESM(require("node:crypto"));
var os = __toESM(require("node:os"));
var path = __toESM(require("node:path"));
var import_node_child_process = require("node:child_process");
var SENSITIVE_KEY_RE = /(api[_-]?key|token|secret|password|passwd|cookie|credential|oauth|authorization|bearer|client[_-]?secret|private[_-]?key|refresh[_-]?token|access[_-]?token|session[_-]?token|pat)/i;
var SKIP_NAME_RE = /^(sessions|node_modules|\.git|\.cache|cache|tmp|temp|logs?|npm|git|\.pre-restore-snapshot)$/i;
var SKIP_FILE_RE = /(\.env($|\.)|secret|secrets|credential|credentials|cookie|cookies|oauth|auth|token|tokens|keychain|known_hosts|id_rsa|id_ed25519|\.pem$|\.p12$|\.pfx$)/i;
var TEXT_FILE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|txt|yaml|yml|toml|sh|bash|zsh|fish|ini|conf|config|gitignore)$/i;
var JSON_FILE_RE = /\.json$/i;
var LOADABLE_JS_RE = /\.(js|cjs|mjs|jsx)$/i;
var TS_FILE_RE = /\.(ts|tsx|mts|cts)$/i;
var VERSION_RE = /(?:const|let|var)\s+VERSION\s*=\s*["']([^"']+)["']/;
function expandHome(inputPath) {
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith("~/")) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
}
function fileHash(content) {
  return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
}
function extractVersion(content) {
  const match = content.match(VERSION_RE);
  return match?.[1];
}
function syntaxCheck(filePath) {
  const isLoadableJs = LOADABLE_JS_RE.test(filePath);
  const isTs = TS_FILE_RE.test(filePath);
  if (!isLoadableJs && !isTs) return { ok: true };
  try {
    const flag = isTs ? "--experimental-strip-types " : "";
    (0, import_node_child_process.execSync)(`node ${flag}--check "${filePath}"`, { stdio: "pipe", timeout: 1e4 });
    return { ok: true };
  } catch (err) {
    const detail = err?.stderr?.toString()?.slice(0, 200) || "syntax error";
    if (isTs) {
      return { ok: true, warning: `node --check could not parse TypeScript (kept anyway): ${detail}` };
    }
    return { ok: false, error: detail };
  }
}
function shouldSkipEntry(name) {
  if (SKIP_NAME_RE.test(name)) return "sensitive or generated directory";
  if (SKIP_FILE_RE.test(name)) return "sensitive-looking filename";
  return void 0;
}
function redactText(input) {
  let text = input;
  text = text.replace(/Bearer\s+[A-Za-z0-9._~+\/-]{16,}=*/gi, "Bearer <REDACTED>");
  text = text.replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{16,})\b/g, "<REDACTED>");
  text = text.replace(/\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA)[A-Z0-9]{16}\b/g, "<REDACTED>");
  text = text.replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, "<REDACTED>");
  text = text.replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, "<REDACTED>");
  text = text.replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g, "<REDACTED_JWT>");
  text = text.replace(new RegExp(`(^|\\n)(\\s*)([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PASSWD|COOKIE|OAUTH|AUTHORIZATION|CLIENT[_-]?SECRET|PRIVATE[_-]?KEY)[A-Z0-9_]*)\\s*[:=]\\s*([^\\n\\r]+)`, "g"), "$1$2$3=<REDACTED>");
  text = text.replace(/(authorization|cookie|set-cookie)\s*:\s*[^\n\r]+/gi, "$1: <REDACTED>");
  return text;
}
function sanitizeJson(value) {
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (value && typeof value === "object") {
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY_RE.test(key) ? "<REDACTED>" : sanitizeJson(nested);
    }
    return output;
  }
  if (typeof value === "string") return redactText(value);
  return value;
}

// index.ts
var VERSION = "0.4.0";
var DEFAULT_DESTINATION = "~/Projects/dotfiles/config/pi";
var PI_AGENT_DIR = path2.join(os2.homedir(), ".pi", "agent");
var AGENTS_SKILLS_DIR = path2.join(os2.homedir(), ".agents", "skills");
var PRE_RESTORE_SNAPSHOT_DIR = path2.join(PI_AGENT_DIR, ".pre-restore-snapshot");
var MANIFEST_FILENAME = ".backup-manifest.json";
var MANAGED_DIRS = ["extensions", "prompts", "themes"];
var MAX_COPY_BYTES = 1024 * 1024;
var BackupParams = import_typebox.Type.Object({
  destination: import_typebox.Type.Optional(import_typebox.Type.String({ description: `Destination directory. Defaults to ${DEFAULT_DESTINATION}.` })),
  dryRun: import_typebox.Type.Optional(import_typebox.Type.Boolean({ description: "Preview what would be copied without writing files." })),
  includeAgentsSkills: import_typebox.Type.Optional(import_typebox.Type.Boolean({ description: "Also back up ~/.agents/skills. Default: false." }))
});
var RestoreParams = import_typebox.Type.Object({
  source: import_typebox.Type.Optional(import_typebox.Type.String({ description: `Source directory. Defaults to ${DEFAULT_DESTINATION}.` })),
  dryRun: import_typebox.Type.Optional(import_typebox.Type.Boolean({ description: "Preview what would be copied without writing files." })),
  force: import_typebox.Type.Optional(import_typebox.Type.Boolean({ description: "Overwrite diverged or untracked local files (and settings.json) without checking." })),
  prune: import_typebox.Type.Optional(import_typebox.Type.Boolean({ description: "Remove local extension/prompt/theme files that no longer exist in the backup (mirror restore)." }))
});
async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function ensureDir(dir, dryRun) {
  if (!dryRun) await fs.mkdir(dir, { recursive: true });
}
async function loadManifest(dotfilesDir) {
  const manifestPath = path2.join(dotfilesDir, MANIFEST_FILENAME);
  try {
    const data = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (data.manifestVersion === 1) return data;
  } catch {
  }
  return { manifestVersion: 1, lastBackupAt: "", files: {} };
}
async function saveManifest(dotfilesDir, manifest, dryRun) {
  if (dryRun) return;
  const manifestPath = path2.join(dotfilesDir, MANIFEST_FILENAME);
  await fs.mkdir(path2.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}
async function readJsonFile(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return void 0;
  }
}
async function writeTextToBackup(filePath, content, result) {
  result.filesWritten.push(filePath);
  if (result.dryRun) return;
  await fs.mkdir(path2.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content.endsWith("\n") ? content : `${content}
`, "utf8");
}
async function writeJsonToBackup(filePath, value, result) {
  await writeTextToBackup(filePath, JSON.stringify(value, null, 2), result);
}
async function copySanitizedFile(source, destination, result, manifest, dotfilesDir) {
  const stat2 = await fs.stat(source);
  if (stat2.size > MAX_COPY_BYTES) {
    result.filesSkipped.push({ path: source, reason: `larger than ${MAX_COPY_BYTES} bytes` });
    return;
  }
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
  const relPath = path2.relative(dotfilesDir, destination);
  if (JSON_FILE_RE.test(source)) {
    if (shouldPreserveJsonKeys(source)) {
      const textContent = rawContent.toString("utf8");
      const version = extractVersion(textContent);
      const sanitized = redactText(textContent);
      if (sanitized !== textContent) result.redactedFiles++;
      await writeTextToBackup(destination, sanitized, result);
      manifest.files[relPath] = { hash, version, backedUpAt: (/* @__PURE__ */ new Date()).toISOString(), size: stat2.size };
      return;
    }
    try {
      const parsed = JSON.parse(rawContent.toString("utf8"));
      const sanitized = sanitizeJson(parsed);
      if (JSON.stringify(sanitized) !== JSON.stringify(parsed)) result.redactedFiles++;
      await writeJsonToBackup(destination, sanitized, result);
      manifest.files[relPath] = { hash, backedUpAt: (/* @__PURE__ */ new Date()).toISOString(), size: stat2.size };
      return;
    } catch {
    }
  }
  if (TEXT_FILE_RE.test(source)) {
    const textContent = rawContent.toString("utf8");
    const version = extractVersion(textContent);
    const sanitized = redactText(textContent);
    if (sanitized !== textContent) result.redactedFiles++;
    await writeTextToBackup(destination, sanitized, result);
    manifest.files[relPath] = { hash, version, backedUpAt: (/* @__PURE__ */ new Date()).toISOString(), size: stat2.size };
    return;
  }
  result.filesSkipped.push({ path: source, reason: "non-text file" });
}
function LOADABLE_OR_TS(filePath) {
  return /\.(js|cjs|mjs|jsx)$/i.test(filePath) || TS_FILE_RE.test(filePath);
}
function shouldPreserveJsonKeys(filePath) {
  return /(?:^|[\\/])(?:package-lock|npm-shrinkwrap)\.json$/i.test(filePath);
}
async function copySanitizedDir(source, destination, result, manifest, dotfilesDir) {
  if (!await exists(source)) return;
  await ensureDir(destination, result.dryRun);
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const reason = shouldSkipEntry(entry.name);
    const src = path2.join(source, entry.name);
    const dst = path2.join(destination, entry.name);
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
async function backupPiConfig(params = {}) {
  const destination = path2.resolve(expandHome(params.destination || DEFAULT_DESTINATION));
  const result = { destination, filesWritten: [], filesSkipped: [], filesPruned: [], warnings: [], redactedFiles: 0, dryRun: Boolean(params.dryRun) };
  const manifest = await loadManifest(destination);
  await ensureDir(destination, result.dryRun);
  const settingsPath = path2.join(PI_AGENT_DIR, "settings.json");
  const settings = await readJsonFile(settingsPath);
  if (settings !== void 0) {
    const dstPath = path2.join(destination, "agent", "settings.example.json");
    const sanitized = sanitizeJson(settings);
    if (JSON.stringify(sanitized) !== JSON.stringify(settings)) result.redactedFiles++;
    await writeJsonToBackup(dstPath, sanitized, result);
    const rawContent = await fs.readFile(settingsPath);
    const relPath = path2.relative(destination, dstPath);
    manifest.files[relPath] = { hash: fileHash(rawContent), backedUpAt: (/* @__PURE__ */ new Date()).toISOString(), size: rawContent.length };
  } else {
    result.filesSkipped.push({ path: settingsPath, reason: "missing or invalid JSON" });
  }
  for (const dirName of MANAGED_DIRS) {
    await copySanitizedDir(path2.join(PI_AGENT_DIR, dirName), path2.join(destination, "agent", dirName), result, manifest, destination);
  }
  if (params.includeAgentsSkills) {
    await copySanitizedDir(AGENTS_SKILLS_DIR, path2.join(destination, "agents", "skills"), result, manifest, destination);
  }
  const writtenSet = new Set(result.filesWritten.map((p) => path2.resolve(p)));
  const managedDirs = [
    path2.join(destination, "agent", "extensions"),
    path2.join(destination, "agent", "prompts"),
    path2.join(destination, "agent", "themes")
  ];
  if (params.includeAgentsSkills) {
    managedDirs.push(path2.join(destination, "agents", "skills"));
  }
  for (const dir of managedDirs) {
    await pruneOrphans(dir, writtenSet, result, manifest, destination);
  }
  pruneStaleManifestEntries(destination, writtenSet, manifest, Boolean(params.includeAgentsSkills));
  manifest.lastBackupAt = (/* @__PURE__ */ new Date()).toISOString();
  await saveManifest(destination, manifest, result.dryRun);
  await writeTextToBackup(path2.join(destination, "README.md"), buildReadme(params.includeAgentsSkills), result);
  return result;
}
function isManagedManifestPath(relPath, includeAgentsSkills) {
  if (relPath === "agent/settings.example.json") return true;
  if (relPath.startsWith("agent/extensions/")) return true;
  if (relPath.startsWith("agent/prompts/")) return true;
  if (relPath.startsWith("agent/themes/")) return true;
  if (includeAgentsSkills && relPath.startsWith("agents/skills/")) return true;
  return false;
}
function pruneStaleManifestEntries(dotfilesDir, writtenSet, manifest, includeAgentsSkills) {
  for (const relPath of Object.keys(manifest.files)) {
    if (!isManagedManifestPath(relPath, includeAgentsSkills)) continue;
    const absolutePath = path2.resolve(path2.join(dotfilesDir, relPath));
    if (!writtenSet.has(absolutePath)) delete manifest.files[relPath];
  }
}
async function pruneOrphans(dir, writtenSet, result, manifest, dotfilesDir) {
  if (!await exists(dir)) return true;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let emptied = true;
  for (const entry of entries) {
    const full = path2.join(dir, entry.name);
    if (entry.isDirectory()) {
      const childEmpty = await pruneOrphans(full, writtenSet, result, manifest, dotfilesDir);
      if (childEmpty) {
        result.filesPruned.push(full);
        if (!result.dryRun) {
          try {
            await fs.rm(full, { recursive: true, force: true });
          } catch {
          }
        }
      } else {
        emptied = false;
      }
    } else if (entry.isFile()) {
      if (writtenSet.has(path2.resolve(full))) {
        emptied = false;
        continue;
      }
      result.filesPruned.push(full);
      if (!result.dryRun) {
        try {
          await fs.rm(full, { force: true });
        } catch {
        }
      }
      const relPath = path2.relative(dotfilesDir, full);
      delete manifest.files[relPath];
    } else {
      emptied = false;
    }
  }
  return emptied;
}
async function createPreRestoreSnapshot(filesToRestore, dryRun) {
  if (dryRun || filesToRestore.length === 0) return void 0;
  try {
    await fs.rm(PRE_RESTORE_SNAPSHOT_DIR, { recursive: true });
  } catch {
  }
  await fs.mkdir(PRE_RESTORE_SNAPSHOT_DIR, { recursive: true });
  for (const filePath of filesToRestore) {
    if (!await exists(filePath)) continue;
    const relPath = path2.relative(PI_AGENT_DIR, filePath);
    const snapshotPath = path2.join(PRE_RESTORE_SNAPSHOT_DIR, relPath);
    await fs.mkdir(path2.dirname(snapshotPath), { recursive: true });
    await fs.copyFile(filePath, snapshotPath);
  }
  return PRE_RESTORE_SNAPSHOT_DIR;
}
async function collectRestoreFiles(srcDir, dstDir, manifestPrefix, files) {
  if (!await exists(srcDir)) return;
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const reason = shouldSkipEntry(entry.name);
    if (reason) continue;
    const src = path2.join(srcDir, entry.name);
    const dst = path2.join(dstDir, entry.name);
    const key = `${manifestPrefix}/${entry.name}`;
    if (entry.isDirectory()) await collectRestoreFiles(src, dst, key, files);
    else if (entry.isFile()) files.push({ src, dst, manifestKey: key });
  }
}
async function pruneLocalOrphans(localDir, keepSet, result) {
  if (!await exists(localDir)) return true;
  const entries = await fs.readdir(localDir, { withFileTypes: true });
  let emptied = true;
  for (const entry of entries) {
    const full = path2.join(localDir, entry.name);
    if (shouldSkipEntry(entry.name)) {
      emptied = false;
      continue;
    }
    if (entry.isDirectory()) {
      const childEmpty = await pruneLocalOrphans(full, keepSet, result);
      if (childEmpty) {
        result.filesPruned.push(full);
        if (!result.dryRun) {
          try {
            await fs.rm(full, { recursive: true, force: true });
          } catch {
          }
        }
      } else {
        emptied = false;
      }
    } else if (entry.isFile()) {
      if (keepSet.has(path2.resolve(full))) {
        emptied = false;
        continue;
      }
      result.filesPruned.push(full);
      if (!result.dryRun) {
        try {
          await fs.rm(full, { force: true });
        } catch {
        }
      }
    } else {
      emptied = false;
    }
  }
  return emptied;
}
async function restorePiConfig(params = {}) {
  const sourceDir = path2.resolve(expandHome(params.source || DEFAULT_DESTINATION));
  const destination = PI_AGENT_DIR;
  const result = {
    destination,
    filesWritten: [],
    filesSkipped: [],
    filesDiverged: [],
    filesPruned: [],
    dryRun: Boolean(params.dryRun)
  };
  if (!await exists(sourceDir)) {
    throw new Error(`Source directory ${sourceDir} does not exist`);
  }
  const agentSrcDir = path2.join(sourceDir, "agent");
  if (!await exists(agentSrcDir)) {
    throw new Error(`Invalid backup: missing agent directory at ${agentSrcDir}`);
  }
  const manifest = await loadManifest(sourceDir);
  const settingsExamplePath = path2.join(agentSrcDir, "settings.example.json");
  const settingsDstPath = path2.join(destination, "settings.json");
  const settingsToRestore = [];
  if (await exists(settingsExamplePath)) {
    if (!await exists(settingsDstPath)) {
      settingsToRestore.push({ src: settingsExamplePath, dst: settingsDstPath, manifestKey: "agent/settings.example.json" });
    } else if (params.force) {
      settingsToRestore.push({ src: settingsExamplePath, dst: settingsDstPath, manifestKey: "agent/settings.example.json" });
      result.filesSkipped.push({ path: settingsExamplePath, reason: "--force: overwriting settings.json with SANITIZED example (redacted secrets)" });
    } else {
      const entry = manifest.files["agent/settings.example.json"];
      const diverged = entry ? fileHash(await fs.readFile(settingsDstPath)) !== entry.hash : true;
      result.filesSkipped.push({
        path: settingsExamplePath,
        reason: diverged ? "settings.json exists and differs from backup (sanitized example; use --force to overwrite)" : "settings.json already exists (in sync; use --force to re-apply example)"
      });
    }
  }
  const dirCandidates = [];
  for (const dirName of MANAGED_DIRS) {
    await collectRestoreFiles(path2.join(agentSrcDir, dirName), path2.join(destination, dirName), `agent/${dirName}`, dirCandidates);
  }
  const allCandidates = [...settingsToRestore, ...dirCandidates];
  const safeFiles = [];
  const divergedFiles = [];
  for (const cand of allCandidates) {
    const { src, dst, manifestKey } = cand;
    if (!await exists(dst)) {
      safeFiles.push(cand);
      continue;
    }
    if (params.force) {
      safeFiles.push(cand);
      continue;
    }
    const manifestEntry = manifest.files[manifestKey];
    if (!manifestEntry) {
      result.filesSkipped.push({ path: dst, reason: "exists locally but not tracked in backup manifest (use --force to overwrite)" });
      continue;
    }
    const localContent = await fs.readFile(dst);
    if (fileHash(localContent) === manifestEntry.hash) {
      safeFiles.push(cand);
    } else {
      const localVersion = TEXT_FILE_RE.test(dst) ? extractVersion(localContent.toString("utf8")) : void 0;
      divergedFiles.push({ ...cand, localVersion, backupVersion: manifestEntry.version });
    }
  }
  const snapshotTargets = [];
  for (const { dst } of safeFiles) {
    if (await exists(dst)) snapshotTargets.push(dst);
  }
  result.snapshotDir = await createPreRestoreSnapshot(snapshotTargets, result.dryRun);
  for (const { src, dst } of safeFiles) {
    if (!result.dryRun) {
      await fs.mkdir(path2.dirname(dst), { recursive: true });
      await fs.copyFile(src, dst);
    }
    result.filesWritten.push(dst);
  }
  for (const { dst, localVersion, backupVersion } of divergedFiles) {
    result.filesDiverged.push({ path: path2.relative(destination, dst), localVersion, backupVersion });
  }
  if (params.prune) {
    const keepSet = new Set(dirCandidates.map(({ dst }) => path2.resolve(dst)));
    for (const dirName of MANAGED_DIRS) {
      await pruneLocalOrphans(path2.join(destination, dirName), keepSet, result);
    }
  }
  return result;
}
async function undoLastRestore(dryRun) {
  const restored = [];
  if (!await exists(PRE_RESTORE_SNAPSHOT_DIR)) {
    return { restored, snapshotDir: PRE_RESTORE_SNAPSHOT_DIR, found: false };
  }
  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path2.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = path2.relative(PRE_RESTORE_SNAPSHOT_DIR, full);
      const target = path2.join(PI_AGENT_DIR, rel);
      if (!dryRun) {
        await fs.mkdir(path2.dirname(target), { recursive: true });
        await fs.copyFile(full, target);
      }
      restored.push(target);
    }
  };
  await walk(PRE_RESTORE_SNAPSHOT_DIR);
  return { restored, snapshotDir: PRE_RESTORE_SNAPSHOT_DIR, found: true };
}
function buildReadme(includeAgentsSkills) {
  return `# Pi config backup

Generated by the global \`pi-config-backup\` extension (v${VERSION}).

This directory is intended to be committed to dotfiles. It excludes or redacts sensitive material.

## Contains

- \`agent/settings.example.json\` sanitized from \`~/.pi/agent/settings.json\`
- \`agent/extensions/\` sanitized global Pi extensions
- \`agent/prompts/\` and \`agent/themes/\` when present (note: \`agent/skills/\` is intentionally excluded \u2014 Pi skills are managed in a separate project)
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
function formatBackupResult(result) {
  const verb = result.dryRun ? "dry-run" : "complete";
  const fileLabel = result.dryRun ? "would write" : "written";
  const skipped = result.filesSkipped.length ? `, ${result.filesSkipped.length} skipped` : "";
  const prunedLabel = result.dryRun ? "would prune" : "pruned";
  const pruned = result.filesPruned.length ? `, ${result.filesPruned.length} ${prunedLabel}` : "";
  const redacted = result.redactedFiles ? `, ${result.redactedFiles} redacted` : "";
  const warned = result.warnings.length ? `, ${result.warnings.length} warning(s)` : "";
  return `Pi config backup ${verb}: ${result.filesWritten.length} files ${fileLabel}${skipped}${pruned}${redacted}${warned} \u2192 ${result.destination}`;
}
function formatRestoreResult(result) {
  const verb = result.dryRun ? "dry-run" : "complete";
  const lines = [
    `Pi config restore ${verb}`,
    `Destination: ${result.destination}`,
    `Files ${result.dryRun ? "would write" : "written"}: ${result.filesWritten.length}`
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
    lines.push("", `\u26A0\uFE0F  ${result.filesDiverged.length} file(s) modified locally since last backup (SKIPPED):`);
    for (const item of result.filesDiverged.slice(0, 20)) {
      const versions = item.localVersion && item.backupVersion ? ` (local: v${item.localVersion}, backup: v${item.backupVersion})` : "";
      lines.push(`  - ${item.path}${versions}`);
    }
    lines.push("", "Run pi_config_backup first to capture local changes, or use --force to overwrite.");
  }
  return lines.join("\n");
}
function piConfigBackup(pi) {
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
        ctx.ui.setWidget("pi-restore", void 0);
        const extras = [
          result.filesDiverged.length ? `${result.filesDiverged.length} diverged` : "",
          result.filesSkipped.length ? `${result.filesSkipped.length} skipped` : "",
          result.filesPruned.length ? `${result.filesPruned.length} pruned` : ""
        ].filter(Boolean).join(", ");
        const msg = `Pi config restore ${dryRun ? "dry-run " : ""}complete: ${result.filesWritten.length} written${extras ? ` (${extras})` : ""}`;
        ctx.ui.notify(msg, result.filesDiverged.length ? "warning" : "info");
      } catch (error) {
        ctx.ui.notify(`pi-restore failed: ${error instanceof Error ? error.message : String(error)}`, "error");
      }
    }
  });
  pi.registerCommand("pi-restore-undo", {
    description: "Roll back the most recent /pi-restore using the pre-restore snapshot (--dry-run)",
    handler: async (args, ctx) => {
      const dryRun = args.trim().split(/\s+/).includes("--dry-run");
      try {
        const result = await undoLastRestore(dryRun);
        ctx.ui.setWidget("pi-restore-undo", void 0);
        if (!result.found) {
          ctx.ui.notify("No pre-restore snapshot found \u2014 nothing to undo.", "warning");
          return;
        }
        ctx.ui.notify(`Restore undo ${dryRun ? "dry-run " : ""}complete: ${result.restored.length} file(s) rolled back from snapshot`, "info");
      } catch (error) {
        ctx.ui.notify(`pi-restore-undo failed: ${error instanceof Error ? error.message : String(error)}`, "error");
      }
    }
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
        ctx.ui.setWidget("pi-backup", void 0);
        ctx.ui.notify(formatBackupResult(result), "info");
      } catch (error) {
        ctx.ui.notify(`pi-backup failed: ${error instanceof Error ? error.message : String(error)}`, "error");
      }
    }
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
      "Use prune: true to mirror the backup by removing local extension/prompt/theme files absent from the backup."
    ],
    parameters: RestoreParams,
    async execute(_toolCallId, params) {
      try {
        const result = await restorePiConfig(params);
        return { content: [{ type: "text", text: formatRestoreResult(result) }], details: result };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const details = {
          destination: expandHome(params.source ?? DEFAULT_DESTINATION),
          filesWritten: [],
          filesSkipped: [{ path: "", reason: message }],
          filesDiverged: [],
          filesPruned: [],
          dryRun: Boolean(params.dryRun)
        };
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          details,
          isError: true
        };
      }
    }
  });
  pi.registerTool({
    name: "pi_config_backup",
    label: "Pi Config Backup",
    description: "Back up sanitized Pi configuration files to dotfiles without copying sessions or secrets.",
    promptSnippet: "Back up sanitized Pi configuration to dotfiles",
    promptGuidelines: [
      "Use pi_config_backup only when the user asks to back up Pi configuration files.",
      "pi_config_backup must not copy sessions, API keys, tokens, cookies, OAuth material, private keys, or auth files.",
      "pi_config_backup validates loadable JS with node --check; TypeScript is kept even if the best-effort check cannot parse it (reported as a warning)."
    ],
    parameters: BackupParams,
    async execute(_toolCallId, params) {
      try {
        const result = await backupPiConfig(params);
        return { content: [{ type: "text", text: formatBackupResult(result) }], details: result };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          details: { error: String(error) },
          isError: true
        };
      }
    }
  });
}
