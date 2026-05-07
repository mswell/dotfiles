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
var path = __toESM(require("node:path"));
var os = __toESM(require("node:os"));
var VERSION = "0.1.0";
var DEFAULT_DESTINATION = "~/Projects/dotfiles/config/pi";
var PI_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
var AGENTS_SKILLS_DIR = path.join(os.homedir(), ".agents", "skills");
var SENSITIVE_KEY_RE = /(api[_-]?key|token|secret|password|passwd|cookie|credential|oauth|authorization|bearer|client[_-]?secret|private[_-]?key|refresh[_-]?token|access[_-]?token|session[_-]?token|pat)/i;
var SKIP_NAME_RE = /^(sessions|node_modules|\.git|\.cache|cache|tmp|temp|logs?|npm|git)$/i;
var SKIP_FILE_RE = /(\.env($|\.)|secret|secrets|credential|credentials|cookie|cookies|oauth|auth|token|tokens|keychain|known_hosts|id_rsa|id_ed25519|\.pem$|\.p12$|\.pfx$)/i;
var TEXT_FILE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|txt|yaml|yml|toml|sh|bash|zsh|fish|ini|conf|config|gitignore)$/i;
var JSON_FILE_RE = /\.json$/i;
var MAX_COPY_BYTES = 1024 * 1024;
var BackupParams = import_typebox.Type.Object({
  destination: import_typebox.Type.Optional(import_typebox.Type.String({ description: `Destination directory. Defaults to ${DEFAULT_DESTINATION}.` })),
  dryRun: import_typebox.Type.Optional(import_typebox.Type.Boolean({ description: "Preview what would be copied without writing files." })),
  includeAgentsSkills: import_typebox.Type.Optional(import_typebox.Type.Boolean({ description: "Also back up ~/.agents/skills. Default: false." }))
});
function expandHome(inputPath) {
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith("~/")) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
}
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
async function writeText(filePath, content, result) {
  result.filesWritten.push(filePath);
  if (result.dryRun) return;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content.endsWith("\n") ? content : `${content}
`, "utf8");
}
async function writeJson(filePath, value, result) {
  await writeText(filePath, JSON.stringify(value, null, 2), result);
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
function redactText(input) {
  let text = input;
  text = text.replace(/Bearer\s+[A-Za-z0-9._~+\/-]{16,}=*/gi, "Bearer <REDACTED>");
  text = text.replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})\b/g, "<REDACTED>");
  text = text.replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g, "<REDACTED_JWT>");
  text = text.replace(new RegExp(`(^|\\n)(\\s*)([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PASSWD|COOKIE|OAUTH|AUTHORIZATION|CLIENT[_-]?SECRET|PRIVATE[_-]?KEY)[A-Z0-9_]*)\\s*[:=]\\s*([^\\n\\r]+)`, "g"), "$1$2$3=<REDACTED>");
  text = text.replace(/(authorization|cookie|set-cookie)\s*:\s*[^\n\r]+/gi, "$1: <REDACTED>");
  return text;
}
async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return void 0;
  }
}
function shouldSkipEntry(name) {
  if (SKIP_NAME_RE.test(name)) return "sensitive or generated directory";
  if (SKIP_FILE_RE.test(name)) return "sensitive-looking filename";
  return void 0;
}
async function copySanitizedFile(source, destination, result) {
  const stat2 = await fs.stat(source);
  if (stat2.size > MAX_COPY_BYTES) {
    result.filesSkipped.push({ path: source, reason: `larger than ${MAX_COPY_BYTES} bytes` });
    return;
  }
  if (JSON_FILE_RE.test(source)) {
    const parsed = await readJson(source);
    if (parsed !== void 0) {
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
async function copySanitizedDir(source, destination, result) {
  if (!await exists(source)) return;
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
async function restorePiConfig(params = {}) {
  const sourceDir = path.resolve(expandHome(params.source || DEFAULT_DESTINATION));
  const destination = path.resolve(expandHome("~/.pi/agent"));
  const result = { destination, filesWritten: [], filesSkipped: [], dryRun: Boolean(params.dryRun) };
  if (!await exists(sourceDir)) {
    throw new Error(`Source directory ${sourceDir} does not exist`);
  }
  const agentSrcDir = path.join(sourceDir, "agent");
  if (!await exists(agentSrcDir)) {
    throw new Error(`Invalid backup: missing agent directory at ${agentSrcDir}`);
  }
  await ensureDir(destination, result.dryRun);
  const settingsExamplePath = path.join(agentSrcDir, "settings.example.json");
  const settingsDstPath = path.join(destination, "settings.json");
  if (await exists(settingsExamplePath)) {
    if (await exists(settingsDstPath)) {
      result.filesSkipped.push({ path: settingsExamplePath, reason: "settings.json already exists in destination" });
    } else {
      const content = await fs.readFile(settingsExamplePath, "utf8");
      await writeText(settingsDstPath, content, result);
    }
  }
  for (const dirName of ["extensions", "skills", "prompts", "themes"]) {
    const srcDir = path.join(agentSrcDir, dirName);
    const dstDir = path.join(destination, dirName);
    if (await exists(srcDir)) {
      await copySanitizedDir(srcDir, dstDir, result);
    }
  }
  return result;
}
async function backupPiConfig(params = {}) {
  const destination = path.resolve(expandHome(params.destination || DEFAULT_DESTINATION));
  const result = { destination, filesWritten: [], filesSkipped: [], dryRun: Boolean(params.dryRun) };
  await ensureDir(destination, result.dryRun);
  const settingsPath = path.join(PI_AGENT_DIR, "settings.json");
  const settings = await readJson(settingsPath);
  if (settings !== void 0) {
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
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    source: {
      piAgentDir: PI_AGENT_DIR,
      agentsSkillsDir: params.includeAgentsSkills ? AGENTS_SKILLS_DIR : void 0
    },
    redaction: {
      skipsSessions: true,
      skipsPackageCaches: true,
      skipsSensitiveFilenames: true,
      redactsSensitiveKeysAndTokenPatterns: true
    },
    filesWritten: result.filesWritten.map((file) => path.relative(destination, file)),
    filesSkipped: result.filesSkipped.map((item) => ({ ...item, path: item.path.startsWith(destination) ? path.relative(destination, item.path) : item.path }))
  }, result);
  return result;
}
function buildReadme(includeAgentsSkills) {
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
function formatCompactResult(result) {
  const verb = result.dryRun ? "dry-run" : "complete";
  const fileLabel = result.dryRun ? "would write" : "written";
  const skipped = result.filesSkipped.length ? `, ${result.filesSkipped.length} skipped` : "";
  return `Pi config backup ${verb}: ${result.filesWritten.length} files ${fileLabel}${skipped} \u2192 ${result.destination}`;
}
function piConfigBackup(pi) {
  pi.registerCommand("pi-restore", {
    description: "Restore Pi configuration from dotfiles",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const dryRun = parts.includes("--dry-run");
      const source = parts.find((part) => !part.startsWith("--"));
      try {
        const result = await restorePiConfig({ source, dryRun });
        ctx.ui.setWidget("pi-restore", void 0);
        ctx.ui.notify(`Pi config restore ${dryRun ? "dry-run " : ""}complete: ${result.filesWritten.length} files written`, "info");
      } catch (error) {
        ctx.ui.notify(`pi-restore failed: ${error instanceof Error ? error.message : String(error)}`, "error");
      }
    }
  });
  pi.registerCommand("pi-backup", {
    description: "Back up sanitized Pi configuration to dotfiles",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const dryRun = parts.includes("--dry-run");
      const includeAgentsSkills = parts.includes("--include-agents-skills");
      const destination = parts.find((part) => !part.startsWith("--"));
      try {
        const result = await backupPiConfig({ destination, dryRun, includeAgentsSkills });
        ctx.ui.setWidget("pi-backup", void 0);
        ctx.ui.notify(formatCompactResult(result), "info");
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
      "Use pi_config_restore to load backup configurations into the local Pi agent directory."
    ],
    parameters: import_typebox.Type.Object({
      source: import_typebox.Type.Optional(import_typebox.Type.String({ description: `Source directory. Defaults to ${DEFAULT_DESTINATION}.` })),
      dryRun: import_typebox.Type.Optional(import_typebox.Type.Boolean({ description: "Preview what would be copied without writing files." }))
    }),
    async execute(_toolCallId, params) {
      try {
        const result = await restorePiConfig(params);
        return { content: [{ type: "text", text: `Pi config restore ${params.dryRun ? "dry-run " : ""}complete: ${result.filesWritten.length} files written` }], details: result };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          details: { error: String(error) },
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
      "pi_config_backup must not copy sessions, API keys, tokens, cookies, OAuth material, private keys, or auth files."
    ],
    parameters: BackupParams,
    async execute(_toolCallId, params) {
      try {
        const result = await backupPiConfig(params);
        return { content: [{ type: "text", text: formatCompactResult(result) }], details: result };
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
