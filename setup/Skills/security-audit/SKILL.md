---
name: security-audit
description: Comprehensive security code audit using multi-phase analysis (Assessment → STRIDE Threat Modeling → Code Review → Report). Use when asked to perform security review, vulnerability assessment, code audit, pentest code review, find security bugs, or analyze code for vulnerabilities. Optimized for bug bounty hunting and AppSec with concrete evidence and exploitability validation.
---

# Security Audit & Code Review Skill

Multi-phase security analysis inspired by professional AppSec team workflows. Produces actionable findings with **concrete evidence** (Source-to-Sink), eliminating generic warnings and false positives.

**Rule #1: NO HALLUCINATION.** Every finding MUST be backed by exact file paths, line numbers, code snippets, and a clear, reproducible exploit path.
**Rule #2: Taint Analysis is MANDATORY.** You must prove how user-controlled input (Source) reaches the dangerous function (Sink) without proper sanitization. Theoretical issues without an attack vector MUST NOT be reported.
**Rule #3: Maximize AST-grep (`sg`) and Ripgrep (`rg`)** for context-aware code searching instead of simple `grep`.

## Workflow Overview

Execute phases sequentially. Use `.security-audit/audit_draft.md` as your dynamic notepad during Phases 1-3.

```
Phase 1: Architecture & Assessment → Map tech stack, entry points, auth, and data flows.
Phase 2: STRIDE Threat Modeling    → Identify threats based on the mapped architecture.
Phase 3: Deep Code Review          → Validate threats by hunting for Sinks and Sources.
Phase 4: Final Report Generation   → Produce the actionable `scan_report.md`.
```

---

## Phase 1: Architecture & Assessment

**Goal:** Understand the application context, tech stack, and attack surface.

**Process:**
1. **Detect Tech Stack:** Identify the language, framework, and package managers by analyzing root files (`package.json`, `requirements.txt`, `go.mod`, `pom.xml`, etc.).
2. **Map Entry Points:** Find all routes, API endpoints, controllers, or exported functions where user input enters the system.
3. **Map Authentication/Authorization:** Identify how users log in, how sessions/tokens (JWT, cookies) are managed, and how roles/permissions are checked.
4. **Identify External Dependencies & DBs:** Note how the app connects to databases or external services.

**Draft Output (`.security-audit/audit_draft.md`):**
Start your draft with a quick overview of the Tech Stack, Key Entry Points, Auth Mechanisms, and Initial Areas of Concern.

---

## Phase 2: STRIDE Threat Modeling

**Goal:** Systematically hypothesize potential vulnerabilities based on Phase 1 findings.

**Process:**
Analyze the mapped architecture through the STRIDE lens and document the most critical hypotheses in your `audit_draft.md`:
- **S**poofing: Can identity be faked? (e.g., JWT signing flaws, weak session IDs).
- **T**ampering: Can data/state be modified? (e.g., Mass Assignment, Insecure Direct Object Reference - IDOR).
- **R**epudiation: Can actions be denied? (e.g., Lack of audit logging for critical actions).
- **I**nformation Disclosure: Can data leak? (e.g., Verbose errors, hardcoded secrets, Path Traversal).
- **D**enial of Service: Can availability be impacted? (e.g., Unbounded regex, lack of rate limiting on expensive endpoints).
- **E**levation of Privilege: Can permissions be bypassed? (e.g., Missing role checks on admin routes, prototype pollution).

**Prioritize these high-value targets for Phase 3:**
1. Authentication/Authorization bypass (IDOR, Broken Access Control).
2. Remote Code Execution (RCE) / Command Injection.
3. Server-Side Request Forgery (SSRF).
4. SQL/NoSQL Injection.
5. Deserialization flaws & Prototype Pollution.
6. Hardcoded Secrets (Live API Keys, DB Passwords, JWT Secrets).

---

## Phase 3: Deep Code Review & Taint Analysis

**Goal:** Hunt for concrete code evidence to validate the threats hypothesized in Phase 2.

**Process (The Hunt):**
Use `rg` (ripgrep) and `ast-grep` to search for dangerous patterns specific to the detected tech stack.

1. **Hunt for Hardcoded Secrets:**
   ```bash
   rg -n -i "(api_key|secret|password|private_key|token|access_key)\s*[:=]\s*['\"][a-zA-Z0-9_\-]{10,}['\"]"
   # Look for specific formats (e.g., AWS AKIA, Stripe sk_live, JWT secrets)
   ```

2. **Hunt for Dangerous Sinks (Examples):**
   - **Command Injection:** Exec, spawn, system, popen.
   - **SSRF:** fetch, request, axios, urllib, curl.
   - **Path Traversal/LFI:** fs.readFile, open, file_get_contents.
   - **SQLi:** Raw query executions, string concatenation in SQL strings.
   - **Deserialization:** pickle.loads, yaml.load, unserialize.

3. **MANDATORY Taint Analysis:**
   If you find a dangerous Sink (e.g., `exec(cmd)`), you MUST trace the variable `cmd` back to its Source (e.g., an HTTP request parameter).
   - If the data flow is broken (e.g., the variable is strictly hardcoded), it is NOT a vulnerability.
   - If the data passes through strict validation (allowlists, type casting), it is NOT a vulnerability.
   - **Only document the finding in your draft if the path from user input to the dangerous sink is exploitable.**

Record the exact file path, line number, vulnerable code snippet, and the Source-to-Sink flow in your `audit_draft.md`.

---

## Phase 4: Final Report Generation

**Goal:** Compile the validated findings into a professional, actionable report.

**Process:**
Read your `.security-audit/audit_draft.md`. For every validated vulnerability, write the final report.

**Output:** Write `.security-audit/scan_report.md`

**Report Structure:**

```markdown
# Security Audit Report: [Project Name]
Date: [timestamp]

## Executive Summary
- **Tech Stack:** [Languages/Frameworks]
- **Total Vulnerabilities:** X (Critical: X | High: X | Medium: X | Low: X)
- **Key Risks:** [1-2 sentences summarizing the most critical issues]

---

## Detailed Findings

### [VULN-001] [Title of Vulnerability]
**Severity:** Critical | High | Medium | Low
**CWE:** CWE-XXX
**CVSS Estimate:** X.X

**Description & Impact:**
[Detailed explanation of the vulnerability and what an attacker can achieve (e.g., "Allows an unauthenticated attacker to execute arbitrary OS commands...")]

**Evidence & Taint Analysis:**
File: `path/to/file.ext:line_number`

**Source:** [Explain where user input enters]
**Sink:** [Explain where the input is executed dangerously]

```[language]
// [Exact code snippet showing the vulnerable flow]
```

**Proof of Concept (Exploit Scenario):**
[Step-by-step instructions, HTTP request, or conceptual script on how to trigger the vulnerability]

**Remediation:**
[Specific fix with a secure code example, e.g., using parameterized queries or strict allowlists]

---
[Repeat for each validated vulnerability]
```

## Directory Exclusions
When using `rg` or `ast-grep`, standard package directories are ignored by default. If using `find` or `grep`, ensure you exclude:
- `.git/`, `node_modules/`, `venv/`, `.venv/`, `__pycache__/`, `target/`, `vendor/`, `dist/`, `build/`

## Quality Checklist Before Finalizing
- [ ] Every finding has an exact `file:line` reference.
- [ ] Every finding proves Taint Analysis (Source-to-Sink).
- [ ] Every finding has a realistic exploit scenario (PoC).
- [ ] No generic/theoretical findings without code evidence.
- [ ] Remediation provides actionable, secure code examples.
