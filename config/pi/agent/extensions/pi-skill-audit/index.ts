import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Container, type SelectItem, SelectList, Text } from "@earendil-works/pi-tui";
import { Type, type Static } from "typebox";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";

const VERSION = "0.1.0";
const REPORT_DIR = path.join(".pi", "skill-audit");
const REPORT_FILE = "report.md";
const MAX_VISIBLE_LINES = 80;
const MAX_VISIBLE_CHARS = 180;

const AuditParams = Type.Object({
	scope: Type.Optional(Type.Union([
		Type.Literal("all"),
		Type.Literal("global"),
		Type.Literal("project"),
	], { description: "Skill scope to audit. Defaults to all." })),
	query: Type.Optional(Type.String({ description: "Optional skill name/path substring filter." })),
});

type AuditParamsType = Static<typeof AuditParams>;

const ImproveParams = Type.Object({
	query: Type.String({ description: "Skill name/path substring to improve." }),
});

type ImproveParamsType = Static<typeof ImproveParams>;
type Scope = "all" | "global" | "project";
type Severity = "error" | "warn" | "info";

interface SkillCandidate {
	nameHint: string;
	path: string;
	root: string;
	scope: "global" | "project";
	kind: "directory" | "file";
}

interface Finding {
	severity: Severity;
	code: string;
	message: string;
}

interface SkillAudit {
	candidate: SkillCandidate;
	frontmatter: Record<string, string>;
	content: string;
	findings: Finding[];
}

function now(): string {
	return new Date().toISOString();
}

function expandHome(value: string): string {
	if (value === "~") return os.homedir();
	if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
	return value;
}

async function exists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function statSafe(filePath: string) {
	try {
		return await fs.stat(filePath);
	} catch {
		return undefined;
	}
}

async function realPathSafe(filePath: string): Promise<string> {
	try {
		return await fs.realpath(filePath);
	} catch {
		return path.resolve(filePath);
	}
}

async function skillSourceInfo(candidate: SkillCandidate): Promise<{ displayPath: string; sourcePath: string; isSymlink: boolean }> {
	const displayPath = path.resolve(candidate.path);
	const sourcePath = await realPathSafe(candidate.path);
	return { displayPath, sourcePath, isSymlink: displayPath !== sourcePath };
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

async function readJson(filePath: string): Promise<any | undefined> {
	try {
		return JSON.parse(await fs.readFile(filePath, "utf8"));
	} catch {
		return undefined;
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
	const harnessRoot = await findUp(cwd, path.join(".pi", "harness", "index.json"));
	if (harnessRoot) return harnessRoot;
	const gitRoot = await findUp(cwd, ".git");
	return gitRoot ?? path.resolve(cwd);
}

async function ancestorDirs(cwd: string): Promise<string[]> {
	const root = (await findUp(cwd, ".git")) ?? path.parse(path.resolve(cwd)).root;
	const out: string[] = [];
	let current = path.resolve(cwd);
	while (true) {
		out.push(current);
		if (current === root) break;
		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}
	return out;
}

async function walk(dir: string, visitor: (filePath: string, dirent: any) => Promise<void>): Promise<void> {
	let entries: any[] = [];
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".archive" || entry.name === ".hub") continue;
		const filePath = path.join(dir, entry.name);
		await visitor(filePath, entry);
		if (entry.isDirectory()) await walk(filePath, visitor);
		else if (entry.isSymbolicLink()) {
			const st = await statSafe(filePath);
			if (st?.isDirectory()) await walk(filePath, visitor);
		}
	}
}

async function settingsSkillPaths(projectRoot: string): Promise<string[]> {
	const files = [
		path.join(os.homedir(), ".pi", "agent", "settings.json"),
		path.join(projectRoot, ".pi", "settings.json"),
	];
	const paths: string[] = [];
	for (const file of files) {
		const settings = await readJson(file);
		if (!settings || !Array.isArray(settings.skills)) continue;
		for (const item of settings.skills) {
			if (typeof item !== "string" || !item.trim()) continue;
			const expanded = expandHome(item.replace(/\$\{([^}]+)\}/g, (_m, key) => process.env[key] ?? ""));
			paths.push(path.resolve(path.dirname(file), expanded));
		}
	}
	return paths;
}

async function discoverSkills(cwd: string, scope: Scope): Promise<SkillCandidate[]> {
	const projectRoot = await resolveProjectRoot(cwd);
	const candidates: SkillCandidate[] = [];
	const seen = new Set<string>();
	const add = async (candidate: SkillCandidate) => {
		const key = path.resolve(candidate.path);
		if (seen.has(key)) return;
		seen.add(key);
		candidates.push(candidate);
	};
	const scanRoot = async (root: string, candidateScope: "global" | "project", rootMd: boolean) => {
		if (!(await exists(root))) return;
		let rootEntries: any[] = [];
		try {
			rootEntries = await fs.readdir(root, { withFileTypes: true });
		} catch {
			return;
		}
		if (rootMd) {
			for (const entry of rootEntries) {
				if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
					await add({ nameHint: path.basename(entry.name, ".md"), path: path.join(root, entry.name), root, scope: candidateScope, kind: "file" });
				}
			}
		}
		await walk(root, async (filePath, entry) => {
			if (entry.isFile() && entry.name === "SKILL.md") {
				await add({ nameHint: path.basename(path.dirname(filePath)), path: filePath, root, scope: candidateScope, kind: "directory" });
			}
		});
	};

	if (scope === "all" || scope === "global") {
		await scanRoot(path.join(os.homedir(), ".pi", "agent", "skills"), "global", true);
		await scanRoot(path.join(os.homedir(), ".agents", "skills"), "global", false);
	}
	if (scope === "all" || scope === "project") {
		for (const dir of await ancestorDirs(cwd)) {
			await scanRoot(path.join(dir, ".pi", "skills"), "project", true);
			await scanRoot(path.join(dir, ".agents", "skills"), "project", false);
		}
	}
	if (scope === "all") {
		for (const item of await settingsSkillPaths(projectRoot)) {
			const st = await statSafe(item);
			if (!st) continue;
			if (st.isFile() && item.endsWith(".md")) {
				await add({ nameHint: path.basename(item, ".md"), path: item, root: path.dirname(item), scope: item.includes(`${path.sep}.pi${path.sep}`) ? "project" : "global", kind: "file" });
			} else if (st.isDirectory()) {
				await scanRoot(item, item.startsWith(projectRoot) ? "project" : "global", true);
			}
		}
	}
	return candidates.sort((a, b) => a.nameHint.localeCompare(b.nameHint) || a.path.localeCompare(b.path));
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string; hasFrontmatter: boolean } {
	if (!content.startsWith("---\n")) return { frontmatter: {}, body: content, hasFrontmatter: false };
	const end = content.indexOf("\n---", 4);
	if (end < 0) return { frontmatter: {}, body: content, hasFrontmatter: false };
	const raw = content.slice(4, end).trim();
	const frontmatter: Record<string, string> = {};
	for (const line of raw.split("\n")) {
		const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!match) continue;
		frontmatter[match[1]] = match[2].replace(/^['"]|['"]$/g, "").trim();
	}
	return { frontmatter, body: content.slice(end + 4), hasFrontmatter: true };
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string): void {
	findings.push({ severity, code, message });
}

function isValidSkillName(name: string): boolean {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) && name.length <= 64;
}

function findMarkdownLinks(body: string): string[] {
	const links: string[] = [];
	const re = /\[[^\]]*\]\(([^)]+)\)/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(body))) links.push(match[1].trim());
	return links;
}

function findPathMentions(body: string): string[] {
	const mentions = new Set<string>();
	const re = /(?:^|[\s`"'])((?:references|scripts|templates|assets)\/[^\s`"')]+)/gm;
	let match: RegExpExecArray | null;
	while ((match = re.exec(body))) mentions.add(match[1].replace(/[.,;:]$/, ""));
	return [...mentions];
}

async function auditSkill(candidate: SkillCandidate, duplicateNames: Map<string, SkillCandidate[]>): Promise<SkillAudit> {
	const content = await readText(candidate.path);
	const { frontmatter, body, hasFrontmatter } = parseFrontmatter(content);
	const findings: Finding[] = [];
	const name = frontmatter.name ?? "";
	const description = frontmatter.description ?? "";
	const skillDir = candidate.kind === "directory" ? path.dirname(candidate.path) : path.dirname(candidate.path);

	if (!hasFrontmatter) addFinding(findings, "error", "missing-frontmatter", "Missing YAML frontmatter block delimited by ---.");
	if (!name) addFinding(findings, "error", "missing-name", "Missing required frontmatter field: name.");
	else if (!isValidSkillName(name)) addFinding(findings, "error", "invalid-name", "Skill name must be lowercase letters/numbers/hyphens, max 64 chars, no leading/trailing/consecutive hyphens.");
	if (name && candidate.kind === "directory" && path.basename(skillDir) !== name) addFinding(findings, "warn", "name-dir-mismatch", `Frontmatter name '${name}' does not match parent directory '${path.basename(skillDir)}'.`);
	if (name && candidate.kind === "file" && path.basename(candidate.path, ".md") !== name) addFinding(findings, "warn", "name-file-mismatch", `Frontmatter name '${name}' does not match file stem '${path.basename(candidate.path, ".md")}'.`);
	if (!description) addFinding(findings, "error", "missing-description", "Missing required frontmatter field: description. Pi will not load skills without descriptions.");
	else {
		if (description.length > 1024) addFinding(findings, "error", "description-too-long", `Description is ${description.length} chars; max is 1024.`);
		if (description.length < 35 || /^(helps? with|useful for|does things|misc)/i.test(description)) addFinding(findings, "warn", "vague-description", "Description looks vague; describe exact triggers and tasks so the model loads it only when useful.");
	}
	if (name && (duplicateNames.get(name)?.length ?? 0) > 1) addFinding(findings, "warn", "duplicate-name", "Another discovered skill has the same name; Pi keeps the first and warns on collisions.");
	if (content.length > 12000) addFinding(findings, "warn", "large-skill", `SKILL.md is ${content.length} chars; consider moving details to references/ for progressive disclosure.`);
	if (!/when to use|use when|trigger/i.test(body)) addFinding(findings, "info", "missing-usage-trigger", "No explicit 'when to use' / trigger guidance found.");
	if (!/verify|validation|test|confirm/i.test(body)) addFinding(findings, "info", "missing-verification", "No verification/validation section found.");
	if (!/pitfall|failure|caveat|avoid|warning/i.test(body)) addFinding(findings, "info", "missing-pitfalls", "No pitfalls/caveats section found.");
	if (/ignore previous instructions|disregard.+instructions|system prompt|you are now/i.test(content)) addFinding(findings, "warn", "injection-pattern", "Skill contains phrases commonly seen in prompt injection; review manually.");

	const referenced = new Set<string>();
	for (const link of findMarkdownLinks(body)) {
		if (/^(https?:|mailto:|#)/i.test(link)) continue;
		referenced.add(link.split("#")[0]);
	}
	for (const mention of findPathMentions(body)) referenced.add(mention);
	for (const rel of referenced) {
		if (!rel || rel.includes("..")) continue;
		if (!(await exists(path.join(skillDir, rel)))) addFinding(findings, "warn", "missing-reference", `Referenced file does not exist: ${rel}`);
	}

	if (candidate.kind === "directory") {
		const scriptsDir = path.join(skillDir, "scripts");
		if (await exists(scriptsDir)) {
			await walk(scriptsDir, async (filePath, entry) => {
				if (!entry.isFile() || !/\.(sh|bash|py|js|ts)$/.test(entry.name)) return;
				const st = await statSafe(filePath);
				if (st && /\.(sh|bash)$/.test(entry.name) && (st.mode & 0o111) === 0) addFinding(findings, "info", "script-not-executable", `Shell script is not executable: ${path.relative(skillDir, filePath)}`);
			});
		}
	}

	return { candidate, frontmatter, content, findings };
}

function severityRank(severity: Severity): number {
	return severity === "error" ? 0 : severity === "warn" ? 1 : 2;
}

function renderReport(audits: SkillAudit[], scope: Scope, query: string | undefined, projectRoot: string): string {
	const counts = { error: 0, warn: 0, info: 0 };
	for (const audit of audits) for (const finding of audit.findings) counts[finding.severity]++;
	const lines = [
		"# Pi Skill Audit Report",
		"",
		`Generated: ${now()}`,
		`Version: ${VERSION}`,
		`Root: ${projectRoot}`,
		`Scope: ${scope}`,
		`Query: ${query || "(none)"}`,
		`Skills audited: ${audits.length}`,
		`Findings: ${counts.error} error, ${counts.warn} warn, ${counts.info} info`,
		"",
		"## Policy",
		"",
		"This report is deterministic and read-only. It does not use an LLM and does not edit skills.",
		"Prioritize errors first; warnings next; info items are quality suggestions, not blockers.",
		"",
	];

	if (!audits.length) {
		lines.push("No skills found for this scope/query.");
		return lines.join("\n");
	}

	const sorted = [...audits].sort((a, b) => {
		const aWorst = Math.min(...a.findings.map((f) => severityRank(f.severity)), 99);
		const bWorst = Math.min(...b.findings.map((f) => severityRank(f.severity)), 99);
		return aWorst - bWorst || a.candidate.nameHint.localeCompare(b.candidate.nameHint);
	});

	lines.push("## Summary", "");
	for (const audit of sorted) {
		const name = audit.frontmatter.name || audit.candidate.nameHint;
		const localCounts = { error: 0, warn: 0, info: 0 };
		for (const finding of audit.findings) localCounts[finding.severity]++;
		const rel = path.relative(projectRoot, audit.candidate.path);
		lines.push(`- **${name}** — ${localCounts.error} error, ${localCounts.warn} warn, ${localCounts.info} info — \`${rel.startsWith("..") ? audit.candidate.path : rel}\``);
	}

	lines.push("", "## Details", "");
	for (const audit of sorted) {
		const name = audit.frontmatter.name || audit.candidate.nameHint;
		lines.push(`### ${name}`, "", `Path: \`${audit.candidate.path}\``, `Scope: ${audit.candidate.scope}`, "");
		if (!audit.findings.length) {
			lines.push("No findings.", "");
			continue;
		}
		for (const finding of [...audit.findings].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))) {
			const icon = finding.severity === "error" ? "❌" : finding.severity === "warn" ? "⚠️" : "ℹ️";
			lines.push(`- ${icon} **${finding.code}**: ${finding.message}`);
		}
		lines.push("");
	}
	return lines.join("\n");
}

async function buildNameMap(candidates: SkillCandidate[]): Promise<Map<string, SkillCandidate[]>> {
	const names = new Map<string, SkillCandidate[]>();
	for (const candidate of candidates) {
		const parsed = parseFrontmatter(await readText(candidate.path));
		const name = parsed.frontmatter.name || candidate.nameHint;
		if (!names.has(name)) names.set(name, []);
		names.get(name)!.push(candidate);
	}
	return names;
}

async function runAudit(cwd: string, params: AuditParamsType): Promise<{ report: string; reportPath: string; audited: number; counts: Record<Severity, number> }> {
	const scope = params.scope ?? "all";
	const query = params.query?.trim();
	const projectRoot = await resolveProjectRoot(cwd);
	let candidates = await discoverSkills(cwd, scope);
	if (query) {
		const q = query.toLowerCase();
		candidates = candidates.filter((c) => c.nameHint.toLowerCase().includes(q) || c.path.toLowerCase().includes(q));
	}

	const names = await buildNameMap(candidates);

	const audits: SkillAudit[] = [];
	for (const candidate of candidates) audits.push(await auditSkill(candidate, names));
	const report = renderReport(audits, scope, query, projectRoot);
	const reportPath = path.join(projectRoot, REPORT_DIR, REPORT_FILE);
	await writeText(reportPath, report);
	const counts = { error: 0, warn: 0, info: 0 };
	for (const audit of audits) for (const finding of audit.findings) counts[finding.severity]++;
	return { report, reportPath, audited: audits.length, counts };
}

function slugify(value: string): string {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80) || "skill";
}

function textFromResponse(response: any): string {
	const content = response?.content;
	if (Array.isArray(content)) {
		return content.filter((item) => item?.type === "text" && typeof item.text === "string").map((item) => item.text).join("\n");
	}
	return typeof content === "string" ? content : "";
}

function formatFindings(findings: Finding[]): string {
	if (!findings.length) return "No deterministic audit findings.";
	return findings
		.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
		.map((f) => `- ${f.severity.toUpperCase()} ${f.code}: ${f.message}`)
		.join("\n");
}

async function selectSkill(cwd: string, query: string): Promise<{ candidate?: SkillCandidate; matches: SkillCandidate[]; names: Map<string, SkillCandidate[]> }> {
	const candidates = await discoverSkills(cwd, "all");
	const names = await buildNameMap(candidates);
	const parsed = await Promise.all(candidates.map(async (candidate) => ({ candidate, frontmatter: parseFrontmatter(await readText(candidate.path)).frontmatter })));
	const q = query.trim().toLowerCase();
	const exact = parsed.filter(({ candidate, frontmatter }) =>
		(frontmatter.name || "").toLowerCase() === q ||
		candidate.nameHint.toLowerCase() === q ||
		path.basename(candidate.path, ".md").toLowerCase() === q,
	).map((item) => item.candidate);
	const matches = exact.length ? exact : parsed.filter(({ candidate, frontmatter }) =>
		(frontmatter.name || "").toLowerCase().includes(q) ||
		candidate.nameHint.toLowerCase().includes(q) ||
		candidate.path.toLowerCase().includes(q),
	).map((item) => item.candidate);
	return { candidate: matches.length === 1 ? matches[0] : undefined, matches, names };
}

async function buildImprovePrompt(audit: SkillAudit): Promise<string> {
	const name = audit.frontmatter.name || audit.candidate.nameHint;
	const content = truncate(audit.content, 100_000);
	const source = await skillSourceInfo(audit.candidate);
	return `You are reviewing a Pi Agent Skill. Produce a SAFE IMPROVEMENT PROPOSAL ONLY. Do not rewrite the file blindly and do not claim changes were applied.

Target skill: ${name}
Display path: ${source.displayPath}
Resolved source path: ${source.sourcePath}
Symlink: ${source.isSymlink ? "yes" : "no"}
Scope: ${audit.candidate.scope}

Deterministic audit findings:
${formatFindings(audit.findings)}

Optimization goals:
1. Improve invocation reliability: make the YAML description specific about when the skill should and should not be used.
2. Improve execution quality: sharpen concrete steps, tool/file usage, pitfalls, and verification guidance.
3. Improve maintainability: keep SKILL.md concise, preserve progressive disclosure, and move long reference material to references/ only if clearly beneficial.
4. Preserve intent and safety: do not broaden scope, invent capabilities, add permanent global rules, or remove explicit safety/approval gates.
5. Prefer small targeted patches over full rewrites.

Review rubric:
Score each dimension from 1-5 and justify briefly.
- Completeness: covers the core workflow and required context without obvious gaps.
- Actionability: gives concrete steps an agent can execute, not just principles.
- Conciseness: avoids bloat, duplication, and irrelevant background in SKILL.md.
- Robustness: handles edge cases, ambiguity, failures, and stale assumptions.
- Invocation clarity: frontmatter description and triggers route the skill precisely.
- Safety/approval: risky actions, secrets, destructive edits, network calls, and user approval are handled explicitly.
- Validation: tells the agent how to check that the skill's work succeeded.

Required output format:
## Review scores
- Completeness: <1-5> — <reason>
- Actionability: <1-5> — <reason>
- Conciseness: <1-5> — <reason>
- Robustness: <1-5> — <reason>
- Invocation clarity: <1-5> — <reason>
- Safety/approval: <1-5> — <reason>
- Validation: <1-5> — <reason>

## Main gaps
List the 3-5 highest-impact gaps. Tie each gap to evidence from the skill or deterministic audit findings.

## Proposed changes
Use bullets. For each change include: target section/file, why it helps routing or task performance, and risk.

## Suggested patch
Provide a unified diff or exact edit blocks the user can review. Keep patches minimal and do not imply they were applied.

## Eval scenarios
Provide lightweight scenarios for future manual/automated testing:
### Should invoke
- <user request that should trigger this skill and expected behavior>
### Should not invoke
- <near-miss request that should not trigger this skill and why>
### Stress task
- <hard realistic task that tests the improved instructions>

## Approval questions
Ask only questions that block safe approval. If none, say "None".

Skill content:
\`\`\`markdown
${content}
\`\`\``;
}

async function runImprove(cwd: string, query: string, ctx: any, signal?: AbortSignal): Promise<{ proposal: string; proposalPath: string; skillPath: string; model: string; findings: Finding[]; matches?: SkillCandidate[] }> {
	if (!query.trim()) throw new Error("Usage: /skill-improve <skill-name-or-query>");
	const selected = await selectSkill(cwd, query);
	if (!selected.candidate) {
		if (!selected.matches.length) throw new Error(`No skill found for: ${query}`);
		return {
			proposal: `Multiple skills matched '${query}'. Narrow the query:\n${selected.matches.map((m) => `- ${m.nameHint}: ${m.path}`).join("\n")}`,
			proposalPath: "",
			skillPath: "",
			model: "none",
			findings: [],
			matches: selected.matches,
		};
	}
	const audit = await auditSkill(selected.candidate, selected.names);
	const gemini3 = ctx.modelRegistry?.find?.("google", "gemini-3-flash-preview");
	const gemini25 = ctx.modelRegistry?.find?.("google", "gemini-2.5-flash");
	let model = gemini3 ?? gemini25;
	let usedFallback = false;
	if (model) {
		const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
		if (!auth?.ok || !auth.apiKey) {
			model = null;
		}
	}
	if (!model && ctx.model) {
		model = ctx.model;
		usedFallback = true;
	}
	if (!model) throw new Error("No model available. Configure google/gemini-3-flash-preview, google/gemini-2.5-flash, or select any model with /model.");
	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth?.ok) throw new Error(`Auth failed for ${model.provider}/${model.id}: ${auth?.error ?? "unknown error"}`);
	if (!auth.apiKey) throw new Error(`No API key for ${model.provider}/${model.id}.`);
	const modelLabel = `${model.provider}/${model.id}${usedFallback ? " (fallback: current model)" : ""}`;

	const { complete } = await import("@earendil-works/pi-ai");
	const response = await complete(
		model,
		{
			messages: [{
				role: "user" as const,
				content: [{ type: "text" as const, text: await buildImprovePrompt(audit) }],
				timestamp: Date.now(),
			}],
		},
		{ apiKey: auth.apiKey, headers: auth.headers, maxTokens: 8192, signal },
	);
	const proposal = textFromResponse(response).trim();
	if (!proposal) throw new Error("Gemini Flash returned an empty proposal.");
	const projectRoot = await resolveProjectRoot(cwd);
	const name = audit.frontmatter.name || audit.candidate.nameHint;
	const source = await skillSourceInfo(audit.candidate);
	const proposalPath = path.join(projectRoot, REPORT_DIR, `improve-${slugify(name)}.md`);
	await writeText(proposalPath, [`# Skill Improvement Proposal: ${name}`, "", `Generated: ${now()}`, `Model: ${modelLabel}`, `Skill: ${source.displayPath}`, `Resolved source: ${source.sourcePath}`, `Symlink: ${source.isSymlink ? "yes" : "no"}`, "", proposal].join("\n"));
	return { proposal, proposalPath, skillPath: source.sourcePath, model: modelLabel, findings: audit.findings };
}

function truncate(value: string, maxChars: number): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, Math.max(0, maxChars - 40))}\n\n... truncated ${value.length - maxChars} chars ...`;
}

function outputLines(output: string): string[] {
	const lines = output.split("\n");
	const visible = lines.slice(0, MAX_VISIBLE_LINES).map((line) => line.length > MAX_VISIBLE_CHARS ? `${line.slice(0, MAX_VISIBLE_CHARS - 1)}…` : line);
	if (lines.length > MAX_VISIBLE_LINES) visible.push(`… truncated ${lines.length - MAX_VISIBLE_LINES} more lines`);
	return visible;
}

function parseArgs(args: string): AuditParamsType {
	const trimmed = args.trim();
	if (!trimmed) return { scope: "all" };
	const [first, ...rest] = trimmed.split(/\s+/);
	if (first === "all" || first === "global" || first === "project") return { scope: first, query: rest.join(" ").trim() || undefined };
	return { scope: "all", query: trimmed };
}

async function runCommand(args: string, ctx: ExtensionContext): Promise<void> {
	try {
		const result = await runAudit(ctx.cwd, parseArgs(args));
		ctx.ui.setWidget("pi-skill-audit", outputLines(result.report), { placement: "aboveEditor" });
		ctx.ui.notify(`skill-audit: ${result.audited} skills, ${result.counts.error} errors, ${result.counts.warn} warnings. Report: ${result.reportPath}`, result.counts.error ? "warning" : "info");
	} catch (error) {
		ctx.ui.notify(`skill-audit error: ${error instanceof Error ? error.message : String(error)}`, "error");
	}
}

async function runImproveCommand(args: string, ctx: any): Promise<void> {
	try {
		const query = args.trim();
		const result = await runImprove(ctx.cwd, query, ctx, ctx.signal);
		if (result.matches?.length) {
			ctx.ui.setWidget("pi-skill-improve", outputLines(result.proposal), { placement: "aboveEditor" });
			ctx.ui.notify(`skill-improve: ${result.matches.length} matches; narrow the query.`, "warning");
			return;
		}
		ctx.ui.setWidget("pi-skill-improve", [
			`Skill improve proposal written`,
			`Path: ${result.proposalPath}`,
			`Model: ${result.model}`,
			`Open it from /skill-manager → Open latest proposal in nvim`,
		], { placement: "aboveEditor" });
		ctx.ui.notify(`skill-improve: proposal written with ${result.model}: ${result.proposalPath}`, "info");
	} catch (error) {
		ctx.ui.notify(`skill-improve error: ${error instanceof Error ? error.message : String(error)}`, "error");
	}
}

function openInNeovim(filePath: string, ctx: any): void {
	ctx.ui.setWidget("pi-skill-manager", undefined);
	ctx.ui.setWidget("pi-skill-improve", undefined);
	ctx.ui.notify(`Opening nvim: ${filePath}`, "info");
	const result = spawnSync(process.env.EDITOR || "nvim", [filePath], { stdio: "inherit" });
	if (result.error) ctx.ui.notify(`nvim error: ${result.error.message}`, "error");
}

async function latestProposalPath(cwd: string, candidate: SkillCandidate): Promise<string> {
	const projectRoot = await resolveProjectRoot(cwd);
	const content = await readText(candidate.path);
	const { frontmatter } = parseFrontmatter(content);
	const name = frontmatter.name || candidate.nameHint;
	return path.join(projectRoot, REPORT_DIR, `improve-${slugify(name)}.md`);
}

interface SkillListEntry {
	candidate: SkillCandidate;
	duplicates: SkillCandidate[];
	source: { displayPath: string; sourcePath: string; isSymlink: boolean };
}

function candidateRank(candidate: SkillCandidate): number {
	let rank = 0;
	if (candidate.scope === "project") rank -= 100;
	if (candidate.path.includes(`${path.sep}.pi${path.sep}agent${path.sep}skills${path.sep}`)) rank -= 20;
	if (candidate.path.includes(`${path.sep}.pi${path.sep}skills${path.sep}`)) rank -= 15;
	if (candidate.path.includes(`${path.sep}.agents${path.sep}skills${path.sep}`)) rank -= 5;
	return rank;
}

async function buildSkillListEntries(candidates: SkillCandidate[]): Promise<SkillListEntry[]> {
	const groups = new Map<string, SkillCandidate[]>();
	for (const candidate of candidates) {
		const key = `${candidate.scope}:${candidate.nameHint}`;
		groups.set(key, [...(groups.get(key) ?? []), candidate]);
	}
	const entries: SkillListEntry[] = [];
	for (const group of groups.values()) {
		const sorted = [...group].sort((a, b) => candidateRank(a) - candidateRank(b) || a.path.localeCompare(b.path));
		const candidate = sorted[0];
		entries.push({ candidate, duplicates: sorted.slice(1), source: await skillSourceInfo(candidate) });
	}
	return entries.sort((a, b) => a.candidate.nameHint.localeCompare(b.candidate.nameHint) || a.candidate.scope.localeCompare(b.candidate.scope));
}

function shortPath(filePath: string): string {
	const home = os.homedir();
	return filePath.startsWith(`${home}${path.sep}`) ? `~/${filePath.slice(home.length + 1)}` : filePath;
}

async function pickSkill(ctx: any, candidates: SkillCandidate[]): Promise<SkillCandidate | undefined> {
	const entries = await buildSkillListEntries(candidates);
	const byValue = new Map<string, SkillListEntry>();
	const items: SelectItem[] = entries.map((entry, index) => {
		const duplicateBadge = entry.duplicates.length ? ` ×${entry.duplicates.length + 1}` : "";
		const symlinkBadge = entry.source.isSymlink ? " symlink" : "";
		const value = `${entry.candidate.nameHint} ${entry.candidate.scope} ${entry.candidate.path} ${index}`.toLowerCase();
		byValue.set(value, entry);
		return {
			value,
			label: `${entry.candidate.nameHint} [${entry.candidate.scope}]${symlinkBadge}${duplicateBadge}`,
			description: `${shortPath(entry.candidate.path)}${entry.source.isSymlink ? ` -> ${shortPath(entry.source.sourcePath)}` : ""}${entry.duplicates.length ? ` (+${entry.duplicates.length} duplicate path${entry.duplicates.length === 1 ? "" : "s"})` : ""}`,
		};
	});
	const picked = await ctx.ui.custom((tui: any, theme: any, _kb: any, done: (value: string | null) => void) => {
		const container = new Container();
		container.addChild(new Text(theme.fg("accent", theme.bold(`Skill Manager — ${items.length} skills${items.length === candidates.length ? "" : ` (${candidates.length} paths)`}`))));
		container.addChild(new Text(theme.fg("dim", "type prefix to filter • ↑↓ scroll • enter select • backspace edit filter • esc cancel")));
		const selectList = new SelectList(items, Math.min(items.length, 12), {
			selectedPrefix: (text: string) => theme.fg("accent", text),
			selectedText: (text: string) => theme.fg("accent", text),
			description: (text: string) => theme.fg("muted", text),
			scrollInfo: (text: string) => theme.fg("dim", text),
			noMatch: (text: string) => theme.fg("warning", text),
		}, { minPrimaryColumnWidth: 24, maxPrimaryColumnWidth: 44 });
		let filter = "";
		selectList.onSelect = (item: SelectItem) => done(String(item.value));
		selectList.onCancel = () => done(null);
		container.addChild(selectList);
		return {
			render(width: number) {
				return container.render(width);
			},
			invalidate() {
				container.invalidate();
			},
			handleInput(data: string) {
				if (data === "\u007f" || data === "\b") {
					filter = filter.slice(0, -1);
					selectList.setFilter(filter);
				} else if (/^[\x20-\x7e]$/.test(data)) {
					filter += data.toLowerCase();
					selectList.setFilter(filter);
				} else {
					selectList.handleInput(data);
				}
				tui.requestRender();
			},
		};
	});
	if (picked === null || picked === undefined) return undefined;
	return byValue.get(picked)?.candidate;
}

async function runSkillManager(ctx: any): Promise<void> {
	try {
		const candidates = await discoverSkills(ctx.cwd, "all");
		if (!candidates.length) {
			ctx.ui.notify("skill-manager: no skills discovered.", "warning");
			return;
		}
		const candidate = await pickSkill(ctx, candidates);
		if (!candidate) return;

		const action = await ctx.ui.select(`Skill: ${candidate.nameHint}`, [
			"Run audit",
			"Generate improve proposal",
			"Open latest proposal in nvim",
			"Show paths",
			"Cancel",
		]);
		if (!action || action === "Cancel") return;

		if (action === "Show paths") {
			const source = await skillSourceInfo(candidate);
			ctx.ui.setWidget("pi-skill-manager", [
				`Skill: ${candidate.nameHint}`,
				`Scope: ${candidate.scope}`,
				`Display path: ${source.displayPath}`,
				`Resolved source: ${source.sourcePath}`,
				`Symlink: ${source.isSymlink ? "yes" : "no"}`,
			], { placement: "aboveEditor" });
			return;
		}

		if (action === "Run audit") {
			const names = await buildNameMap(candidates);
			const audit = await auditSkill(candidate, names);
			const errors = audit.findings.filter((f) => f.severity === "error").length;
			const warns = audit.findings.filter((f) => f.severity === "warn").length;
			const infos = audit.findings.filter((f) => f.severity === "info").length;
			const source = await skillSourceInfo(candidate);
			const findingPreview = audit.findings.slice(0, 3).map((f) => `- ${f.severity.toUpperCase()} ${f.code}: ${f.message}`);
			if (audit.findings.length > findingPreview.length) findingPreview.push(`- ... ${audit.findings.length - findingPreview.length} more finding(s); run /skill-audit ${audit.frontmatter.name || candidate.nameHint} for full report`);
			const lines = [
				`# Skill audit: ${audit.frontmatter.name || candidate.nameHint}`,
				`Findings: ${errors} errors, ${warns} warnings, ${infos} info • Symlink: ${source.isSymlink ? "yes" : "no"}`,
				`Source: ${shortPath(source.sourcePath)}`,
				...findingPreview,
			];
			ctx.ui.setWidget("pi-skill-manager", lines, { placement: "aboveEditor" });
			ctx.ui.notify(`skill-manager: audited ${candidate.nameHint}.`, errors ? "warning" : "info");
			const shouldImprove = await ctx.ui.confirm("Generate improve proposal?", `Run skill-improve for ${audit.frontmatter.name || candidate.nameHint} now?`);
			if (shouldImprove) {
				ctx.ui.setWidget("pi-skill-manager", undefined);
				await runImproveCommand(candidate.path, ctx);
				const proposalPath = await latestProposalPath(ctx.cwd, candidate);
				if (await exists(proposalPath)) {
					const open = await ctx.ui.confirm("Open proposal in nvim?", proposalPath);
					if (open) openInNeovim(proposalPath, ctx);
				}
			}
			return;
		}

		if (action === "Generate improve proposal") {
			await runImproveCommand(candidate.path, ctx);
			const proposalPath = await latestProposalPath(ctx.cwd, candidate);
			if (await exists(proposalPath)) {
				const open = await ctx.ui.confirm("Open proposal in nvim?", proposalPath);
				if (open) openInNeovim(proposalPath, ctx);
			}
		}

		if (action === "Open latest proposal in nvim") {
			const proposalPath = await latestProposalPath(ctx.cwd, candidate);
			if (!(await exists(proposalPath))) {
				ctx.ui.notify(`No proposal found yet: ${proposalPath}`, "warning");
				return;
			}
			openInNeovim(proposalPath, ctx);
		}
	} catch (error) {
		ctx.ui.notify(`skill-manager error: ${error instanceof Error ? error.message : String(error)}`, "error");
	}
}

export default function piSkillAudit(pi: ExtensionAPI) {
	pi.registerCommand("skill-audit", {
		description: "Audit Pi skills deterministically; writes .pi/skill-audit/report.md without editing skills",
		getArgumentCompletions: (prefix) => {
			const commands = ["all", "global", "project"];
			const filtered = commands.filter((cmd) => cmd.startsWith(prefix.trim()));
			return filtered.length ? filtered.map((cmd) => ({ value: cmd, label: cmd })) : null;
		},
		handler: async (args, ctx) => runCommand(args, ctx),
	});

	pi.registerCommand("skill-improve", {
		description: "Generate a Gemini Flash improvement proposal for one skill; writes .pi/skill-audit/improve-<skill>.md without editing",
		handler: async (args, ctx) => runImproveCommand(args, ctx),
	});

	pi.registerCommand("skill-manager", {
		description: "Open an interactive menu to list skills, audit one skill, show paths, or generate a skill-improve proposal",
		handler: async (_args, ctx) => runSkillManager(ctx),
	});

	pi.registerTool({
		name: "skill_audit",
		label: "Skill Audit",
		description: "Audit installed Pi skills deterministically and write .pi/skill-audit/report.md. This is read-only and does not use an LLM.",
		promptSnippet: "Audit Pi skill quality, frontmatter, duplicate names, broken references, and oversized SKILL.md files",
		promptGuidelines: [
			"Use skill_audit before proposing broad skill cleanup; it is read-only and writes a report instead of editing skills.",
			"Do not auto-edit skills from skill_audit findings; ask the user which specific skill to improve.",
		],
		parameters: AuditParams,
		async execute(_toolCallId, params: AuditParamsType, _signal, onUpdate, ctx) {
			onUpdate?.({ content: [{ type: "text", text: "Auditing skills..." }], details: {} });
			const result = await runAudit(ctx.cwd, params);
			return {
				content: [{ type: "text", text: `Audited ${result.audited} skills. Findings: ${result.counts.error} errors, ${result.counts.warn} warnings, ${result.counts.info} info. Report written to ${result.reportPath}` }],
				details: { reportPath: result.reportPath, audited: result.audited, counts: result.counts },
			};
		},
	});

	pi.registerTool({
		name: "skill_improve",
		label: "Skill Improve",
		description: "Use Gemini Flash to generate a safe improvement proposal for one Pi skill. Writes .pi/skill-audit/improve-<skill>.md and does not edit the skill.",
		promptSnippet: "Generate a Gemini Flash proposal/diff for improving one specific Pi skill without applying edits",
		promptGuidelines: [
			"Use skill_improve only for a specific skill requested by the user; it uses Gemini Flash and writes a proposal, not edits.",
			"After skill_improve, ask the user to approve before editing any skill file.",
		],
		parameters: ImproveParams,
		async execute(_toolCallId, params: ImproveParamsType, signal, onUpdate, ctx) {
			onUpdate?.({ content: [{ type: "text", text: `Generating skill improvement proposal with Gemini Flash for ${params.query}...` }], details: {} });
			const result = await runImprove(ctx.cwd, params.query, ctx, signal);
			if (result.matches?.length) {
				return {
					content: [{ type: "text", text: result.proposal }],
					details: { matches: result.matches.map((m) => ({ nameHint: m.nameHint, path: m.path })) },
				};
			}
			return {
				content: [{ type: "text", text: `Proposal written to ${result.proposalPath} using ${result.model}. Skill: ${result.skillPath}\n\nPreview:\n${truncate(result.proposal, 3000)}` }],
				details: { proposalPath: result.proposalPath, skillPath: result.skillPath, model: result.model, findings: result.findings },
			};
		},
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setWidget("pi-skill-audit", undefined);
		ctx.ui.setWidget("pi-skill-improve", undefined);
		ctx.ui.setWidget("pi-skill-manager", undefined);
	});
}
