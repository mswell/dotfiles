// Pure, dependency-free helpers for pi-config-backup.
// Extracted so they can be unit-tested directly with `node --experimental-strip-types`.

import * as crypto from "node:crypto";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";

export const SENSITIVE_KEY_RE = /(api[_-]?key|token|secret|password|passwd|cookie|credential|oauth|authorization|bearer|client[_-]?secret|private[_-]?key|refresh[_-]?token|access[_-]?token|session[_-]?token|pat)/i;
export const SKIP_NAME_RE = /^(sessions|node_modules|\.git|\.cache|cache|tmp|temp|logs?|npm|git|\.pre-restore-snapshot)$/i;
export const SKIP_FILE_RE = /(\.env($|\.)|secret|secrets|credential|credentials|cookie|cookies|oauth|auth|token|tokens|keychain|known_hosts|id_rsa|id_ed25519|\.pem$|\.p12$|\.pfx$)/i;
export const TEXT_FILE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|txt|yaml|yml|toml|sh|bash|zsh|fish|ini|conf|config|gitignore)$/i;
export const JSON_FILE_RE = /\.json$/i;
// Files whose backed-up content should remain runnable/source-equivalent. If
// redaction would alter one of these files, skip it instead of storing broken code.
export const CODE_FILE_RE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|sh|bash|zsh|fish)$/i;
// Files that Pi can load/execute directly and that `node --check` validates reliably.
export const LOADABLE_JS_RE = /\.(js|cjs|mjs|jsx)$/i;
// TypeScript sources: `node --check` is unreliable here (type stripping only
// engages for ESM and is order-sensitive), so failures must never exclude them.
export const TS_FILE_RE = /\.(ts|tsx|mts|cts)$/i;
const VERSION_RE = /(?:const|let|var)\s+VERSION\s*=\s*["']([^"']+)["']/;

export function expandHome(inputPath: string): string {
	if (inputPath === "~") return os.homedir();
	if (inputPath.startsWith("~/")) return path.join(os.homedir(), inputPath.slice(2));
	return inputPath;
}

export function fileHash(content: Buffer | string): string {
	return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
}

export function extractVersion(content: string): string | undefined {
	const match = content.match(VERSION_RE);
	return match?.[1];
}

export type SyntaxCheckResult = { ok: boolean; error?: string; warning?: string };

/**
 * Validate a JS/TS file's syntax before backing it up.
 *
 * - Loadable JS (.js/.cjs/.mjs/.jsx): hard validation with `node --check`.
 *   A failure means the file is excluded from the backup (don't propagate a
 *   broken, directly-loadable artifact).
 * - TypeScript (.ts/.tsx/.mts/.cts): `node --check` cannot reliably parse type
 *   annotations (type stripping only kicks in for ESM and is order-sensitive),
 *   so a failure is downgraded to a non-blocking warning and the file is still
 *   backed up. This prevents silent data loss of valid TypeScript sources.
 * - Anything else: always ok.
 */
export function syntaxCheck(filePath: string): SyntaxCheckResult {
	const isLoadableJs = LOADABLE_JS_RE.test(filePath);
	const isTs = TS_FILE_RE.test(filePath);
	if (!isLoadableJs && !isTs) return { ok: true };
	try {
		const flag = isTs ? "--experimental-strip-types " : "";
		execSync(`node ${flag}--check "${filePath}"`, { stdio: "pipe", timeout: 10000 });
		return { ok: true };
	} catch (err: any) {
		const detail = err?.stderr?.toString()?.slice(0, 200) || "syntax error";
		if (isTs) {
			return { ok: true, warning: `node --check could not parse TypeScript (kept anyway): ${detail}` };
		}
		return { ok: false, error: detail };
	}
}

export function shouldSkipEntry(name: string): string | undefined {
	if (SKIP_NAME_RE.test(name)) return "sensitive or generated directory";
	if (SKIP_FILE_RE.test(name)) return "sensitive-looking filename";
	return undefined;
}

export function redactionWouldBreakFile(filePath: string, original: string, sanitized: string): boolean {
	return CODE_FILE_RE.test(filePath) && original !== sanitized;
}

export function redactText(input: string): string {
	let text = input;
	// Bearer tokens
	text = text.replace(/Bearer\s+[A-Za-z0-9._~+\/-]{16,}=*/gi, "Bearer <REDACTED>");
	// Provider-specific API keys / tokens
	text = text.replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{16,})\b/g, "<REDACTED>");
	// AWS access key IDs
	text = text.replace(/\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA)[A-Z0-9]{16}\b/g, "<REDACTED>");
	// Google API keys
	text = text.replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, "<REDACTED>");
	// Slack tokens (bot/user/app/refresh/legacy)
	text = text.replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, "<REDACTED>");
	// JWTs
	text = text.replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g, "<REDACTED_JWT>");
	// KEY=value / KEY: value pairs with sensitive names
	text = text.replace(new RegExp(`(^|\\n)(\\s*)([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PASSWD|COOKIE|OAUTH|AUTHORIZATION|CLIENT[_-]?SECRET|PRIVATE[_-]?KEY)[A-Z0-9_]*)\\s*[:=]\\s*([^\\n\\r]+)`, "g"), "$1$2$3=<REDACTED>");
	// HTTP auth/cookie headers
	text = text.replace(/(authorization|cookie|set-cookie)\s*:\s*[^\n\r]+/gi, "$1: <REDACTED>");
	return text;
}

export function sanitizeJson(value: unknown): unknown {
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
