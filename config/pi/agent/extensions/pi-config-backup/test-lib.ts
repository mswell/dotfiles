// Run with: node --experimental-strip-types --test test-lib.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	redactText,
	redactionWouldBreakFile,
	sanitizeJson,
	syntaxCheck,
	fileHash,
	extractVersion,
	expandHome,
	shouldSkipEntry,
} from "./lib.ts";

function tmpFile(name: string, content: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcb-"));
	const p = path.join(dir, name);
	fs.writeFileSync(p, content);
	return p;
}

// Keep secret-like test fixtures out of contiguous source literals. pi-backup
// redacts this file before storing it in dotfiles; if fixtures are already
// present as complete strings, the backed-up test stops testing the redactor.
function fixture(...parts: string[]): string {
	return parts.join("");
}

test("redactText: provider keys, AWS, Google, Slack, GitLab", () => {
	assert.match(redactText(fixture("key=sk-ant-", "0123456789abcdef0123")), /<REDACTED>/);
	assert.match(redactText(fixture("github_pat_", "0123456789abcdefghij0")), /<REDACTED>/);
	assert.match(redactText(fixture("glpat-", "abcdef0123456789ABCD")), /<REDACTED>/);
	assert.match(redactText(fixture("AKIA", "IOSFODNN7EXAMPLE")), /<REDACTED>/);
	assert.match(redactText(fixture("AIzaSy", "A1234567890abcdefghijklmnop_qrst")), /<REDACTED>/);
	assert.match(redactText(fixture("xoxb-", "12345-abcdefABCDEF")), /<REDACTED>/);
});

test("redactText: bearer, JWT, header, KEY=value", () => {
	assert.match(redactText(fixture("token = Bearer ", "abcdefghijklmnop1234")), /Bearer <REDACTED>/);
	assert.match(redactText(fixture("t=eyJ", "hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", ".eyJzdWIiOiIxMjM0NTY3ODkwIn0", ".abcdefghij")), /<REDACTED_JWT>/);
	assert.match(redactText(fixture("Co", "okie: session=abc123")), /[Cc]ookie: <REDACTED>/);
	assert.match(redactText("API_KEY=supersecretvalue"), /API_KEY=<REDACTED>/);
});

test("redactText: leaves benign text untouched", () => {
	const benign = "const greeting = 'hello world';\nexport default greeting;\n";
	assert.equal(redactText(benign), benign);
});

test("sanitizeJson: redacts sensitive keys and nested string values", () => {
	const input = { apiKey: "abc", nested: { token: "x", note: fixture("Bearer ", "abcdefghijklmnop1234") }, list: ["ok"] };
	const out = sanitizeJson(input) as any;
	assert.equal(out.apiKey, "<REDACTED>");
	assert.equal(out.nested.token, "<REDACTED>");
	assert.match(out.nested.note, /Bearer <REDACTED>/);
	assert.deepEqual(out.list, ["ok"]);
});

test("redactionWouldBreakFile: blocks redacted code/scripts but allows docs", () => {
	assert.equal(redactionWouldBreakFile("tool.ts", "const x = 'secret';", "const x = '<REDACTED>';"), true);
	assert.equal(redactionWouldBreakFile("script.sh", "export TOKEN=x", "export TOKEN=<REDACTED>"), true);
	assert.equal(redactionWouldBreakFile("notes.md", "Bearer abc", "Bearer <REDACTED>"), false);
	assert.equal(redactionWouldBreakFile("tool.ts", "const x = 1;", "const x = 1;"), false);
});

test("syntaxCheck: valid JS passes", () => {
	const p = tmpFile("ok.js", "const x = 1; module.exports = x;\n");
	assert.equal(syntaxCheck(p).ok, true);
});

test("syntaxCheck: broken JS is excluded (ok=false)", () => {
	const p = tmpFile("bad.js", "const x = ;\n");
	const r = syntaxCheck(p);
	assert.equal(r.ok, false);
	assert.ok(r.error);
});

test("syntaxCheck: CommonJS-style typed TS is NEVER excluded (regression for false-positive skip)", () => {
	// This exact shape made `node --check` fail and dropped the file from backups.
	const p = tmpFile("script.ts", "const x: number = 1;\nmodule.exports = x;\n");
	const r = syntaxCheck(p);
	assert.equal(r.ok, true); // kept regardless
});

test("syntaxCheck: non-code files pass untouched", () => {
	const p = tmpFile("notes.md", "# hi\n");
	assert.equal(syntaxCheck(p).ok, true);
});

test("fileHash: stable + content-sensitive", () => {
	assert.equal(fileHash("a"), fileHash(Buffer.from("a")));
	assert.notEqual(fileHash("a"), fileHash("b"));
	assert.match(fileHash("a"), /^sha256:[0-9a-f]{64}$/);
});

test("extractVersion: reads VERSION constant", () => {
	assert.equal(extractVersion('const VERSION = "1.2.3";'), "1.2.3");
	assert.equal(extractVersion("let VERSION = '9.9';"), "9.9");
	assert.equal(extractVersion("no version here"), undefined);
});

test("expandHome", () => {
	assert.equal(expandHome("~"), os.homedir());
	assert.equal(expandHome("~/x"), path.join(os.homedir(), "x"));
	assert.equal(expandHome("/abs"), "/abs");
});

test("shouldSkipEntry: dirs and sensitive filenames", () => {
	assert.ok(shouldSkipEntry("sessions"));
	assert.ok(shouldSkipEntry("node_modules"));
	assert.ok(shouldSkipEntry(".env"));
	assert.ok(shouldSkipEntry("id_rsa"));
	assert.equal(shouldSkipEntry("index.ts"), undefined);
});
