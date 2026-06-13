import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const SYSTEM_DIR = ".interface-design";
const SYSTEM_FILE = "system.md";
const VERSION = "0.1.0";

const SaveSystemParams = Type.Object({
	content: Type.String({ description: "Complete Markdown content for .interface-design/system.md" }),
});
type SaveSystemParamsType = Static<typeof SaveSystemParams>;

const PathParams = Type.Object({
	path: Type.Optional(Type.String({ description: "File or directory to inspect. Defaults to common UI paths." })),
});
type PathParamsType = Static<typeof PathParams>;

const CheckpointParams = Type.Object({
	intent: Type.String({ description: "UX intent: user, job-to-be-done, context, success path." }),
	palette: Type.String({ description: "Color world and selected palette with rationale." }),
	depth: Type.String({ description: "Depth strategy and rationale." }),
	surfaces: Type.String({ description: "Surface/elevation system." }),
	typography: Type.String({ description: "Typeface/hierarchy rationale." }),
	spacing: Type.String({ description: "Spacing base and density rationale." }),
	signature: Type.String({ description: "Unique product-specific UI/interaction signature." }),
});
type CheckpointParamsType = Static<typeof CheckpointParams>;

function systemPath(cwd: string): string {
	return path.join(cwd, SYSTEM_DIR, SYSTEM_FILE);
}

async function exists(filePath: string): Promise<boolean> {
	try { await fs.access(filePath); return true; } catch { return false; }
}

async function readSystem(cwd: string): Promise<string | undefined> {
	const file = systemPath(cwd);
	if (!(await exists(file))) return undefined;
	return fs.readFile(file, "utf8");
}

function isUiPrompt(text: string): boolean {
	const t = text.toLowerCase();
	return /\b(ui|ux|frontend|front-end|interface|dashboard|admin|panel|app|screen|page|component|design system|redesign|layout|form|modal|table|settings|sidebar|navbar|landing)\b/.test(t)
		|| /\b(tela|componente|painel|dashboard|interface|frontend|visual|layout|formul[aá]rio|modal|tabela|configura[cç][aã]o|barra lateral|redesign|design)\b/.test(t);
}

function isProbablyMarketing(text: string): boolean {
	return /\b(landing|marketing|campaign|homepage|hero|sales page|lp|site institucional|p[aá]gina de vendas)\b/i.test(text);
}

function commonUiRoots(cwd: string): string[] {
	return ["src", "app", "pages", "components", "client", "web", "frontend", "styles"]
		.map((p) => path.join(cwd, p));
}

async function collectFiles(target: string): Promise<string[]> {
	const out: string[] = [];
	async function walk(p: string) {
		let st;
		try { st = await fs.stat(p); } catch { return; }
		if (st.isFile()) {
			if (/\.(tsx|jsx|vue|svelte|css|scss|less|html)$/.test(p)) out.push(p);
			return;
		}
		if (!st.isDirectory()) return;
		const base = path.basename(p);
		if (["node_modules", ".git", "dist", "build", ".next", "coverage"].includes(base)) return;
		const entries = await fs.readdir(p);
		for (const e of entries) await walk(path.join(p, e));
	}
	await walk(target);
	return out.slice(0, 250);
}

async function targetFiles(cwd: string, inputPath?: string): Promise<string[]> {
	if (inputPath) return collectFiles(path.resolve(cwd, inputPath.replace(/^@/, "")));
	const existing: string[] = [];
	for (const root of commonUiRoots(cwd)) if (await exists(root)) existing.push(root);
	const files: string[] = [];
	for (const root of existing) files.push(...await collectFiles(root));
	return files.slice(0, 250);
}

function countMatches(contents: string[], re: RegExp): Map<string, number> {
	const counts = new Map<string, number>();
	for (const text of contents) {
		for (const m of text.matchAll(re)) {
			const v = m[1] ?? m[0];
			counts.set(v, (counts.get(v) ?? 0) + 1);
		}
	}
	return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20));
}

async function extractPatterns(cwd: string, inputPath?: string) {
	const files = await targetFiles(cwd, inputPath);
	const texts = await Promise.all(files.map(async (f) => fs.readFile(f, "utf8").catch(() => "")));
	const spacing = countMatches(texts, /(?:p|m|gap|space|top|left|right|bottom|width|height|min-h|max-w|padding|margin|gap)[^\n:={]*[:=]\s*["'`]?([0-9]+px)/g);
	const radius = countMatches(texts, /(?:radius|rounded|border-radius)[^\n:={]*[:=]\s*["'`]?([0-9]+px|rounded-[a-z0-9-]+)/g);
	const colors = countMatches(texts, /(#[0-9a-fA-F]{3,8}|rgba?\([^\)]+\)|hsla?\([^\)]+\)|(?:slate|gray|zinc|stone|neutral|blue|red|green|amber|orange|purple|pink|teal|cyan)-[0-9]{2,3})/g);
	const shadows = texts.reduce((n, t) => n + (t.match(/shadow|box-shadow/g)?.length ?? 0), 0);
	const borders = texts.reduce((n, t) => n + (t.match(/border/g)?.length ?? 0), 0);
	return { files: files.map((f) => path.relative(cwd, f)), spacing, radius, colors, shadows, borders };
}

function formatMap(title: string, map: Map<string, number>): string {
	const rows = [...map.entries()].slice(0, 10).map(([k, v]) => `- ${k}: ${v}x`).join("\n");
	return `### ${title}\n${rows || "- none found"}`;
}

function buildDiscoveryPrompt(system?: string, marketing = false): string {
	return `## UI/UX Design Extension v${VERSION}\n\nYou are operating with mandatory UI/UX discovery and craft rules. ${marketing ? "This may be a marketing/landing task: use frontend-design aesthetics, but still perform UX clarity checks." : "This is primarily product interface design: dashboards, apps, tools, admin panels, and interactive workflows."}\n\nBefore editing code, do not jump straight to implementation. First inspect relevant files when needed, then produce a concise proposal with:\n\nUX Discovery:\n- Primary user: the actual human, not generic \"users\"\n- Context: where/when/why they open this screen\n- Job-to-be-done: the verb they must accomplish\n- Success path: the shortest successful flow\n- Friction risks: likely confusion, delay, error, trust, accessibility issues\n- Required states: loading, empty, error, disabled, success, focus/hover\n\nUI Discovery:\n- Domain: 5+ concepts/vocabulary/metaphors from this product world\n- Color world: 5+ colors/materials/lights that naturally belong to that domain\n- Signature: one visual, structural, or interaction element unique to this product\n- Defaults rejected: 3 obvious generic visual/structural choices and what replaces each\n- Direction: final aesthetic/product direction tied to the above\n\nBefore each major component, state a checkpoint:\nIntent, Palette, Depth, Surfaces, Typography, Spacing, Signature.\n\nIf context is insufficient, ask 2-4 targeted questions OR state explicit assumptions. Ask for direction confirmation before large implementation unless the user explicitly asked to proceed.\n\nAfter building, self-critique with swap test, squint test, signature test, token test, UX states/accessibility check. Offer to save reusable patterns to .interface-design/system.md.\n\n${system ? `Existing .interface-design/system.md is loaded below. Reuse it, extend instead of reinventing, and audit new work against it.\n\n--- system.md ---\n${system}\n--- end system.md ---` : "No .interface-design/system.md was found. Establish a direction and offer to save it after implementation."}`;
}

export default function uiUxDesignExtension(pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event, _ctx) => {
		if (!isUiPrompt(event.prompt)) return;
		const system = await readSystem(event.systemPromptOptions.cwd).catch(() => undefined);
		return { systemPrompt: `${event.systemPrompt}\n\n${buildDiscoveryPrompt(system, isProbablyMarketing(event.prompt))}` };
	});

	pi.registerCommand("interface-design:help", {
		description: "Show UI/UX design extension commands and tools.",
		handler: async (_args, _ctx) => {
			pi.sendMessage({ customType: "ui-ux-design", display: true, content: `# UI/UX Design Extension Help\n\n## Commands\n\n- /interface-design:help — show this help.\n- /interface-design:status — show current .interface-design/system.md summary.\n- /interface-design:init — start UX/UI discovery and propose a project design system.\n- /interface-design:extract <path?> — scan UI files and extract repeated tokens/patterns.\n- /interface-design:audit <path?> — audit UI against .interface-design/system.md.\n- /interface-design:critique — critique latest UI for craft, UX states, accessibility, and generic defaults.\n\n## Automatic behavior\n\nWhen your prompt looks like UI/UX/frontend work, the extension injects a mandatory discovery workflow: user/job/context, domain, color world, signature, defaults rejected, direction, component checkpoint, and post-build critique.\n\n## Design memory\n\nProject decisions are stored in:\n\n.interface-design/system.md\n\nUse /interface-design:init to create it, /interface-design:extract to infer it from existing UI, and /interface-design:status to view it.` });
		},
	});

	pi.registerCommand("interface-design:status", {
		description: "Show current .interface-design/system.md summary.",
		handler: async (_args, ctx) => {
			const system = await readSystem(ctx.cwd);
			if (!system) { ctx.ui.notify("No .interface-design/system.md found. Use /interface-design:init or /interface-design:extract.", "warning"); return; }
			const excerpt = system.split("\n").slice(0, 80).join("\n");
			pi.sendMessage({ customType: "ui-ux-design", display: true, content: `# Interface Design System\n\n${excerpt}` });
		},
	});

	pi.registerCommand("interface-design:init", {
		description: "Start UI/UX design discovery and optionally create .interface-design/system.md.",
		handler: async (_args, ctx) => {
			pi.sendUserMessage("Start UI/UX interface-design init. Inspect the project, determine product domain, user, job-to-be-done, color world, signature, defaults to reject, and propose a design system direction. If I confirm, create .interface-design/system.md.");
		},
	});

	pi.registerCommand("interface-design:extract", {
		description: "Extract repeated UI patterns from code. Usage: /interface-design:extract <path?>",
		handler: async (args, ctx) => {
			const r = await extractPatterns(ctx.cwd, args.trim() || undefined);
			pi.sendMessage({ customType: "ui-ux-design", display: true, content: `# Extracted UI Patterns\n\nScanned ${r.files.length} files.\n\n${formatMap("Spacing", r.spacing)}\n\n${formatMap("Radius", r.radius)}\n\n${formatMap("Colors", r.colors)}\n\n### Depth\n- border occurrences: ${r.borders}\n- shadow occurrences: ${r.shadows}\n\nSuggested depth: ${r.borders >= r.shadows ? "borders-only / surface shifts" : "shadow-based"}\n\nAsk me to save these into .interface-design/system.md if this matches the product direction.` });
		},
	});

	pi.registerCommand("interface-design:audit", {
		description: "Audit UI files against .interface-design/system.md. Usage: /interface-design:audit <path?>",
		handler: async (args, ctx) => {
			const system = await readSystem(ctx.cwd);
			if (!system) { ctx.ui.notify("No .interface-design/system.md found; run /interface-design:init or /interface-design:extract first.", "warning"); return; }
			pi.sendUserMessage(`Audit UI implementation against .interface-design/system.md. Target: ${args.trim() || "common UI paths"}. Check spacing grid, depth strategy, hardcoded colors, pattern drift, interactive states, UX states, accessibility risks. Report precise files/lines when possible; do not edit unless I ask.`);
		},
	});

	pi.registerCommand("interface-design:critique", {
		description: "Critique current UI for craft and UX, then propose/fix what defaulted.",
		handler: async (_args, ctx) => {
			pi.sendUserMessage("Run a UI/UX craft critique on the latest build. Check composition rhythm, focal point, proportions, typography hierarchy, surface subtlety, content coherence, implementation structure, interaction states, accessibility, empty/loading/error states, and signature presence. Identify what defaulted. If fixes are obvious and safe, implement them; otherwise propose them.");
		},
	});

	pi.registerTool({
		name: "interface_design_status",
		label: "Interface Design Status",
		description: "Read .interface-design/system.md for the current project.",
		promptSnippet: "Read the project interface design system memory.",
		promptGuidelines: ["Use interface_design_status before changing product UI when .interface-design/system.md may exist."],
		parameters: Type.Object({}),
		async execute(_id, _params, _signal, _onUpdate, ctx) {
			const system = await readSystem(ctx.cwd);
			return { content: [{ type: "text", text: system ? `.interface-design/system.md:\n\n${system}` : "No .interface-design/system.md found." }], details: { exists: Boolean(system) } };
		},
	});

	pi.registerTool({
		name: "interface_design_save_system",
		label: "Save Interface Design System",
		description: "Create or replace .interface-design/system.md with project UI/UX design decisions.",
		promptSnippet: "Save reusable UI/UX design system decisions to .interface-design/system.md.",
		promptGuidelines: ["Use interface_design_save_system only after user approval to save reusable UI/UX patterns."],
		parameters: SaveSystemParams,
		async execute(_id, params: SaveSystemParamsType, _signal, _onUpdate, ctx) {
			const dir = path.join(ctx.cwd, SYSTEM_DIR);
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(path.join(dir, SYSTEM_FILE), params.content, "utf8");
			return { content: [{ type: "text", text: "Saved .interface-design/system.md" }], details: { path: path.join(SYSTEM_DIR, SYSTEM_FILE) } };
		},
	});

	pi.registerTool({
		name: "interface_design_extract",
		label: "Extract Interface Patterns",
		description: "Scan UI files and summarize repeated spacing, radius, color, border, and shadow patterns.",
		promptSnippet: "Extract repeated UI tokens and patterns from code.",
		promptGuidelines: ["Use interface_design_extract when creating a design system from existing UI."],
		parameters: PathParams,
		async execute(_id, params: PathParamsType, _signal, _onUpdate, ctx) {
			const r = await extractPatterns(ctx.cwd, params.path);
			const text = `Scanned ${r.files.length} files.\n\n${formatMap("Spacing", r.spacing)}\n\n${formatMap("Radius", r.radius)}\n\n${formatMap("Colors", r.colors)}\n\nDepth: borders=${r.borders}, shadows=${r.shadows}`;
			return { content: [{ type: "text", text }], details: { files: r.files, borders: r.borders, shadows: r.shadows } };
		},
	});

	pi.registerTool({
		name: "interface_design_audit",
		label: "Audit Interface Design",
		description: "Audit UI files against .interface-design/system.md and report likely consistency risks.",
		promptSnippet: "Audit UI implementation against the saved interface design system.",
		promptGuidelines: ["Use interface_design_audit to find UI consistency drift before or after frontend edits."],
		parameters: PathParams,
		async execute(_id, params: PathParamsType, _signal, _onUpdate, ctx) {
			const system = await readSystem(ctx.cwd);
			if (!system) return { content: [{ type: "text", text: "No .interface-design/system.md found; cannot audit against project system." }], details: { exists: false } };
			const r = await extractPatterns(ctx.cwd, params.path);
			const risks: string[] = [];
			if (/borders-only/i.test(system) && r.shadows > 0) risks.push(`System says borders-only, but found ${r.shadows} shadow occurrences.`);
			if (/Base:\s*4px/i.test(system)) {
				for (const [v, n] of r.spacing) {
					const px = Number(v.replace("px", ""));
					if (Number.isFinite(px) && px % 4 !== 0) risks.push(`Spacing ${v} appears ${n}x and is off the 4px grid.`);
				}
			}
			const text = `Scanned ${r.files.length} files against .interface-design/system.md.\n\n${risks.length ? risks.map((x) => `- ${x}`).join("\n") : "No obvious token/depth drift found by static scan."}\n\n${formatMap("Observed spacing", r.spacing)}\n\n${formatMap("Observed colors", r.colors)}\n\nNote: this is a heuristic scan; inspect files for component-level pattern drift, states, and accessibility.`;
			return { content: [{ type: "text", text }], details: { exists: true, risks, files: r.files } };
		},
	});

	pi.registerTool({
		name: "interface_design_checkpoint",
		label: "Interface Design Checkpoint",
		description: "Record the mandatory UI/UX design checkpoint before implementing a major component.",
		promptSnippet: "Record UI/UX intent, palette, depth, surfaces, typography, spacing, and signature before building.",
		promptGuidelines: ["Use interface_design_checkpoint before implementing major UI components in product interfaces."],
		parameters: CheckpointParams,
		async execute(_id, params: CheckpointParamsType) {
			const text = `Intent: ${params.intent}\nPalette: ${params.palette}\nDepth: ${params.depth}\nSurfaces: ${params.surfaces}\nTypography: ${params.typography}\nSpacing: ${params.spacing}\nSignature: ${params.signature}`;
			return { content: [{ type: "text", text }], details: params };
		},
	});
}
