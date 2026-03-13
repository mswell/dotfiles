# JavaScript/TypeScript CWE Quick Reference

Prioritized CWE list for JS/TS bug bounty static analysis.

## Critical / High

| CWE | Title | What to Look For | CVSS |
|---|---|---|---|
| CWE-78 | OS Command Injection | `exec()`, `spawn()`, `execSync()` with user input | 9.1–9.8 |
| CWE-94 | Code Injection | `eval()`, `Function()`, `vm.runInContext()` with user input | 8.1–9.8 |
| CWE-918 | SSRF | `fetch()`, `axios`, `got()`, `http.get()` with user-controlled URL | 7.5–9.8 |
| CWE-502 | Unsafe Deserialization | `unserialize()`, `yaml.load()`, `node-serialize` | 7.5–9.8 |
| CWE-89 | SQL Injection | Template literals/concatenation in `.query()`, `knex.raw()` | 7.5–9.8 |
| CWE-1321 | Prototype Pollution | `_.merge()`, `Object.assign()`, deep merge with user object | 7.5–9.8 |
| CWE-798 | Hardcoded Credentials | API keys, JWT secrets, DB passwords in source code | 7.5–9.8 |
| CWE-287 | Improper Authentication | JWT `algorithm: "none"`, missing `verify()`, decode-only | 7.5–9.1 |

## Medium

| CWE | Title | What to Look For | CVSS |
|---|---|---|---|
| CWE-79 | XSS (DOM + Reflected) | `innerHTML`, `dangerouslySetInnerHTML`, `document.write` with user input | 5.4–6.1 |
| CWE-943 | NoSQL Injection | MongoDB queries with `req.body` objects, missing `$eq` sanitization | 6.5–8.1 |
| CWE-22 | Path Traversal | `fs.readFile()` with user-controlled path containing `../` | 5.5–7.5 |
| CWE-352 | CSRF | State-changing endpoints without CSRF token, missing SameSite | 4.3–6.5 |
| CWE-639 | IDOR | DB lookups with `req.params.id` without ownership verification | 5.3–7.5 |
| CWE-915 | Mass Assignment | `Model.create(req.body)` without field whitelist | 5.3–7.5 |
| CWE-1333 | ReDoS | `new RegExp(userInput)`, nested quantifiers `(a+)+` | 5.3–7.5 |
| CWE-346 | Origin Validation | `postMessage` handler without `event.origin` check | 4.3–6.5 |
| CWE-942 | CORS Misconfiguration | `Access-Control-Allow-Origin: *` with `credentials: true` | 5.3–7.5 |
| CWE-601 | Open Redirect | `res.redirect(req.query.next)` without domain validation | 4.7–6.1 |

## Low

| CWE | Title | What to Look For | CVSS |
|---|---|---|---|
| CWE-200 | Information Exposure | Stack traces, verbose errors, internal paths in responses | 3.3–5.3 |
| CWE-532 | Sensitive Info in Logs | `console.log()` with tokens, passwords, PII | 3.3–4.3 |
| CWE-614 | Cookie without Secure | Session cookie missing `secure` flag | 3.1–4.3 |
| CWE-1004 | Cookie without HttpOnly | Session cookie without `httpOnly` flag | 3.1–4.3 |
| CWE-16 | Configuration | Debug mode in production, source maps exposed, verbose headers | 2.6–5.3 |

## Common JS/TS Attack Chains

### SSRF → Cloud Metadata → Infrastructure Takeover
```
CWE-918 (SSRF via fetch) → http://169.254.169.254/ → IAM credentials → Cloud takeover
```
CVSS: 9.8 — Full cloud infrastructure compromise.

### Prototype Pollution → RCE
```
CWE-1321 (_.merge with user input) → gadget in template engine → CWE-94 (code injection)
```
CVSS: 9.8 — Remote code execution via property injection.

### IDOR → Account Takeover
```
CWE-639 (IDOR on PUT /user/:id/email) → change email → password reset → ATO
```
CVSS: 8.1 — Full account takeover via chained IDOR.

### Open Redirect → OAuth Token Theft
```
CWE-601 (redirect in callback) → OAuth redirect_uri → token sent to attacker
```
CVSS: 7.5 — OAuth authorization code/token hijacking.

### DOM XSS → Session Hijacking
```
CWE-79 (location.hash → innerHTML) → document.cookie → session theft
```
CVSS: 6.1 — Session hijacking via client-side injection.

### NoSQL Injection → Auth Bypass
```
CWE-943 ({"password": {"$ne": ""}}) → login without valid password → ATO
```
CVSS: 8.1 — Authentication bypass via operator injection.

### postMessage → XSS
```
CWE-346 (no origin check) → attacker sends crafted message → CWE-79 (XSS in handler)
```
CVSS: 6.1 — Cross-origin XSS via postMessage abuse.

## CVSS 3.1 for JS/TS Bug Bounty

**Most JS/TS web vulnerabilities use:**
- **AV:N** (Network) — accessible via HTTP
- **UI:N** (no interaction) for server-side, **UI:R** (click required) for DOM XSS
- **PR:N** (no auth) for unauthenticated, **PR:L** for authenticated-only
- **S:C** (Changed) when impact crosses security boundary (e.g., SSRF reaching internal network)
