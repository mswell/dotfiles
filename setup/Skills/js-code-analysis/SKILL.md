---
name: js-code-analysis
description: Specialized JavaScript/TypeScript static analysis for bug bounty hunting. Focuses on Node.js, Express.js, and Next.js. Uses AST-grep and ripgrep to find high-impact vulnerabilities (RCE, SSRF, SQLi, SSTI, Prototype Pollution, JWT flaws, Frontend-to-Backend interactions, Deserialization) by enforcing strict Source-to-Sink Taint Analysis. Every finding MUST have concrete evidence.
---

# JavaScript / TypeScript Bug Bounty Analysis Skill

Advanced static analysis of JS/TS codebases for high-severity vulnerabilities.
**Rule #1: NO HALLUCINATION. Every finding MUST be backed by concrete code evidence (file path + line + snippet) and a clear, reproducible exploit path.**
**Rule #2: Taint Analysis is MANDATORY. You must prove how user-controlled input (Source) reaches the dangerous function (Sink) without proper sanitization.**
**Rule #3: Maximize AST-grep (`sg`) and Ripgrep (`rg`) for context-aware code searching.**
**Rule #4: STRICT BRAIN DUMP MANDATE. Before listing any vulnerability, you MUST output a detailed "Brain Dump" documenting your logical thinking process, what you searched for and failed to find, and technical explanations for discarding false positives.**

## Workflow Overview

Execute phases sequentially. Focus deeply on files modified recently or core business logic.

```
Phase 1: Recon & Routing      → Map Express routes, Next.js API endpoints, Server Actions.
Phase 2: Client-to-Server Mapping (Frontend Recon) → Find SSRF vectors, state encoding, custom headers in frontend.
Phase 3: Auth & Session       → JWT flaws, weak secrets, middleware bypass, IDOR.
Phase 4: Dangerous Sinks      → RCE, SSRF, Deserialization, SSTI, Path Traversal.
Phase 5: Injection Flaws      → SQLi, NoSQLi, Command Injection, XSS (SSR flaws).
Phase 6: Logic & Objects      → Prototype Pollution, Mass Assignment, Race Conditions.
Phase 7: Taint & Report       → Source-to-Sink trace and PoC generation.
```

---

## Phase 1: Recon & Routing (Attack Surface Mapping)

**Goal:** Identify where user input enters the application (The "Sources").

**Search commands:**
```bash
# Express.js Routes
rg -n "app\.(get|post|put|delete|patch|all)\(" 
rg -n "router\.(get|post|put|delete|patch|all)\("

# Next.js API Routes (Pages & App Router) & Server Actions
rg -n "export async function (GET|POST|PUT|DELETE|PATCH)"
rg -n "export default function handler"
rg -n '"use server"'

# Identify all user input sources (Req bodies, queries, params, headers)
rg -n "req\.(body|query|params|headers|cookies)"
```

**For each critical route, document:**
- Endpoint path and HTTP method.
- Expected user inputs (JSON body, query params).
- Is it protected by an Auth middleware? (If not, high priority).

---

## Phase 2: Client-to-Server Surface Mapping (Frontend Recon)

**Goal:** Act as an infrastructure and logic flaw hunter. Analyze how the Frontend interacts with the Backend to discover hidden attack surfaces (SSRF, Deserialization, Infrastructure Injection). Ignore standard UI libraries, focus on business logic and HTTP requests.

**Search commands:**
```bash
# 1. SSRF Vectors (Frontend passing URLs/Paths to Backend)
rg -n "fetch\(.*(?:url|target|path|endpoint|webhook|callback)\s*[:=]"
rg -n "axios\.(post|get|put)\(.*(?:url|target|path|webhook|callback)\s*[:=]"

# 2. Deserialization & State Manipulation (Complex objects encoded to headers/cookies)
rg -n "btoa\(JSON\.stringify\("
rg -n "Buffer\.from\(.*'base64'\)"
rg -n "localStorage\.setItem\(.*JSON\.stringify"

# 3. Infrastructure Leaks & Custom Headers
rg -n "axios\.interceptors\.request"
rg -n "headers:\s*\{.*X-.*:"
# Hidden or Admin API Routes
rg -n "['\`]/api/(?:v[0-9]+/)?(?:internal|admin|debug|test)/.*['\`]"
# Domain parameters (Open Redirect / Host Header)
rg -n "window\.location\.(origin|href)"
```

**Extract & Document:**
- **SSRF Vectors:** Endpoints where frontend passes URLs/domains as parameters to the backend.
- **State Encapsulation:** Any logic converting objects (`JSON.stringify`) into Base64 before sending to APIs (`/sync`, `/state`, headers, cookies).
- **Infrastructure/Headers:** Custom headers injected by the frontend (e.g., `X-Custom-Client`, `X-Forwarded-*`) and hidden/undocumented API paths.

---

## Phase 3: Auth & Session Flaws

**Goal:** Find JWT misconfigurations, hardcoded secrets, and broken access control.

**Search commands:**
```bash
# Hardcoded JWT Secrets & Weak Algorithms
rg -n "jwt\.sign\(.*,\s*['\"]" 
rg -n "jwt\.verify\(.*,\s*['\"]"
rg -n "algorithm:\s*['\"]none['\"]"

# Middleware Bypass / Missing Auth
rg -n "next\(\)" | grep -v "err" # Look for paths that call next() without checking roles
rg -n "req\.user" # See how user identity is trusted/populated

# OAuth / Secrets Leaks
rg -n "(client_secret|api_key|access_token)\s*[:=]\s*['\"][a-zA-Z0-9_-]{10,}['\"]"
```

**High-impact findings:**
- `jwt.verify` without checking the algorithm (Algorithm confusion).
- Trusting `req.body.role` or `req.cookies.isAdmin` directly.
- IDOR: Fetching DB records using raw `req.params.id` without `WHERE user_id = req.user.id`.

---

## Phase 4: Dangerous Sinks (RCE, SSRF, SSTI)

**Goal:** Find functions that execute code, make network requests, or read arbitrary files.

**Search commands (Using AST-grep `sg` and `rg`):**

```bash
# 1. Server-Side Request Forgery (SSRF)
ast-grep --pattern 'fetch($URL, $$)' --lang typescript
ast-grep --pattern 'axios($URL, $$)' --lang typescript
ast-grep --pattern 'axios.get($URL, $$)' --lang typescript
rg -n "http\.(get|request)\("

# 2. Remote Code Execution (RCE) / Command Injection
ast-grep --pattern 'exec($CMD, $$)' --lang typescript
ast-grep --pattern 'execSync($CMD, $$)' --lang typescript
ast-grep --pattern 'spawn($CMD, $$)' --lang typescript
rg -n "require\('child_process'\)"

# 3. Unsafe Deserialization
rg -n "unserialize\("
rg -n "yaml\.load\(" # Look for js-yaml unsafe load
rg -n "require\('node-serialize'\)"

# 4. Server-Side Template Injection (SSTI)
rg -n "res\.render\(.*,\s*req\.(body|query|params)"
rg -n "ejs\.render\("
rg -n "pug\.compile\("

# 5. Path Traversal / LFI
ast-grep --pattern 'fs.readFile($PATH, $$)' --lang typescript
ast-grep --pattern 'fs.readFileSync($PATH, $$)' --lang typescript
ast-grep --pattern 'path.join($PATH)' --lang typescript
rg -n "res\.sendFile\("
```

**Critical Pattern:** If `$URL` or `$CMD` or `$PATH` contains string interpolation (`` `${req.query.url}` ``) or concatenations from user input WITHOUT validation, it's a Critical finding.

---

## Phase 5: Injection Flaws (SQLi & NoSQLi)

**Goal:** Find database queries constructed with unsanitized input.

**Search commands:**
```bash
# Raw SQL Injection (pg, mysql, typeorm raw)
rg -n "query\(\s*[\`\"'].*\$.*[\`\"']" # Template literals in queries
ast-grep --pattern '$DB.query($SQL, $$)' --lang typescript

# NoSQL Injection (MongoDB / Mongoose)
rg -n "\.(find|findOne|update|deleteOne)\(\s*req\.(query|body)"
# Look for missing $eq sanitization allowing {"$ne": null} bypasses
```

---

## Phase 6: Logic Flaws & Objects

**Goal:** Prototype Pollution, Mass Assignment, and Race Conditions.

**Search commands:**
```bash
# Prototype Pollution (Unsafe Merge/Clone)
rg -n "\.merge\("
rg -n "Object\.assign\(.*,\s*req\.body\)"
rg -n "lodash\.merge"

# Mass Assignment
# Look for ORM create/update directly taking req.body
ast-grep --pattern '$MODEL.create(req.body)' --lang typescript
ast-grep --pattern '$MODEL.update(req.body, $$)' --lang typescript

# Race Conditions (Missing Await)
rg -n "async function" | grep -v "await" # Heuristic for detached promises
```

---

## Phase 7: Taint Analysis & Report Generation

**MANDATORY Taint Analysis Process:**
For every sink identified in Phases 3-6, you MUST trace the data backward to the source (Phase 1/2).
1. **Source:** `const targetUrl = req.query.url;`
2. **Propagator:** `const sanitizedUrl = customFormat(targetUrl);` (Check if `customFormat` actually sanitizes or just formats).
3. **Sink:** `fetch(sanitizedUrl);`
4. **Verdict:** If the flow is unbroken by strict validation (regex, allowlists, type casting), it is a vulnerability.

**Report template (`.js-audit/report.md`):**

```markdown
### 🧠 Brain Dump (Processo Cognitivo e Descartes)
> **[MANDATORY]** Document your logical thinking process here BEFORE listing vulnerabilities.
> - What did you search for? 
> - What did you fail to find? 
> - Highlight code snippets that looked suspicious at first (false positives) but were discarded after deeper analysis, explaining *why* (e.g., "Found a 'url' parameter, but it undergoes strict regex sanitization before fetch").

# JS/TS Bug Bounty Report: [Project Name]

## Executive Summary
- Findings: [N] total | Critical: X | High: X | Medium: X

---

## [VULN-001] [Vulnerability Type] — [SEVERITY]

**CWE:** CWE-XXX
**CVSS:** X.X (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
**Impact:** [Concrete impact - e.g., "Allows an unauthenticated attacker to read arbitrary internal AWS metadata via SSRF."]

### Evidence & Taint Analysis
File: `src/controllers/api.ts:42`

**Source:** User input enters via `req.query.url`.
```typescript
40: export const proxyRequest = async (req, res) => {
41:   const userUrl = req.query.url; // <-- SOURCE
```

**Sink:** The input is passed directly to `axios.get` without validation.
```typescript
42:   const response = await axios.get(userUrl); // <-- SINK
```

### Exploit Payload (PoC)
```http
GET /api/proxy?url=http://169.254.169.254/latest/meta-data/ HTTP/1.1
Host: target.com
```

### Remediation
[Provide specific code fix using an allowlist or strict URL parsing]
```
