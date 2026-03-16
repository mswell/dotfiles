---
name: security-audit
description: Comprehensive security code audit using multi-phase analysis (Setup → Architecture → STRIDE → Code Review → Dependencies/Config → Report). Parallelized subagent orchestration with integrated scripts. Use when asked to perform security review, vulnerability assessment, code audit, pentest code review, find security bugs, or analyze code for vulnerabilities. Optimized for bug bounty hunting and AppSec with concrete evidence and exploitability validation.
---

# Security Audit & Code Review Skill

Multi-phase security analysis with parallelized subagent orchestration. Produces actionable findings with **concrete evidence** (Source-to-Sink), eliminating generic warnings and false positives.

**Rule #1: NO HALLUCINATION.** Every finding MUST have exact file paths, line numbers, code snippets, and a reproducible exploit path.
**Rule #2: Taint Analysis is MANDATORY.** Prove user-controlled input (Source) reaches a dangerous function (Sink) without sanitization. Theoretical issues without attack vectors MUST NOT be reported.
**Rule #3: BRAIN DUMP MANDATE.** Before listing vulnerabilities, document reasoning, dead ends, and false positive eliminations.
**Rule #4: Use Claude Code tools.** Prefer Grep tool over `rg`/`grep` via Bash. Use Glob for file discovery. Reserve Bash for script execution and tool-specific commands (`ast-grep`, `openssl`, `curl`).
**Rule #5: QUALITY GATE.** Every finding MUST pass: (a) exact file:line reference, (b) proven taint flow, (c) realistic exploit scenario, (d) no generic/theoretical issues, (e) actionable remediation with code.

## Tool Usage

Subagents MUST use Claude Code's dedicated tools:
- **Grep tool** for all text/pattern searches (NOT `rg`/`grep` via Bash)
- **Glob tool** for file discovery (NOT `find`/`ls` via Bash)
- **Read tool** for file reading (NOT `cat`/`head`/`tail` via Bash)
- **Bash tool** ONLY for: `ast-grep`, `python3` scripts, `npm audit`, `pip audit`, `openssl`, `curl`

**Available scripts (invoke via Bash with `python3`):**
- `scripts/detect_project.py <path>` — detects tech stack, frameworks, databases, entry points
- `scripts/scan_secrets.py <path>` — pattern + entropy-based secret scanning
- `scripts/analyze_dependencies.py <path>` — checks dependencies against known vulnerabilities
- `scripts/generate_report.py` — generates report in Markdown/JSON/SARIF (requires findings input)

**Reference files (provide to subagents):**
- `references/vulnerability-patterns.md` — tech-stack-specific sink/source patterns (JS, Python, Go, PHP, Ruby, Java, Rust)
- `references/stride-methodology.md` — STRIDE categories with concrete search patterns
- `references/secrets-patterns.md` — regex patterns for 24+ secret types with entropy thresholds
- `references/api-security-checklist.md` — OWASP API Top 10 2023 checklist
- `references/business-logic-checklist.md` — business logic vulnerability patterns
- `references/cwe-mapping.md` — CWE mapping by severity with CVSS scoring guide
- `references/report-templates.md` — canonical report templates (Markdown, JSON, SARIF, Bug Bounty)

---

## Phase 0: Setup & Detection

**Goal:** Prepare workspace, detect project structure, run initial scans. NOT delegated to subagents.

### Step 1: Create workspace
```bash
mkdir -p .security-audit
```

### Step 2: Detect project (run script)
```bash
python3 scripts/detect_project.py <codebase_path> > .security-audit/project_info.json
```
Review output: languages, frameworks, databases, entry points, config files.

### Step 3: Initial secrets scan
```bash
python3 scripts/scan_secrets.py <codebase_path> > .security-audit/secrets_scan.json
```
Flag any high-confidence findings immediately.

### Step 4: Dependency check
```bash
python3 scripts/analyze_dependencies.py <codebase_path> > .security-audit/deps_scan.json
```

### Step 5: Determine tech-specific subagent

| Primary Tech Stack | Subagent |
|---|---|
| JavaScript/TypeScript/Node.js | `js-security-expert` |
| Python (Django, Flask, FastAPI) | `webapp-security` |
| Go | `pentest` |
| PHP (Laravel, Symfony, WordPress) | `webapp-security` |
| Ruby (Rails, Sinatra) | `webapp-security` |
| Java/Kotlin (Spring, Android) | `webapp-security` |
| REST API focused | `api-security` |
| GraphQL API focused | `api-security` |
| Mixed/unclear | `pentest` |

If the project has multiple significant stacks (e.g., Python backend + JS frontend), launch **both** tech-specific agents in Wave 1.

---

## Subagent Orchestration

Parallelized 2-wave architecture for maximum speed.

```
Wave 1 (PARALLEL — launch all in a single message):
  ├── security agent             → Phases 1 + 2 (Architecture + STRIDE) → .security-audit/architecture.md
  ├── [tech-specific agent]      → Phase 3 (Deep Code Review + Taint Analysis)
  └── security-automation agent  → Phase 4 (Dependencies + Secrets + Configuration)

Wave 2 (SEQUENTIAL — after Wave 1 completes):
  └── report-writer agent → Phase 5: Compile .security-audit/scan_report.md
```

**Steps:**
1. **Phase 0:** Run setup yourself — detect project, run scripts, determine agents.
2. **Wave 1:** Launch 3 `Agent` calls in parallel. Provide each with:
   - **security agent:** Phase 1+2 instructions, codebase path, `references/stride-methodology.md`
   - **tech-specific agent:** Phase 3 instructions, codebase path, detected stack, `references/vulnerability-patterns.md`, `references/secrets-patterns.md`
   - **security-automation agent:** Phase 4 instructions, codebase path, Phase 0 scan results, `references/api-security-checklist.md`, `references/business-logic-checklist.md`
3. **Wave 2:** Launch `report-writer` with all Wave 1 findings + `references/cwe-mapping.md` + `references/report-templates.md`.
4. Output `.security-audit/scan_report.md` path.

---

## Workflow Overview

```
Phase 0: Setup & Detection       → detect_project.py, scan_secrets.py, analyze_dependencies.py
Phase 1: Architecture Assessment → tech stack, entry points, auth, data flows
Phase 2: STRIDE Threat Modeling  → concrete threat hypotheses with search patterns
Phase 3: Deep Code Review        → tech-specific vulnerability hunting + taint analysis
Phase 4: Deps, Secrets & Config  → dependency vulns, secrets deep scan, config security
Phase 5: Report Generation       → compile findings into scan_report.md
```

---

## Phase 1: Architecture Assessment

**Goal:** Map the application's tech stack, attack surface, and trust boundaries.

**Process:**
1. **Tech stack** (supplement detect_project.py): Read root config files (`package.json`, `requirements.txt`, `go.mod`, `pom.xml`, `Gemfile`, `composer.json`, `Cargo.toml`)
2. **Entry points:** Map ALL routes, API endpoints, controllers, exported functions where user input enters
3. **Authentication/Authorization:** How users authenticate (JWT, sessions, OAuth, API keys). How roles/permissions are enforced. Where middleware is applied.
4. **Data flows:** Map how data moves from user input → processing → database → response
5. **External integrations:** Databases, cloud services, third-party APIs, message queues
6. **Trust boundaries:** Where internal ↔ external transitions occur

**Output:** Write `.security-audit/architecture.md` with:
- Tech stack summary
- Entry point inventory
- Auth mechanism description
- Data flow diagram (text-based)
- Areas of concern for Phase 2

---

## Phase 2: STRIDE Threat Modeling

**Goal:** Generate concrete, testable threat hypotheses from Phase 1 architecture.

**Reference:** `references/stride-methodology.md` for full patterns per category.

For each STRIDE category, identify specific threats AND provide search patterns:

### Spoofing (Identity)
- JWT signing flaws: search for `jwt.sign`, `jwt.verify`, hardcoded secrets
- Session fixation: session ID regeneration after login?
- Credential stuffing: rate limiting on login endpoints?
- API key in URL: keys passed as query parameters (logged by proxies)?
- PostMessage origin validation bypass: inverted isSameOrigin checks, regex with unescaped dots (`facebook.com` matches `evilfacebook.com`), domain-only checks without message structure validation
- OAuth redirect_uri path traversal: `startsWith(registeredCallback)` bypassed with `../` sequences
- OAuth redirect_uri domain-only validation: hostname checked but path not — allows path to open redirect on allowed domain
- Login CSRF as chain enabler: force victim into attacker's session, then exploit OAuth/linking flows
- `Math.random()` used as cross-window authentication secret — predictable via PRNG state reconstruction

### Tampering (Data Integrity)
- SQL/NoSQL injection: raw queries with user input
- Mass assignment: ORM create/update with raw request body
- Path traversal: file operations with user-controlled paths
- Prototype pollution: deep merge/assign with user objects
- Client-Side Path Traversal (CSPT2CSRF): user input in fetch/XHR URL path enables `../` traversal to hit unintended API endpoints. Bypasses SameSite cookies (same-origin request). Search: `fetch('/api/' + variable`, `` fetch(`/api/${param}`) ``
- HTTP Parameter Pollution: `param[0=value` overriding `param=value` server-side; test duplicate/bracket-suffix parameters on OAuth and state-changing endpoints
- Parser differentials: server-side MIME validator sees one Content-Type, browser interprets another. `application/json;,text/html` parsed differently by server libs vs browsers

### Repudiation (Audit Trail)
- Missing audit logging for critical actions (user creation, permission changes, payments)
- Log injection: user input written to logs without sanitization
- Insufficient log detail: missing user ID, IP, timestamp on security events

### Information Disclosure
- Verbose error messages: stack traces, SQL errors, internal paths in responses
- IDOR: resource access without ownership verification
- Hardcoded secrets: API keys, passwords, tokens in source (use Phase 0 scan results)
- Directory listing: exposed static file serving configurations
- GraphQL introspection enabled in production
- GraphQL batch API result interpolation: `{result=NAME:$.field}` syntax enables cross-request data exfiltration
- GraphQL error messages leak internal type/class names in production: `"No such class: INTERNAL_TYPE"`
- Multiple GraphQL doc_ids for same resource with inconsistent ACLs — edit/mutation doc_id exposes private fields hidden from view doc_id
- XS-Leaks: cross-origin-loadable resources whose behavior varies based on auth state (CORB oracle, X-Frame-Options conditional, error-vs-success differential)
- PostMessage origin stored as trusted host then used to load scripts or construct API URLs — any origin can inject
- `postMessage(data, '*')` with sensitive tokens/codes in the payload

### Denial of Service
- ReDoS: complex regex with user-controlled input
- Resource exhaustion: unbounded file uploads, missing pagination, no rate limits
- Algorithmic complexity: nested GraphQL queries, recursive operations

### Elevation of Privilege
- Missing function-level access control on admin routes
- Client-side role checks only (bypassable)
- JWT claim manipulation (role, permissions in token payload)
- Insecure deserialization leading to code execution
- GraphQL mutations with `actor_id`/`user_id` not validated against authenticated session — caller can spoof identity
- Permission-modifying mutations callable from low-privilege accounts (enumerate group_ids via query, set via mutation)
- OAuth proxy endpoints auto-injecting CSRF tokens: internal relay accepting `url=` parameter makes authenticated requests on user's behalf

**Output:** Append threat hypotheses to `.security-audit/architecture.md`, ranked by risk.

---

## Phase 3: Deep Code Review & Taint Analysis

**Goal:** Hunt for concrete vulnerability evidence using tech-specific patterns.

**Reference:** `references/vulnerability-patterns.md` for language-specific sink/source patterns.
**Reference:** `references/secrets-patterns.md` for secret detection regex.

**Process:**

### Step 1: Hunt for Sinks
Search for dangerous functions in the detected tech stack. Use Grep tool with patterns from `references/vulnerability-patterns.md`:
- **Command execution** (exec, spawn, system, popen, subprocess)
- **SQL queries** (raw queries, string concatenation/interpolation in SQL)
- **File operations** (read, write, include with user paths)
- **Network requests** (fetch, request, urllib — SSRF)
- **Deserialization** (pickle, yaml.load, unserialize, ObjectInputStream)
- **Template rendering** (render with user input — SSTI)
- **Code evaluation** (eval, exec, Function, vm)
- **PostMessage DOM sinks** (`innerHTML`, `document.write`, `form.action`, `script.src` set from `event.data` in message handlers)
- **URL path construction** (`fetch('/api/' + userInput)`, template literal URL paths — Client-Side Path Traversal)
- **HTML-to-PDF rendering** (wkhtmltopdf, puppeteer, playwright, headless Chrome receiving user HTML — SSRF/LFI via iframe/embed tags)
- **Dynamic JS code generation** (server-side string concatenation/template producing `.js` file content with user-derived values — supply-chain stored XSS)
- **Content-Type reflection** (`res.setHeader('Content-Type', userInput)` after validation — parser differential XSS)

### Step 2: Hunt for Sources
Find where user input enters (from Phase 1 entry points):
- HTTP request parameters (body, query, headers, cookies, files)
- Database reads that return user-controlled data
- File reads, environment variables, WebSocket messages

### Step 3: MANDATORY Taint Analysis
For each sink found:
1. **Trace backward:** Where does the argument originate?
2. **Check sanitizers:** Does it pass through validation? (allowlists, type casting, parameterized queries, library sanitizers)
3. **Verify exploitability:** Can an attacker actually control the input from an external interface?
4. **Document flow:** Source → [Propagators] → Sink, noting each transformation

**Only report if the flow is unbroken and exploitable.** False positive elimination is critical.

### Step 4: Hardcoded Secrets
Cross-reference Phase 0 scan_secrets.py results with manual inspection:
- Verify high-confidence findings are real secrets (not placeholders/examples)
- Check if secrets are rotatable
- Assess blast radius (what access does the secret grant?)

---

## Phase 4: Dependencies, Secrets & Configuration

**Goal:** Check dependency vulnerabilities, deep secrets scan, and security configuration.

### Dependencies
- Review Phase 0 `deps_scan.json` results
- Run framework-specific audit: `npm audit`, `pip audit`, `bundle audit`
- Check for known vulnerable package versions
- Flag packages with known CVEs, especially with high CVSS

### Configuration Security

1. **Security headers:** Search for header configuration
   - `Strict-Transport-Security` (HSTS)
   - `Content-Security-Policy` (CSP)
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options` or CSP `frame-ancestors`
   - `Referrer-Policy`
   - Are headers set in code, middleware, or reverse proxy config?

2. **CORS:**
   - `Access-Control-Allow-Origin` — wildcard `*` with credentials?
   - Origin reflection without validation?
   - Overly permissive allowed methods/headers?

3. **PostMessage security (high-value target per writeups):**
   - `addEventListener("message"` — verify `event.origin` checked against hardcoded allowlist
   - `event.origin` used to construct URLs, load scripts, or build API requests = critical if not validated
   - `postMessage(data, '*')` with tokens/codes in payload = always a bug
   - `innerHTML`/`document.write` inside message handlers = DOM XSS even with origin check
   - Message data used to construct server-side requests = parameter injection

4. **OAuth/redirect security:**
   - `redirect_uri` validation: must check full URL (scheme + host + path), not just hostname
   - `startsWith` checks on redirect URIs vulnerable to path traversal (`../`)
   - Redirect targets from cookies/storage: `res.redirect(req.cookies.redirect_url)` = open redirect
   - `response_type=token` with redirect chains preserving fragment through HTTP redirects
   - Login/logout endpoints without CSRF protection = login CSRF chain enabler

5. **Infrastructure configs (if present):**
   - `Dockerfile` — running as root? multi-stage build? secrets in build args?
   - `docker-compose.yml` — exposed ports? hardcoded passwords?
   - `.github/workflows/*.yml` — secrets in env? untrusted input in `run:`? (action injection)
   - `terraform/`, `k8s/` — overly permissive IAM, public buckets, exposed services?

6. **Environment files:**
   - `.env*` files committed? Check `.gitignore`
   - Secrets in plaintext in config files?

7. **Error handling:**
   - Stack traces in production responses?
   - Database errors exposed to clients?
   - Debug mode enabled in production configs?

### Business Logic (reference `references/business-logic-checklist.md`)
- Authentication flows (registration, password reset, MFA)
- Authorization patterns (role checks, ownership verification)
- Payment/transaction logic (price manipulation, race conditions)
- Rate limiting on sensitive operations

---

## Phase 5: Report Generation

**Output:** Write `.security-audit/scan_report.md`

**Reference:** `references/report-templates.md` for format options (Markdown is default).
**Reference:** `references/cwe-mapping.md` for accurate CWE classification and CVSS scoring.

### Report Template (Canonical)

```markdown
# Brain Dump

## Project Overview
- **Tech Stack:** [languages, frameworks, databases]
- **Architecture:** [monolith / microservices / serverless]
- **Entry Points:** [count of routes/endpoints mapped]
- **Auth Mechanism:** [JWT / sessions / OAuth / API keys / none]

## Attack Surface Summary
- **Unprotected endpoints:** [count and list]
- **Dangerous sinks found:** [count by category]
- **External integrations:** [databases, cloud services, third-party APIs]
- **Dependency vulnerabilities:** [count by severity from Phase 4]

## STRIDE Threat Coverage
- **Spoofing:** [hypotheses tested, results]
- **Tampering:** [hypotheses tested, results]
- **Repudiation:** [hypotheses tested, results]
- **Information Disclosure:** [hypotheses tested, results]
- **Denial of Service:** [hypotheses tested, results]
- **Elevation of Privilege:** [hypotheses tested, results]

## Analysis Log
- [Key decisions and reasoning during analysis]
- [Code paths investigated, patterns discovered]

## Dead Ends & False Positive Elimination
- [Sinks found but properly sanitized — with explanation]
- [Patterns searched but not present]
- [Findings investigated and discarded — specific reason]

---

# Security Audit Report: [Project Name]
Date: [timestamp]

## Executive Summary
- **Tech Stack:** [Languages/Frameworks]
- **Total Vulnerabilities:** X (Critical: X | High: X | Medium: X | Low: X)
- **Key Risks:** [1-2 sentences on most critical issues]

---

## [VULN-001] Title

**Severity:** Critical | High | Medium | Low
**CWE:** CWE-XXX — [Title]
**CVSS 3.1:** X.X (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)

**Description & Impact:**
[What the vulnerability is and what an attacker achieves]

**Evidence & Taint Analysis:**
**Source:** `path/to/file.ext:line` — [where user input enters]
```[language]
// Source code snippet
```

**Sink:** `path/to/file.ext:line` — [where input reaches dangerous function]
```[language]
// Sink code snippet
```

**Flow:** Source → [propagators] → Sink

**Proof of Concept:**
```[http/bash/code]
// Step-by-step exploit
```

**Remediation:**
```[language]
// Specific secure code example
```
```

## Directory Exclusions
When searching, exclude: `.git/`, `node_modules/`, `venv/`, `.venv/`, `__pycache__/`, `target/`, `vendor/`, `dist/`, `build/`, `coverage/`, `.next/`, `.cache/`
