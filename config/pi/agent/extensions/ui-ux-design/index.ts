import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const SYSTEM_DIR = ".interface-design";
const SYSTEM_FILE = "system.md";
const PRODUCT_FILE = "product.md";
const VERSION = "0.2.0";

type DesignRegister = "product" | "brand" | "hybrid";
type SlopSeverity = "error" | "warning" | "advisory";
type SlopCategory = "slop" | "quality" | "copy" | "a11y" | "motion";

type SlopFinding = {
	id: string;
	name: string;
	category: SlopCategory;
	severity: SlopSeverity;
	file: string;
	line: number;
	evidence: string;
	suggestion: string;
};

const SaveSystemParams = Type.Object({
	content: Type.String({ description: "Complete Markdown content for .interface-design/system.md" }),
});
type SaveSystemParamsType = Static<typeof SaveSystemParams>;

const SaveProductParams = Type.Object({
	content: Type.String({ description: "Complete Markdown content for .interface-design/product.md" }),
});
type SaveProductParamsType = Static<typeof SaveProductParams>;

const PathParams = Type.Object({
	path: Type.Optional(Type.String({ description: "File or directory to inspect. Defaults to common UI paths." })),
});
type PathParamsType = Static<typeof PathParams>;

const CheckpointParams = Type.Object({
	intent: Type.String({ description: "UX intent: user, job-to-be-done, context, success path." }),
	register: Type.Optional(Type.String({ description: "Design register: product, brand, or hybrid." })),
	palette: Type.String({ description: "Color world and selected palette with rationale." }),
	depth: Type.String({ description: "Depth strategy and rationale." }),
	surfaces: Type.String({ description: "Surface/elevation system." }),
	typography: Type.String({ description: "Typeface/hierarchy rationale." }),
	spacing: Type.String({ description: "Spacing base and density rationale." }),
	signature: Type.String({ description: "Unique product-specific UI/interaction signature." }),
	antiReferences: Type.Optional(Type.String({ description: "Generic/default visual choices explicitly rejected." })),
	states: Type.Optional(Type.String({ description: "Required states: loading, empty, error, disabled, success, focus/hover." })),
	accessibility: Type.Optional(Type.String({ description: "Accessibility constraints: keyboard, focus, contrast, reduced motion, semantics." })),
	implementation: Type.Optional(Type.String({ description: "Implementation constraints from the project stack/design system." })),
});
type CheckpointParamsType = Static<typeof CheckpointParams>;

function designFilePath(cwd: string, file: string): string {
	return path.join(cwd, SYSTEM_DIR, file);
}

function systemPath(cwd: string): string {
	return designFilePath(cwd, SYSTEM_FILE);
}

function productPath(cwd: string): string {
	return designFilePath(cwd, PRODUCT_FILE);
}

async function exists(filePath: string): Promise<boolean> {
	try { await fs.access(filePath); return true; } catch { return false; }
}

async function readDesignFile(cwd: string, file: string): Promise<string | undefined> {
	const filePath = designFilePath(cwd, file);
	if (!(await exists(filePath))) return undefined;
	return fs.readFile(filePath, "utf8");
}

async function readSystem(cwd: string): Promise<string | undefined> {
	return readDesignFile(cwd, SYSTEM_FILE);
}

async function readProduct(cwd: string): Promise<string | undefined> {
	return readDesignFile(cwd, PRODUCT_FILE);
}

async function readDesignContext(cwd: string): Promise<{ product?: string; system?: string }> {
	const [product, system] = await Promise.all([
		readProduct(cwd).catch(() => undefined),
		readSystem(cwd).catch(() => undefined),
	]);
	return { product, system };
}

function isUiPrompt(text: string): boolean {
	const t = text.toLowerCase();
	return /\b(ui|ux|frontend|front-end|interface|dashboard|admin|panel|app|screen|page|component|design system|redesign|layout|form|modal|table|settings|sidebar|navbar|landing|polish|harden|typeset)\b/.test(t)
		|| /\b(tela|componente|painel|dashboard|interface|frontend|visual|layout|formul[aá]rio|modal|tabela|configura[cç][aã]o|barra lateral|redesign|design|polir|endurecer|tipografia)\b/.test(t);
}

function inferRegister(text: string, product?: string): DesignRegister {
	const joined = `${text}\n${product ?? ""}`.toLowerCase();
	const brand = /\b(landing|marketing|campaign|homepage|hero|sales page|lp|site institucional|p[aá]gina de vendas|brand|branding|narrative|story|case study|portfolio)\b/.test(joined);
	const productUi = /\b(dashboard|admin|panel|app|tool|workflow|table|form|settings|sidebar|modal|checkout|onboarding|produto|ferramenta|painel|tabela|formul[aá]rio)\b/.test(joined);
	if (brand && productUi) return "hybrid";
	if (brand) return "brand";
	return "product";
}

function registerGuidance(register: DesignRegister): string {
	if (register === "brand") {
		return "This is brand/marketing work. Prioritize memorability, voice, atmosphere, narrative rhythm, composition, art direction, purposeful motion, and distinct typography. Still check accessibility, responsive behavior, and content clarity.";
	}
	if (register === "hybrid") {
		return "This is hybrid product/brand work. Balance brand memorability with task clarity. Landing sections may be expressive; app-like sections must stay operable, legible, and state-complete.";
	}
	return "This is product interface work: dashboards, apps, tools, admin panels, and interactive workflows. Prioritize task success, scanability, density, clear states, keyboard/focus behavior, and low-friction flows over decorative novelty.";
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
			if (/\.(tsx|jsx|vue|svelte|css|scss|less|html|astro)$/.test(p)) out.push(p);
			return;
		}
		if (!st.isDirectory()) return;
		const base = path.basename(p);
		if (["node_modules", ".git", "dist", "build", ".next", "coverage", ".nuxt", ".svelte-kit"].includes(base)) return;
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
	const colors = countMatches(texts, /(#[0-9a-fA-F]{3,8}|rgba?\([^\)]+\)|hsla?\([^\)]+\)|(?:slate|gray|zinc|stone|neutral|blue|red|green|amber|orange|purple|pink|teal|cyan|violet|fuchsia|lime|emerald|indigo)-[0-9]{2,3})/g);
	const fonts = countMatches(texts, /(?:font-family|fontFamily|font-\[)[^\n:={]*[:=]?\s*["'`]?([^"'`;\n\]]+)/g);
	const shadows = texts.reduce((n, t) => n + (t.match(/shadow|box-shadow/g)?.length ?? 0), 0);
	const borders = texts.reduce((n, t) => n + (t.match(/border/g)?.length ?? 0), 0);
	return { files: files.map((f) => path.relative(cwd, f)), spacing, radius, colors, fonts, shadows, borders };
}

function formatMap(title: string, map: Map<string, number>): string {
	const rows = [...map.entries()].slice(0, 10).map(([k, v]) => `- ${k}: ${v}x`).join("\n");
	return `### ${title}\n${rows || "- none found"}`;
}

function lineNumberForIndex(text: string, index: number): number {
	return text.slice(0, Math.max(0, index)).split("\n").length;
}

function evidenceLine(text: string, index: number): string {
	const line = text.split("\n")[lineNumberForIndex(text, index) - 1] ?? "";
	return line.trim().slice(0, 180);
}

function addRegexFindings(findings: SlopFinding[], text: string, rel: string, rule: Omit<SlopFinding, "file" | "line" | "evidence"> & { re: RegExp }) {
	for (const m of text.matchAll(rule.re)) {
		findings.push({
			id: rule.id,
			name: rule.name,
			category: rule.category,
			severity: rule.severity,
			file: rel,
			line: lineNumberForIndex(text, m.index ?? 0),
			evidence: evidenceLine(text, m.index ?? 0),
			suggestion: rule.suggestion,
		});
	}
}

async function scanSlop(cwd: string, inputPath?: string): Promise<{ files: string[]; findings: SlopFinding[] }> {
	const files = await targetFiles(cwd, inputPath);
	const findings: SlopFinding[] = [];
	const allTextParts: string[] = [];

	for (const file of files) {
		const text = await fs.readFile(file, "utf8").catch(() => "");
		const rel = path.relative(cwd, file);
		allTextParts.push(text);

		addRegexFindings(findings, text, rel, {
			id: "gradient-text",
			name: "Gradient text",
			category: "slop",
			severity: "warning",
			re: /(?:bg-clip-text|text-transparent|background-clip:\s*text|-webkit-background-clip:\s*text|linear-gradient\([^\n]+\)[^\n]+text)/g,
			suggestion: "Use solid text color; reserve gradients for meaningful surfaces or data, not headings.",
		});
		addRegexFindings(findings, text, rel, {
			id: "ai-purple-cyan-palette",
			name: "AI purple/cyan palette",
			category: "slop",
			severity: "advisory",
			re: /(?:purple|violet|fuchsia|cyan|indigo)-(?:400|500|600|700)|#[78][a-fA-F0-9]{5}|#00(?:d|e|f)[a-fA-F0-9]{3}/g,
			suggestion: "Pick a palette from the product domain instead of the default generated purple/cyan world.",
		});
		addRegexFindings(findings, text, rel, {
			id: "side-accent-border",
			name: "Side accent border",
			category: "slop",
			severity: "warning",
			re: /border-(?:l|left|r|right|t|top|b|bottom)-[48]|border(?:Left|Right|Top|Bottom)(?:Width)?:\s*["'`]?[48]px/g,
			suggestion: "Avoid the thick one-side card stripe; use hierarchy, iconography, or a subtler status marker.",
		});
		addRegexFindings(findings, text, rel, {
			id: "dark-glow",
			name: "Dark mode glow",
			category: "slop",
			severity: "advisory",
			re: /(?:shadow-(?:purple|violet|cyan|blue|pink)|box-shadow:[^;]*(?:purple|violet|cyan|blue|pink|rgba\([^\)]*,\s*0\.[3-9]))/gi,
			suggestion: "Use subtle lighting or surface contrast instead of colored glow as the main visual language.",
		});
		addRegexFindings(findings, text, rel, {
			id: "overused-font",
			name: "Overused generated-UI font",
			category: "slop",
			severity: "advisory",
			re: /\b(?:Inter|Roboto|Geist|Plus Jakarta Sans|Space Grotesk|Fraunces|Playfair Display|Newsreader)\b/g,
			suggestion: "Confirm the face is intentional. If not, choose typography that fits the product voice.",
		});
		addRegexFindings(findings, text, rel, {
			id: "hero-eyebrow-chip",
			name: "Hero eyebrow/pill chip",
			category: "slop",
			severity: "advisory",
			re: /(?:uppercase[^\n]{0,80}(?:tracking|letter-spacing)|tracking-widest[^\n]{0,120}(?:rounded-full|pill)|rounded-full[^\n]{0,120}(?:uppercase|tracking-widest))/g,
			suggestion: "Avoid the default AI SaaS eyebrow chip. Integrate the kicker into the headline, nav, or product artifact.",
		});
		addRegexFindings(findings, text, rel, {
			id: "numbered-section-markers",
			name: "Numbered section markers",
			category: "slop",
			severity: "advisory",
			re: /(?:>\s*0[1-9]\s*<|["'`]0[1-9]["'`]|\b0[1-9]\s*[·./—-])/g,
			suggestion: "Use a section cadence from the product content rather than generic 01/02/03 editorial scaffolding.",
		});
		addRegexFindings(findings, text, rel, {
			id: "marketing-buzzword",
			name: "Generic marketing buzzword",
			category: "copy",
			severity: "warning",
			re: /\b(?:streamline|empower|supercharge|world-class|enterprise-grade|next-generation|cutting-edge|seamless|unlock|transform your|boost productivity|revolutionize)\b/gi,
			suggestion: "Replace with a specific verb/noun that says what the product literally does.",
		});
		addRegexFindings(findings, text, rel, {
			id: "em-dash-overuse",
			name: "Em dash overuse",
			category: "copy",
			severity: "advisory",
			re: /—/g,
			suggestion: "Use em dashes sparingly; repeated dash cadence is a generated-copy tell.",
		});
		addRegexFindings(findings, text, rel, {
			id: "layout-property-animation",
			name: "Layout property animation",
			category: "motion",
			severity: "warning",
			re: /transition(?:Property)?:[^\n;]*(?:width|height|padding|margin|top|left|right|bottom)|transition-(?:all|height|width|padding|margin)/g,
			suggestion: "Animate transform/opacity where possible; avoid layout thrash.",
		});
		addRegexFindings(findings, text, rel, {
			id: "tiny-text",
			name: "Tiny body text",
			category: "quality",
			severity: "warning",
			re: /(?:text-\[?(?:9|10|11)px\]?|font-size:\s*(?:9|10|11)px)/g,
			suggestion: "Use at least 14px for body/supporting text unless it is non-essential metadata.",
		});
		addRegexFindings(findings, text, rel, {
			id: "tight-leading",
			name: "Tight line height",
			category: "quality",
			severity: "advisory",
			re: /(?:leading-\[?1(?:\.0|\.1|\.2)?\]?|line-height:\s*1(?:\.0|\.1|\.2)?\b)/g,
			suggestion: "Use more breathing room for multi-line body text; reserve tight leading for short display text.",
		});
		addRegexFindings(findings, text, rel, {
			id: "justified-text",
			name: "Justified body text",
			category: "quality",
			severity: "advisory",
			re: /(?:text-align:\s*justify|text-justify)/g,
			suggestion: "Avoid justified body text unless hyphenation and line length are carefully controlled.",
		});
		addRegexFindings(findings, text, rel, {
			id: "broken-image",
			name: "Broken/placeholder image",
			category: "quality",
			severity: "warning",
			re: /<img[^>]+src=["'`](?:|#|placeholder|TODO|\/placeholder[^"'`]*)["'`]|<img(?![^>]+src=)/g,
			suggestion: "Use real imagery/assets or remove the image before shipping.",
		});
	}

	const allText = allTextParts.join("\n");
	const nestedCards = (allText.match(/(?:<Card|className=["'`][^"'`]*(?:card|rounded|border|shadow)[^"'`]*["'`])/g)?.length ?? 0);
	if (nestedCards > 18) {
		findings.push({
			id: "card-overuse",
			name: "Possible card/container overuse",
			category: "slop",
			severity: "advisory",
			file: "project",
			line: 1,
			evidence: `${nestedCards} card-like containers found across scanned files`,
			suggestion: "Check for cards inside cards. Flatten hierarchy with spacing, dividers, table structure, or typography.",
		});
	}
	const emDashes = allText.match(/—/g)?.length ?? 0;
	if (emDashes > 6) {
		findings.push({
			id: "em-dash-cadence",
			name: "Project-wide em dash cadence",
			category: "copy",
			severity: "advisory",
			file: "project",
			line: 1,
			evidence: `${emDashes} em dashes found across scanned files`,
			suggestion: "Review copy cadence; repeated em dashes often read as generated prose.",
		});
	}

	findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.file.localeCompare(b.file) || a.line - b.line);
	return { files: files.map((f) => path.relative(cwd, f)), findings };
}

function severityRank(severity: SlopSeverity): number {
	return severity === "error" ? 0 : severity === "warning" ? 1 : 2;
}

function formatSlopFindings(scan: { files: string[]; findings: SlopFinding[] }): string {
	const counts = scan.findings.reduce<Record<string, number>>((acc, f) => {
		acc[f.severity] = (acc[f.severity] ?? 0) + 1;
		return acc;
	}, {});
	const rows = scan.findings.slice(0, 80).map((f) => `- **${f.severity}** \`${f.id}\` ${f.file}:${f.line} — ${f.name}\n  - Evidence: ${f.evidence || "matched pattern"}\n  - Fix: ${f.suggestion}`).join("\n");
	return `# UI Slop Scan\n\nScanned ${scan.files.length} files. Findings: ${scan.findings.length} (${counts.error ?? 0} error, ${counts.warning ?? 0} warning, ${counts.advisory ?? 0} advisory).\n\n${rows || "No deterministic slop/quality patterns found. Still run human/LLM critique for composition, hierarchy, and product fit."}`;
}

function designContextBlock(product?: string, system?: string): string {
	const blocks: string[] = [];
	if (product) blocks.push(`Existing .interface-design/product.md is loaded below. Treat it as product truth: user, context, voice, register, anti-references, and success path.\n\n--- product.md ---\n${product}\n--- end product.md ---`);
	else blocks.push("No .interface-design/product.md was found. If product context is durable, offer to create it after discovery.");
	if (system) blocks.push(`Existing .interface-design/system.md is loaded below. Reuse it, extend instead of reinventing, and audit new work against it.\n\n--- system.md ---\n${system}\n--- end system.md ---`);
	else blocks.push("No .interface-design/system.md was found. Establish a direction and offer to save it after implementation.");
	return blocks.join("\n\n");
}

function buildDiscoveryPrompt(product?: string, system?: string, register: DesignRegister = "product"): string {
	return `## UI/UX Design Extension v${VERSION}\n\nYou are operating with mandatory UI/UX discovery and craft rules. ${registerGuidance(register)}\n\nDirect tool use is encouraged when useful: read product/system memory before product UI changes, extract patterns before creating a design system, run slop/audit scans before shipping, and record checkpoints before major components. Commands are for humans; tools are for the LLM to call directly.\n\nBefore editing code, do not jump straight to implementation. First inspect relevant files when needed, then produce a concise proposal with:\n\nUX Discovery:\n- Primary user: the actual human, not generic "users"\n- Context: where/when/why they open this screen\n- Job-to-be-done: the verb they must accomplish\n- Success path: the shortest successful flow\n- Friction risks: likely confusion, delay, error, trust, accessibility issues\n- Required states: loading, empty, error, disabled, success, focus/hover\n\nUI Discovery:\n- Register: product, brand, or hybrid; explain why\n- Domain: 5+ concepts/vocabulary/metaphors from this product world\n- Color world: 5+ colors/materials/lights that naturally belong to that domain\n- Signature: one visual, structural, or interaction element unique to this product\n- Anti-references: 3 obvious generic visual/structural/copy choices explicitly rejected and what replaces each\n- Direction: final aesthetic/product direction tied to the above\n\nBefore each major component, use or state a checkpoint:\nIntent, Register, Palette, Depth, Surfaces, Typography, Spacing, Signature, Anti-references, Required states, Accessibility constraints, Implementation constraints.\n\nIf context is insufficient, ask 2-4 targeted questions OR state explicit assumptions. Ask for direction confirmation before large implementation unless the user explicitly asked to proceed.\n\nAfter building, self-critique with swap test, squint test, signature test, token test, slop scan, UX states/accessibility check. Offer to save reusable patterns to .interface-design/product.md and/or .interface-design/system.md.\n\n${designContextBlock(product, system)}`;
}

function defaultProductTemplate(): string {
	return `# Product Context\n\n## Primary user\n\n## Context of use\n\n## Job-to-be-done\n\n## Register\nProduct | Brand | Hybrid\n\n## Voice\n\n## Anti-references\n- \n\n## Success path\n\n## Friction risks\n\n## Durable notes\n`;
}

export default function uiUxDesignExtension(pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event, _ctx) => {
		if (!isUiPrompt(event.prompt)) return;
		const { product, system } = await readDesignContext(event.systemPromptOptions.cwd);
		return { systemPrompt: `${event.systemPrompt}\n\n${buildDiscoveryPrompt(product, system, inferRegister(event.prompt, product))}` };
	});

	pi.registerCommand("interface-design:help", {
		description: "Show UI/UX design extension commands and tools.",
		handler: async (_args, _ctx) => {
			pi.sendMessage({ customType: "ui-ux-design", display: true, content: `# UI/UX Design Extension Help\n\n## Commands\n\n- /interface-design:help — show this help.\n- /interface-design:status — show current .interface-design/product.md and system.md summary.\n- /interface-design:product — discover/update durable product context.\n- /interface-design:init — start UX/UI discovery and propose project product + design system memory.\n- /interface-design:extract <path?> — scan UI files and extract repeated tokens/patterns.\n- /interface-design:slop <path?> — deterministic scan for generic AI UI/copy and quality anti-patterns.\n- /interface-design:audit <path?> — audit UI against .interface-design/system.md.\n- /interface-design:critique — critique latest UI for craft, UX states, accessibility, and generic defaults.\n- /interface-design:polish <target?> — final <REDACTED> pass.\n- /interface-design:harden <target?> — edge cases, a11y, loading/error/empty/overflow pass.\n- /interface-design:typeset <target?> — typography hierarchy and readability pass.\n- /interface-design:layout <target?> — spacing, grouping, density, alignment pass.\n\n## Recommended flow\n\n1. New project or important UI: /interface-design:init\n2. Capture product truth: /interface-design:product\n3. Infer existing tokens: /interface-design:extract src/\n4. Build normally; the LLM auto-loads product/system memory on UI prompts.\n5. Before shipping: /interface-design:slop src/, /interface-design:polish <target>, /interface-design:harden <target>, /interface-design:audit <target>.\n\n## Examples\n\n- /interface-design:product\n- /interface-design:extract src/components\n- /interface-design:slop src/app/dashboard\n- /interface-design:polish src/app/settings/alerts\n- /interface-design:harden src/components/CheckoutForm.tsx\n- /interface-design:typeset src/components/Hero.tsx\n- /interface-design:layout src/app/admin/users/page.tsx\n\nNatural-language examples also work:\n\n- Create the alert settings screen. Use product.md/system.md, checkpoint before implementing, and run slop scan at the end.\n- This dashboard feels like generic AI SaaS. Run slop scan and fix the obvious issues without changing the flow.\n- Before shipping this page, harden loading, empty, error, keyboard, mobile, and overflow states.\n\n## LLM direct tool use\n\nCommands are for humans. The LLM can call tools directly when useful:\n\n- interface_design_status — read product/system memory.\n- interface_design_extract — infer tokens/patterns.\n- interface_design_slop_scan — detect AI slop and quality anti-patterns.\n- interface_design_audit — compare implementation to system.md.\n- interface_design_checkpoint — record intent/register/palette/states before major components.\n- interface_design_save_product and interface_design_save_system — save memory only after user approval.\n\n## Automatic behavior\n\nWhen your prompt looks like UI/UX/frontend work, the extension injects product/brand/hybrid guidance, loads .interface-design/product.md and system.md, and instructs the LLM to call tools directly when useful.\n\n## Design memory\n\nProject decisions are stored in:\n\n.interface-design/product.md\n.interface-design/system.md\n\nUse /interface-design:product for product context, /interface-design:init for full setup, /interface-design:extract to infer tokens, and /interface-design:slop before shipping.` });
		},
	});

	pi.registerCommand("interface-design:status", {
		description: "Show current .interface-design product/system summary.",
		handler: async (_args, ctx) => {
			const { product, system } = await readDesignContext(ctx.cwd);
			if (!product && !system) { ctx.ui.notify("No .interface-design/product.md or system.md found. Use /interface-design:product or /interface-design:init.", "warning"); return; }
			const productExcerpt = product ? product.split("\n").slice(0, 60).join("\n") : "_No .interface-design/product.md found._";
			const systemExcerpt = system ? system.split("\n").slice(0, 80).join("\n") : "_No .interface-design/system.md found._";
			pi.sendMessage({ customType: "ui-ux-design", display: true, content: `# Interface Design Context\n\n## Product\n\n${productExcerpt}\n\n## System\n\n${systemExcerpt}` });
		},
	});

	pi.registerCommand("interface-design:product", {
		description: "Discover or update durable product UI context in .interface-design/product.md.",
		handler: async (_args, _ctx) => {
			pi.sendUserMessage(`Start interface-design product discovery. Inspect the project and existing .interface-design/product.md if present. Capture primary user, context of use, job-to-be-done, register (product/brand/hybrid), voice, anti-references, success path, friction risks, and durable notes. If missing, propose this template and ask before saving unless I explicitly approve:\n\n${defaultProductTemplate()}`);
		},
	});

	pi.registerCommand("interface-design:init", {
		description: "Start UI/UX design discovery and optionally create .interface-design/product.md and system.md.",
		handler: async (_args, _ctx) => {
			pi.sendUserMessage("Start UI/UX interface-design init. Inspect the project, determine product domain, primary user, job-to-be-done, register (product/brand/hybrid), voice, anti-references, color world, signature, defaults to reject, and propose .interface-design/product.md plus a DESIGN.md-like .interface-design/system.md. If I confirm, create both files.");
		},
	});

	pi.registerCommand("interface-design:extract", {
		description: "Extract repeated UI patterns from code. Usage: /interface-design:extract <path?>",
		handler: async (args, ctx) => {
			const r = await extractPatterns(ctx.cwd, args.trim() || undefined);
			pi.sendMessage({ customType: "ui-ux-design", display: true, content: `# Extracted UI Patterns\n\nScanned ${r.files.length} files.\n\n${formatMap("Spacing", r.spacing)}\n\n${formatMap("Radius", r.radius)}\n\n${formatMap("Colors", r.colors)}\n\n${formatMap("Fonts", r.fonts)}\n\n### Depth\n- border occurrences: ${r.borders}\n- shadow occurrences: ${r.shadows}\n\nSuggested depth: ${r.borders >= r.shadows ? "borders-only / surface shifts" : "shadow-based"}\n\nAsk me to save these into .interface-design/system.md if this matches the product direction.` });
		},
	});

	pi.registerCommand("interface-design:slop", {
		description: "Deterministically scan for AI UI/copy slop and quality anti-patterns. Usage: /interface-design:slop <path?>",
		handler: async (args, ctx) => {
			const scan = await scanSlop(ctx.cwd, args.trim() || undefined);
			pi.sendMessage({ customType: "ui-ux-design", display: true, content: formatSlopFindings(scan) });
		},
	});

	pi.registerCommand("interface-design:audit", {
		description: "Audit UI files against .interface-design/system.md. Usage: /interface-design:audit <path?>",
		handler: async (args, ctx) => {
			const system = await readSystem(ctx.cwd);
			if (!system) { ctx.ui.notify("No .interface-design/system.md found; run /interface-design:init or /interface-design:extract first.", "warning"); return; }
			pi.sendUserMessage(`Audit UI implementation against .interface-design/system.md. Target: ${args.trim() || "common UI paths"}. Check spacing grid, depth strategy, hardcoded colors, pattern drift, interactive states, UX states, accessibility risks, and deterministic slop. Report precise files/lines when possible; do not edit unless I ask.`);
		},
	});

	pi.registerCommand("interface-design:critique", {
		description: "Critique current UI for craft and UX, then propose/fix what defaulted.",
		handler: async (_args, _ctx) => {
			pi.sendUserMessage("Run a UI/UX craft critique on the latest build. Check composition rhythm, focal point, proportions, typography hierarchy, surface subtlety, content coherence, implementation structure, interaction states, accessibility, empty/loading/error states, signature presence, brand-vs-product register fit, and deterministic slop. Identify what defaulted. If fixes are obvious and safe, implement them; otherwise propose them.");
		},
	});

	pi.registerCommand("interface-design:polish", {
		description: "Final design-system alignment and shipping-readiness pass. Usage: /interface-design:polish <target?>",
		handler: async (args, _ctx) => {
			pi.sendUserMessage(`Run interface-design polish for ${args.trim() || "the latest UI"}. Load product/system memory, inspect implementation, run slop scan where useful, then improve alignment, visual rhythm, hierarchy, spacing consistency, states, copy specificity, and accessibility. Keep changes scoped and report files changed.`);
		},
	});

	pi.registerCommand("interface-design:harden", {
		description: "Harden UI edge cases, states, accessibility, overflow, and responsive behavior. Usage: /interface-design:harden <target?>",
		handler: async (args, _ctx) => {
			pi.sendUserMessage(`Run interface-design harden for ${args.trim() || "the latest UI"}. Check and fix loading, empty, error, disabled, success, focus/hover, keyboard, reduced-motion, contrast, long text, overflow, mobile/responsive, and semantic/a11y edge cases. Keep visual direction intact.`);
		},
	});

	pi.registerCommand("interface-design:typeset", {
		description: "Fix typography hierarchy, readability, line length, and font intentionality. Usage: /interface-design:typeset <target?>",
		handler: async (args, _ctx) => {
			pi.sendUserMessage(`Run interface-design typeset for ${args.trim() || "the latest UI"}. Inspect font choices, type scale, hierarchy, line-height, line length, tracking, label styles, numeric/tabular alignment, and overused/generated font defaults. Propose or implement scoped improvements.`);
		},
	});

	pi.registerCommand("interface-design:layout", {
		description: "Fix layout, spacing, density, grouping, and alignment. Usage: /interface-design:layout <target?>",
		handler: async (args, _ctx) => {
			pi.sendUserMessage(`Run interface-design layout pass for ${args.trim() || "the latest UI"}. Inspect grid, alignment, grouping, rhythm, density, empty space, card nesting, scroll regions, responsive breakpoints, and task flow. Propose or implement scoped improvements.`);
		},
	});

	pi.registerTool({
		name: "interface_design_status",
		label: "Interface Design Status",
		description: "Read .interface-design/product.md and .interface-design/system.md for the current project.",
		promptSnippet: "Read the project interface product and design system memory.",
		promptGuidelines: ["Use interface_design_status before changing product UI when .interface-design memory may exist."],
		parameters: Type.Object({}),
		async execute(_id, _params, _signal, _onUpdate, ctx) {
			const { product, system } = await readDesignContext(ctx.cwd);
			const text = `${product ? `.interface-design/product.md:\n\n${product}` : "No .interface-design/product.md found."}\n\n${system ? `.interface-design/system.md:\n\n${system}` : "No .interface-design/system.md found."}`;
			return { content: [{ type: "text", text }], details: { productExists: Boolean(product), systemExists: Boolean(system) } };
		},
	});

	pi.registerTool({
		name: "interface_design_save_product",
		label: "Save Interface Product Context",
		description: "Create or replace .interface-design/product.md with durable product UI context.",
		promptSnippet: "Save reusable product UI context to .interface-design/product.md.",
		promptGuidelines: ["Use interface_design_save_product only after user approval to save durable product context."],
		parameters: SaveProductParams,
		async execute(_id, params: SaveProductParamsType, _signal, _onUpdate, ctx) {
			const dir = path.join(ctx.cwd, SYSTEM_DIR);
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(path.join(dir, PRODUCT_FILE), params.content, "utf8");
			return { content: [{ type: "text", text: "Saved .interface-design/product.md" }], details: { path: path.join(SYSTEM_DIR, PRODUCT_FILE) } };
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
		description: "Scan UI files and summarize repeated spacing, radius, color, font, border, and shadow patterns.",
		promptSnippet: "Extract repeated UI tokens and patterns from code.",
		promptGuidelines: ["Use interface_design_extract when creating a design system from existing UI."],
		parameters: PathParams,
		async execute(_id, params: PathParamsType, _signal, _onUpdate, ctx) {
			const r = await extractPatterns(ctx.cwd, params.path);
			const text = `Scanned ${r.files.length} files.\n\n${formatMap("Spacing", r.spacing)}\n\n${formatMap("Radius", r.radius)}\n\n${formatMap("Colors", r.colors)}\n\n${formatMap("Fonts", r.fonts)}\n\nDepth: borders=${r.borders}, shadows=${r.shadows}`;
			return { content: [{ type: "text", text }], details: { files: r.files, borders: r.borders, shadows: r.shadows } };
		},
	});

	pi.registerTool({
		name: "interface_design_slop_scan",
		label: "Interface Slop Scan",
		description: "Deterministically scan UI files for generic AI UI/copy tells and quality anti-patterns.",
		promptSnippet: "Scan UI code for AI slop, generic defaults, copy tells, and quality anti-patterns.",
		promptGuidelines: ["Use interface_design_slop_scan before shipping UI, during polish, or when a design feels generic."],
		parameters: PathParams,
		async execute(_id, params: PathParamsType, _signal, _onUpdate, ctx) {
			const scan = await scanSlop(ctx.cwd, params.path);
			return { content: [{ type: "text", text: formatSlopFindings(scan) }], details: scan };
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
			const slop = await scanSlop(ctx.cwd, params.path);
			const risks: string[] = [];
			if (/borders-only/i.test(system) && r.shadows > 0) risks.push(`System says borders-only, but found ${r.shadows} shadow occurrences.`);
			if (/Base:\s*4px/i.test(system)) {
				for (const [v, n] of r.spacing) {
					const px = Number(v.replace("px", ""));
					if (Number.isFinite(px) && px % 4 !== 0) risks.push(`Spacing ${v} appears ${n}x and is off the 4px grid.`);
				}
			}
			if (slop.findings.length > 0) risks.push(`Slop scan found ${slop.findings.length} generic/quality patterns; run interface_design_slop_scan for details.`);
			const text = `Scanned ${r.files.length} files against .interface-design/system.md.\n\n${risks.length ? risks.map((x) => `- ${x}`).join("\n") : "No obvious token/depth/slop drift found by static scan."}\n\n${formatMap("Observed spacing", r.spacing)}\n\n${formatMap("Observed colors", r.colors)}\n\n${formatMap("Observed fonts", r.fonts)}\n\nNote: this is a heuristic scan; inspect files for component-level pattern drift, states, and accessibility.`;
			return { content: [{ type: "text", text }], details: { exists: true, risks, files: r.files, slopFindings: slop.findings.length } };
		},
	});

	pi.registerTool({
		name: "interface_design_checkpoint",
		label: "Interface Design Checkpoint",
		description: "Record the mandatory UI/UX design checkpoint before implementing a major component.",
		promptSnippet: "Record UI/UX intent, register, palette, depth, surfaces, typography, spacing, signature, states, accessibility, and implementation constraints before building.",
		promptGuidelines: ["Use interface_design_checkpoint before implementing major UI components in product interfaces."],
		parameters: CheckpointParams,
		async execute(_id, params: CheckpointParamsType) {
			const text = `Intent: ${params.intent}\nRegister: ${params.register ?? "product"}\nPalette: ${params.palette}\nDepth: ${params.depth}\nSurfaces: ${params.surfaces}\nTypography: ${params.typography}\nSpacing: ${params.spacing}\nSignature: ${params.signature}\nAnti-references: ${params.antiReferences ?? "not specified"}\nStates: ${params.states ?? "not specified"}\nAccessibility: ${params.accessibility ?? "not specified"}\nImplementation: ${params.implementation ?? "not specified"}`;
			return { content: [{ type: "text", text }], details: params };
		},
	});
}
