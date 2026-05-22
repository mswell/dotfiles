#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [, , inputPath, siteRootArg] = process.argv;
const siteRoot = siteRootArg || process.cwd();

function fail(message) {
  console.error(message);
  process.exit(2);
}

if (!inputPath) fail('Usage: validate-post.mjs <obsidian-post.md> [site-root]');

const abs = path.resolve(inputPath);
if (!fs.existsSync(abs)) fail(`File not found: ${abs}`);
if (!abs.endsWith('.md') && !abs.endsWith('.mdx')) fail('Post must be a .md or .mdx file');

const text = fs.readFileSync(abs, 'utf8');
const lines = text.split(/\r?\n/);
const issues = [];
const warnings = [];
const suggestions = [];

function addIssue(msg) { issues.push(msg); }
function addWarning(msg) { warnings.push(msg); }
function addSuggestion(msg) { suggestions.push(msg); }

let frontmatter = '';
let body = text;
if (lines[0] === '---') {
  const end = lines.findIndex((line, index) => index > 0 && line === '---');
  if (end === -1) {
    addIssue('Frontmatter starts with --- but has no closing ---');
  } else {
    frontmatter = lines.slice(1, end).join('\n');
    body = lines.slice(end + 1).join('\n');
  }
} else {
  addIssue('Missing YAML frontmatter delimited by ---');
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (/^['"].*['"]$/.test(trimmed)) return trimmed.slice(1, -1);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^\[.*\]$/.test(trimmed)) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((item) => parseScalar(item.trim()));
  }
  return trimmed;
}

function parseFrontmatter(src) {
  const data = {};
  const rawLines = src.split(/\r?\n/);
  for (const line of rawLines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = parseScalar(match[2]);
  }
  return data;
}

const data = parseFrontmatter(frontmatter);

for (const key of ['title', 'description', 'pubDate']) {
  if (!(key in data) || data[key] === '') addIssue(`Missing required frontmatter field: ${key}`);
}

if ('title' in data && typeof data.title !== 'string') addIssue('title must be a string');
if ('description' in data && typeof data.description !== 'string') addIssue('description must be a string');
if ('description' in data && typeof data.description === 'string') {
  if (data.description.length < 30) addWarning('description is very short; use a useful summary for listing/SEO/RSS');
  if (data.description.length > 180) addWarning('description is long; keep it roughly under 160–180 chars');
}
if ('pubDate' in data && !/^\d{4}-\d{2}-\d{2}$/.test(String(data.pubDate))) {
  addIssue('pubDate must use YYYY-MM-DD format, e.g. 2026-05-20');
}
if ('tags' in data && !Array.isArray(data.tags)) addIssue('tags must be an inline array, e.g. ["segurança", "engenharia"]');
if (!('tags' in data)) addWarning('tags missing; site defaults to [], but tags help discovery');
if ('lang' in data && !['pt-BR', 'en'].includes(data.lang)) addIssue('lang must be "pt-BR" or "en"');
if (!('lang' in data)) addWarning('lang missing; site defaults to pt-BR');
if ('draft' in data && typeof data.draft !== 'boolean') addIssue('draft must be true or false without quotes');
if (!('draft' in data)) addWarning('draft missing; site defaults to false, so the post may publish immediately after copy');

if (/\[\[[^\]]+\]\]/.test(body)) addIssue('Obsidian wikilinks detected ([[...]]); replace with normal Markdown links before publishing');
if (/!\[\[[^\]]+\]\]/.test(body)) addIssue('Obsidian embeds detected (![[...]]); replace with Markdown images/links and site assets');
if (/^#[\p{L}0-9_-]+/mu.test(body)) addWarning('Loose Obsidian tags detected in body; prefer frontmatter tags');
if (/> \[!\w+\]/.test(body)) addWarning('Obsidian callouts detected; Astro will render them as plain blockquotes unless styled');

const fenceCount = (body.match(/^```/gm) || []).length;
if (fenceCount % 2 !== 0) addIssue('Unclosed fenced code block detected');

const h1s = body.match(/^#\s+/gm) || [];
if (h1s.length > 0) addWarning('Body contains H1 heading(s); post title already renders as H1 on the site. Prefer H2/H3 in body');

const h2s = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
const words = (body.match(/[\p{L}\p{N}]+/gu) || []).length;
if (words > 900 || h2s.length >= 4) addSuggestion('Consider adding an index/table of contents near the top because the post is long or has many sections');
if (words < 120) addSuggestion('Post is short; confirm it has enough context, observation, and closing insight');

const slugBase = path.basename(abs).replace(/\.(md|mdx)$/i, '');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugBase)) {
  addWarning(`Filename "${path.basename(abs)}" is not kebab-case; suggested slug: ${slugBase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.md`);
}

const targetDir = path.join(path.resolve(siteRoot), 'src/content/journal');
if (fs.existsSync(targetDir)) {
  const target = path.join(targetDir, path.basename(abs));
  if (fs.existsSync(target)) addWarning(`A post with this filename already exists in site content: ${target}`);
} else {
  addWarning(`Could not find site content directory at ${targetDir}`);
}

const report = {
  file: abs,
  siteRoot: path.resolve(siteRoot),
  frontmatter: data,
  stats: { words, h2Count: h2s.length, codeFenceMarkers: fenceCount },
  headings: h2s,
  issues,
  warnings,
  suggestions,
  compatible: issues.length === 0
};

console.log(JSON.stringify(report, null, 2));
process.exit(issues.length === 0 ? 0 : 1);
