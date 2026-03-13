---
name: js-code-analysis
description: Specialized JavaScript/TypeScript static analysis for bug bounty hunting. Covers Node.js, Express.js, Next.js, NestJS, Fastify, and modern frameworks. Uses AST-grep and Grep tool to find high-impact vulnerabilities (RCE, SSRF, SQLi, SSTI, Prototype Pollution, JWT, DOM XSS, GraphQL, ReDoS, CORS, CSRF) via strict Source-to-Sink Taint Analysis. Every finding MUST have concrete evidence.
---

# JavaScript / TypeScript Bug Bounty Analysis Skill

Advanced static analysis of JS/TS codebases for high-severity vulnerabilities.

**Rule #1: NO HALLUCINATION.** Every finding MUST be backed by concrete code evidence (file path + line + snippet) and a clear, reproducible exploit path.
**Rule #2: Taint Analysis is MANDATORY.** Prove how user-controlled input (Source) reaches the dangerous function (Sink) without proper sanitization.
**Rule #3: BRAIN DUMP MANDATE.** Before listing vulnerabilities, document your reasoning, searches performed, dead ends, and false positive eliminations.
**Rule #4: Use Claude Code tools.** Prefer Grep tool over `rg` via Bash. Use Glob for file discovery. Reserve Bash for `ast-grep` (sg) and `npm audit` only.

## Tool Usage

Subagents MUST use Claude Code's dedicated tools:
- **Grep tool** for all text/pattern searches (NOT `rg` or `grep` via Bash)
- **Glob tool** for file discovery (NOT `find` or `ls` via Bash)
- **Read tool** for file reading (NOT `cat`/`head`/`tail` via Bash)
- **Bash tool** ONLY for: `ast-grep` (sg) commands, `node` scripts, `npm audit`

**Available scripts (invoke via Bash):**
- `scripts/analyze.js --target <path> --category <cat>` — ast-grep scanner by vulnerability category
- `scripts/check_safety.js --target <domain> --platform <name>` — Safe Harbor verification
- `scripts/pattern_validator.js --patterns-dir <dir> --fixtures-dir <dir>` — validate ast-grep patterns

## Directory Exclusions

ALL searches MUST exclude: `node_modules/`, `dist/`, `build/`, `.next/`, `.nuxt/`, `coverage/`, `.git/`, `vendor/`, `__pycache__/`, `.cache/`, `.turbo/`

Use Grep tool's `glob` parameter to filter (e.g., `glob: "!node_modules/**"`), or target specific source directories.

---

## Phase 0: Setup & Detection

**Goal:** Prepare workspace, detect framework, check for exposed files.

```bash
mkdir -p .js-audit
```

1. **Read `package.json`** — identify framework, dependencies, scripts
2. **Detect framework:**
   - Express (`express`), Next.js (`next`), NestJS (`@nestjs/core`), Fastify (`fastify`)
   - Hono, Koa, Nuxt, SvelteKit, Remix, Astro
3. **Check TypeScript:** presence of `tsconfig.json`
4. **Check monorepo:** `lerna.json`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`
5. **Exposed sensitive files (use Glob):**
   - `.env*`, `*.pem`, `*.key`, `firebase*.json`, `serviceAccount*.json`, `google-services.json`
   - Flag any NOT listed in `.gitignore`

---

## Subagent Orchestration

Delegate to 3 parallel subagents, then compile report.

```
Wave 1 (PARALLEL — launch all three in a single message):
  ├── js-security-expert agent  → Phases 1 + 2 + 3 (Recon + Frontend + Auth/Session)
  ├── api-security agent        → Phases 4 + 5 (Dangerous Sinks + Injection Flaws)
  └── webapp-security agent     → Phase 6 (Logic, DOM XSS, File Upload, Config)

Wave 2 (SEQUENTIAL — after Wave 1 completes):
  └── report-writer agent → Phase 7: Taint validation + compile .js-audit/report.md
```

**Steps:**
1. **Phase 0:** Run setup yourself (NOT delegated).
2. **Wave 1:** Launch three `Agent` calls in parallel. Provide each with:
   - Full phase instructions for their assigned phases
   - Codebase path and detected framework from Phase 0
   - `references/vulnerability-patterns.md` for pattern matching
   - `references/cwe-checklist.md` for CWE mapping
3. **Wave 2:** Launch `report-writer` with all findings + `references/escalation-guide.md` for chain identification.
4. Output `.js-audit/report.md` path.

---

## Workflow Overview

```
Phase 1: Recon & Routing       → Routes, endpoints, Server Actions, middleware chain
Phase 2: Frontend-to-Backend   → SSRF vectors, postMessage, WebSocket, CORS, state encoding
Phase 3: Auth & Session        → JWT, OAuth2, CSRF, cookies, session, IDOR, rate limiting
Phase 4: Dangerous Sinks       → RCE, SSRF, SSTI, Deserialization, Path Traversal
Phase 5: Injection Flaws       → SQLi, NoSQLi, GraphQL, ReDoS, SSR XSS
Phase 6: Logic & Client-side   → Prototype Pollution, Mass Assignment, DOM XSS, File Upload, Config
Phase 7: Taint & Report        → Source-to-Sink validation + report generation
```

---

## Phase 1: Recon & Routing (Attack Surface Mapping)

**Goal:** Identify where user input enters the application (Sources).

**Search patterns (use Grep tool, targeting source directories only):**

1. **Express.js:**
   - `app\.(get|post|put|delete|patch|all|use)\(`
   - `router\.(get|post|put|delete|patch|all|use)\(`

2. **Next.js (Pages Router + App Router + Server Actions):**
   - `export (async )?function (GET|POST|PUT|DELETE|PATCH)` (App Router)
   - `export default function handler` (Pages Router)
   - `"use server"` (Server Actions)
   - `getServerSideProps`, `getStaticProps`

3. **NestJS:**
   - `@(Get|Post|Put|Delete|Patch|All)\(` (route decorators)
   - `@Controller\(`, `@Injectable\(`

4. **Fastify:**
   - `fastify\.(get|post|put|delete|patch)\(`

5. **User input sources (ALL frameworks):**
   - `req\.(body|query|params|headers|cookies|files|file)`
   - `ctx\.(request|params|query|body)`
   - `@Body\(\)`, `@Query\(\)`, `@Param\(\)`, `@Headers\(\)` (NestJS decorators)

6. **Middleware chain (auth bypass vector):**
   - `app\.use\(`, `router\.use\(`
   - Map ORDER of middleware — auth applied AFTER route handler registration = bypass
   - Check for `next()` called without auth validation

**For each route, document:**
- Endpoint path, HTTP method, input sources
- Auth middleware applied? Rate limited?

---

## Phase 2: Client-to-Server Surface Mapping

**Goal:** Discover hidden attack surfaces from frontend-backend interaction.

**Search patterns:**

1. **SSRF vectors (frontend passing URLs to backend):**
   - `fetch\(` with variable URL arguments (not string literals)
   - `axios\.(get|post|put|request)\(` with variable arguments
   - Parameters named: `url`, `target`, `path`, `endpoint`, `webhook`, `callback`, `redirect`, `proxy`, `dest`

2. **postMessage vulnerabilities:**
   - `addEventListener\(["']message["']` — find handlers
   - Check: is `event.origin` validated? No check = any origin can send data
   - `postMessage\(` — what data is sent? to what origin?

3. **WebSocket:**
   - `new WebSocket\(`, `io\(`, `io\.connect\(`, `socket\.on\(`
   - Auth on WS connection? TLS (`wss://` not `ws://`)? Message validation?

4. **CORS misconfiguration:**
   - `Access-Control-Allow-Origin` — search for `*` or reflected origin
   - `cors\(` config — check `origin:` and `credentials:` combination
   - `res\.(header|setHeader)\(.*Access-Control`

5. **State encoding (deserialization vectors):**
   - `btoa\(JSON\.stringify\(`, `Buffer\.from\(.*base64`
   - `JSON\.parse\(atob\(`, `JSON\.parse\(Buffer\.from\(`

6. **Hidden/admin routes:**
   - `\/api\/(internal|admin|debug|test|_|health|metrics|graphql|graphiql)`
   - `window\.location\.(origin|href|hash)` — open redirect sources

---

## Phase 3: Auth & Session Flaws

**Goal:** Find authentication bypass, session management flaws, broken access control.

**Search patterns:**

1. **JWT issues:**
   - `jwt\.sign\(` — hardcoded secret? weak algorithm?
   - `jwt\.verify\(` — `algorithms` option set? (prevents algorithm confusion)
   - `jwt\.decode\(` — decode WITHOUT verify = no signature check (WARNING)
   - `algorithm.*none` — "none" algorithm attack

2. **OAuth2 misconfiguration:**
   - `redirect_uri`, `callback_url` — validated against allowlist?
   - `state` parameter — generated and checked? (CSRF in OAuth flow)
   - `client_secret` in frontend code = leaked secret
   - PKCE: `code_verifier`, `code_challenge` present for public clients?

3. **Session & cookies:**
   - Cookie config: check `httpOnly`, `secure`, `sameSite` flags
   - `express-session` config: hardcoded `secret`? `resave`? `saveUninitialized`?
   - Session regeneration after login? (`req.session.regenerate`)

4. **CSRF protection:**
   - `csrf`, `csurf`, `csrf-csrf` in dependencies?
   - `SameSite` cookie attribute?
   - State-changing endpoints (POST/PUT/DELETE) without CSRF token

5. **IDOR / Broken Access Control:**
   - DB queries using `req.params.id` without ownership check (`WHERE owner = req.user.id`)
   - `findById`, `findOne`, `findByPk` with user-controlled ID
   - Role checks: `req.user.role`, `req.body.role` — can role be tampered client-side?

6. **Rate limiting:**
   - `express-rate-limit`, `rate-limiter-flexible` in dependencies?
   - Auth endpoints (`/login`, `/register`, `/forgot-password`) without limiting = brute force

7. **Password reset:**
   - Token: cryptographically random? sufficient length? expiry set?
   - Can same token be reused after password change?

---

## Phase 4: Dangerous Sinks (RCE, SSRF, SSTI, Path Traversal)

**Goal:** Find functions that execute code, make requests, or access files.

**Use BOTH Grep tool AND ast-grep (sg via Bash):**

1. **RCE / Command Injection:**
   - Grep: `child_process`, `exec\(`, `execSync\(`, `spawn\(`, `spawnSync\(`
   - Grep: `eval\(`, `new Function\(`, `vm\.runIn`, `vm\.createScript`
   - sg: `exec($CMD)`, `exec(\`$CMD\`)`, `execSync($CMD)`, `spawn($CMD, $$)`
   - sg: `eval($CODE)`, `new Function($CODE)`
   - sg: `setTimeout($STR, $$)` — string argument (not function) = eval-like

2. **SSRF:**
   - Grep: `fetch\(`, `axios`, `got\(`, `request\(`, `http\.get\(`, `https\.request\(`, `undici`
   - sg: `fetch($URL)`, `fetch($URL, $$)`, `axios.get($URL)`, `axios($CFG)`
   - sg: `got($URL)`, `http.get($URL)`

3. **Deserialization:**
   - `unserialize\(`, `node-serialize`
   - `yaml\.load\(` (js-yaml without `safeLoad` / `SAFE_SCHEMA`)
   - `JSON\.parse\(` with user input flowing to prototype-sensitive operations

4. **SSTI:**
   - `res\.render\(.*req\.(body|query|params)` — user input in template context
   - `ejs\.render\(`, `pug\.compile\(`, `handlebars\.compile\(`, `nunjucks\.renderString\(`
   - Template string with user input in response: `` res.send(`...${req.query.x}...`) ``

5. **Path Traversal / LFI:**
   - `fs\.readFile`, `fs\.readFileSync`, `fs\.createReadStream` — check if path includes user input
   - `fs\.writeFile`, `fs\.writeFileSync` — arbitrary file write
   - `path\.join\(` or `path\.resolve\(` with user-controlled segments without `../` check
   - `res\.sendFile\(`, `res\.download\(`

**Critical:** If ANY sink receives user input via interpolation or concatenation WITHOUT validation → Critical finding.

---

## Phase 5: Injection Flaws

**Goal:** SQL/NoSQL injection, GraphQL abuse, ReDoS, SSR XSS.

1. **SQL Injection:**
   - Template literals in queries: `` query(`SELECT ... WHERE id = ${id}`) ``
   - String concat: `"SELECT * FROM " + table`
   - Grep: `\.query\(`, `\.raw\(`, `knex\.raw\(`, `sequelize\.query\(`, `prisma\.\$queryRaw`
   - sg: `$DB.query(\`$SQL\`)`, `knex.raw($SQL)`
   - **Exclude safe patterns:** parameterized queries (`$1`, `?`, `:name` placeholders)

2. **NoSQL Injection (MongoDB/Mongoose):**
   - `\.(find|findOne|updateOne|deleteOne)\(.*req\.(body|query)`
   - User objects in query enabling `{ $ne: null }`, `{ $regex: ".*" }` operators
   - Fix check: `mongo-sanitize`, `String()` casting, explicit `$eq`

3. **GraphQL:**
   - Introspection enabled: `introspection:\s*true` or not explicitly disabled
   - Missing depth/complexity limits: check for `graphql-depth-limit`, `graphql-query-complexity`
   - Batching: multiple ops in single request without limit
   - Resolver auth: auth checks in resolvers (not just middleware)?
   - Field suggestion leak: `Did you mean` in error responses

4. **ReDoS (Regex Denial of Service):**
   - `new RegExp\(` with user-controlled pattern = arbitrary ReDoS
   - Nested quantifiers in hardcoded regex: `(a+)+`, `(a|a)*`, `([a-z]+)*`
   - Grep: `\.match\(`, `\.replace\(`, `\.test\(` with dynamic regex argument

5. **SSR XSS:**
   - `dangerouslySetInnerHTML` with user-derived data
   - `res\.send\(.*req\.(body|query|params)` — unsanitized in response
   - Template engines rendering user input without escaping

---

## Phase 6: Logic Flaws, DOM XSS & Configuration

**Goal:** Prototype Pollution, Mass Assignment, DOM XSS, file upload, configuration.

1. **Prototype Pollution:**
   - `Object\.assign\(.*req\.body`, `\.merge\(`, `lodash\.merge`, `_.merge`, `_.defaultsDeep`
   - Deep merge/clone with user-controlled keys (`__proto__`, `constructor`, `prototype`)
   - sg: `Object.assign($T, req.body)`, `_.merge($T, $S)`

2. **Mass Assignment:**
   - ORM create/update with raw request body:
   - sg: `$M.create(req.body)`, `$M.update(req.body, $$)`
   - Sequelize without `fields` whitelist, Mongoose without strict schema
   - Prisma: `prisma.$M.create({ data: req.body })`

3. **DOM-based XSS (frontend):**
   - **Sources:** `location\.(search|hash|href)`, `document\.referrer`, `document\.URL`, `window\.name`
   - **Sinks:** `\.innerHTML`, `\.outerHTML`, `document\.write`, `eval\(`, `jQuery\.html\(`, `\$\(.*\)\.html\(`
   - `dangerouslySetInnerHTML` with user-derived data (React)
   - `v-html` (Vue), `[innerHTML]` (Angular) with dynamic binding

4. **File upload:**
   - `multer`, `formidable`, `busboy` — check:
     - File type validation (extension AND mime type)?
     - Filename sanitization (path traversal via `../`)?
     - File size limits set?
     - Storage destination (public accessible directory?)

5. **Environment & config exposure:**
   - `.env` files committed (check `.gitignore`)
   - `process\.env` values leaked to client-side bundle
   - Next.js: `NEXT_PUBLIC_` prefix exposes vars to client — audit what's prefixed
   - Debug mode in production: `NODE_ENV.*development`, `DEBUG=`
   - Source maps: `*.map` files in build output

6. **Race conditions:**
   - Check-then-act without transaction: read balance → check → update
   - Missing `await` on critical async operations
   - `Promise.all` on dependent operations that should be sequential

---

## Phase 7: Taint Analysis & Report Generation

**MANDATORY Taint Analysis for every finding:**
1. **Source:** Where user input enters (e.g., `req.query.url`)
2. **Propagator:** How it flows (assignments, function calls, transformations)
3. **Sanitizer check:** Validation present? (allowlist, type cast, library sanitizer)
4. **Sink:** Where it reaches a dangerous function (e.g., `fetch(url)`)
5. **Verdict:** Unbroken flow without strict validation = vulnerability

**References for report-writer agent:**
- `references/cwe-checklist.md` for CWE mapping and CVSS scoring
- `references/escalation-guide.md` for identifying attack chain escalations
- `references/h1-examples.md` for real-world precedent

**Output:** Write `.js-audit/report.md`

### Report Template

```markdown
# Brain Dump

## Project Overview
- **Framework:** [detected from Phase 0]
- **Language:** JS / TS
- **Entry points:** [count of routes/endpoints]
- **Auth mechanism:** [JWT / session / OAuth / none]
- **Key dependencies:** [security-relevant packages]

## Attack Surface Summary
- **Routes without auth:** [list]
- **Dangerous sinks found:** [count by type]
- **External integrations:** [APIs, databases, cloud services]

## Analysis Log
- [Key decisions, patterns investigated, reasoning]
- [Interesting code paths and potential attack chains]

## Dead Ends & False Positive Elimination
- [Sinks found but properly validated/sanitized — with explanation]
- [Patterns searched but not present in this codebase]
- [Findings investigated and discarded — specific reason]

---

# JS/TS Bug Bounty Report: [Project Name]

## Executive Summary
- **Findings:** N total | Critical: X | High: X | Medium: X | Low: X
- **Framework:** [detected]
- **Key Risks:** [1-2 sentences]

---

## [VULN-001] Title — SEVERITY

**CWE:** CWE-XXX — [Title]
**CVSS 3.1:** X.X (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
**Impact:** [Concrete impact]

### Evidence & Taint Analysis
**Source:** `src/routes/api.ts:15`
```typescript
const userUrl = req.query.url; // SOURCE
```

**Propagator:** (if intermediate processing exists)

**Sink:** `src/routes/api.ts:20`
```typescript
const response = await fetch(userUrl); // SINK — no validation
```

**Flow:** `req.query.url` → `userUrl` → `fetch(userUrl)` — unvalidated

### Exploit PoC
```http
GET /api/proxy?url=http://169.254.169.254/latest/meta-data/ HTTP/1.1
Host: target.com
```

### Remediation
```typescript
// Specific fix with secure code example
```
```
