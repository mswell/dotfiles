---
name: security-audit
description: Comprehensive security code audit using multi-phase analysis (Assessment → STRIDE Threat Modeling → Code Review → Report). Use when asked to perform security review, vulnerability assessment, code audit, pentest code review, find security bugs, or analyze code for vulnerabilities. Optimized for bug bounty hunting with concrete evidence and exploitability validation.
---

# Security Audit Skill

Multi-phase security analysis inspired by professional security team workflows. Produces actionable findings with concrete evidence, not generic warnings.

## Workflow Overview

Execute phases sequentially. Each phase produces artifacts consumed by the next:

```
Phase 1: Assessment     → .security-audit/SECURITY.md
Phase 2: Threat Model   → .security-audit/THREAT_MODEL.json
Phase 3: Code Review    → .security-audit/VULNERABILITIES.json
Phase 4: Report         → .security-audit/scan_report.md + scan_results.json
```

## Quick Start

1. Create output directory: `mkdir -p .security-audit`
2. Run `scripts/detect_project.py` to identify stack
3. Execute Phase 1-4 sequentially
4. Run auxiliary scripts as needed (secrets, dependencies)

## Phase 1: Assessment

**Goal:** Map architecture, data flows, entry points, and security controls.

**Process:**
1. Identify project type, languages, frameworks
2. Map authentication/authorization mechanisms
3. Document data flows and sensitive data paths
4. List all entry points (APIs, forms, CLI, websockets)
5. Note existing security controls

**Output:** Write `SECURITY.md` following this structure:

```markdown
# Security Assessment: [Project Name]
Generated: [timestamp]

## Tech Stack
- Language: [detected]
- Framework: [detected]
- Database: [detected]
- Auth: [mechanism]

## Architecture Overview
[Brief description of application structure]

## Data Flows
[Numbered list of critical data flows]

## Entry Points
| Endpoint | Method | Auth | Input Validation | Notes |
|----------|--------|------|------------------|-------|

## Authentication Mechanism
[Details on auth implementation, token handling, session management]

## Authorization Model
[RBAC, ABAC, or custom. Permission checks location]

## Sensitive Data Paths
| Data Type | Location | Protection |
|-----------|----------|------------|

## External Dependencies
[APIs, services, third-party integrations]

## Existing Security Controls
[Rate limiting, CSRF, CORS, input validation, etc.]

## Initial Observations
[Quick notes on potential areas of concern]
```

**Key searches to perform:**
- Auth: `grep -rn "auth\|login\|session\|jwt\|token\|password" --include="*.{js,ts,py,go,java,php,rb}"`
- Secrets: `grep -rn "API_KEY\|SECRET\|PASSWORD\|PRIVATE" --include="*.{js,ts,py,go,env,yaml,yml,json}"`
- Input: `grep -rn "req\.\|request\.\|params\|body\|query" --include="*.{js,ts,py,go,java,php,rb}"`
- Database: `grep -rn "SELECT\|INSERT\|UPDATE\|DELETE\|query\|execute" --include="*.{js,ts,py,go,java,php,rb}"`

## Phase 2: Threat Modeling (STRIDE)

**Goal:** Systematically identify threats using STRIDE methodology.

**Read:** `references/stride-methodology.md` for detailed STRIDE guidance.

**Process:**
1. Read SECURITY.md from Phase 1
2. For each component/flow, analyze through STRIDE lens:
   - **S**poofing: Can identity be faked?
   - **T**ampering: Can data be modified?
   - **R**epudiation: Can actions be denied?
   - **I**nformation Disclosure: Can data leak?
   - **D**enial of Service: Can availability be impacted?
   - **E**levation of Privilege: Can permissions be bypassed?
3. Prioritize by exploitability and impact

**Output:** Write `THREAT_MODEL.json`:

```json
{
  "project": "[name]",
  "generated": "[timestamp]",
  "threats": [
    {
      "id": "T-001",
      "title": "Descriptive threat title",
      "stride_category": "Spoofing|Tampering|Repudiation|InfoDisclosure|DoS|EoP",
      "severity": "critical|high|medium|low",
      "affected_components": ["file.js", "/api/endpoint"],
      "attack_scenario": "Step-by-step attack description",
      "preconditions": "What attacker needs",
      "cwe_id": "CWE-XXX",
      "cvss_estimate": 7.5,
      "bounty_relevance": "high|medium|low",
      "validation_hints": ["What to look for in code review"]
    }
  ]
}
```

**Prioritize these high-value targets:**
- Authentication bypass
- IDOR (Insecure Direct Object Reference)
- Privilege escalation
- SSRF (Server-Side Request Forgery)
- SQL/NoSQL injection
- Deserialization flaws
- Business logic bypasses

## Phase 3: Code Review

**Goal:** Validate threats from Phase 2 with concrete code evidence.

**Read:** `references/vulnerability-patterns.md` for language-specific patterns.

**Process:**
1. Read THREAT_MODEL.json
2. For each threat, search codebase for vulnerable patterns
3. **CRITICAL:** Only report if you find concrete evidence
4. Document exact file, line number, and vulnerable code
5. Assess exploitability (confirmed/likely/possible)

**Output:** Write `VULNERABILITIES.json`:

```json
{
  "project": "[name]",
  "generated": "[timestamp]",
  "scan_stats": {
    "files_analyzed": 0,
    "threats_validated": 0,
    "vulnerabilities_found": 0
  },
  "vulnerabilities": [
    {
      "id": "VULN-001",
      "threat_ref": "T-001",
      "title": "Specific vulnerability title",
      "severity": "critical|high|medium|low",
      "file_path": "src/auth/login.js",
      "line_number": 67,
      "code_snippet": "Exact vulnerable code",
      "evidence": "Detailed explanation of why this is vulnerable",
      "attack_vector": "How to exploit",
      "cwe_id": "CWE-XXX",
      "cvss_score": 8.5,
      "exploitability": "confirmed|likely|possible",
      "recommendation": "Specific fix with code example",
      "references": ["https://..."]
    }
  ]
}
```

**Evidence requirements:**
- Exact file path and line number
- Actual code snippet (not pseudocode)
- Clear explanation of vulnerability
- Exploitation steps
- Remediation with code example

## Phase 4: Report Generation

**Goal:** Compile findings into actionable report.

**Process:**
1. Read VULNERABILITIES.json
2. Generate executive summary
3. Create detailed findings report
4. Calculate statistics

**Output:** Write both `scan_report.md` and `scan_results.json`

**Report structure:**
```markdown
# Security Audit Report: [Project Name]
Date: [timestamp]

## Executive Summary
- Total vulnerabilities: X
- Critical: X | High: X | Medium: X | Low: X
- Key findings: [top 3 issues]

## Severity Distribution
[Visual or table breakdown]

## Detailed Findings

### VULN-001: [Title]
**Severity:** Critical
**CWE:** CWE-XXX
**File:** `path/to/file.js:67`

**Description:**
[Detailed explanation]

**Vulnerable Code:**
```[language]
[code snippet]
```

**Proof of Concept:**
[Steps to reproduce]

**Recommendation:**
[Fix with code example]

---
[Repeat for each vulnerability]

## Recommendations Summary
[Prioritized action items]

## Appendix
- Files analyzed: X
- Scan duration: X
- Tools used: [list]
```

## Auxiliary Scripts

### detect_project.py
Run first to identify project stack:
```bash
python3 scripts/detect_project.py /path/to/project
```
Returns detected languages, frameworks, and recommended exclusions.

### scan_secrets.py
Scan for hardcoded secrets with entropy analysis:
```bash
python3 scripts/scan_secrets.py /path/to/project
```
Detects AWS keys, API tokens, private keys, high-entropy strings.

### analyze_dependencies.py
Check for vulnerable dependencies:
```bash
python3 scripts/analyze_dependencies.py /path/to/project
```
Analyzes package.json, requirements.txt, go.mod, etc.

## Key References

Load these as needed during analysis:

| Reference | When to use |
|-----------|-------------|
| `references/stride-methodology.md` | Phase 2 - threat modeling |
| `references/vulnerability-patterns.md` | Phase 3 - code patterns by language |
| `references/cwe-mapping.md` | All phases - CWE lookups |
| `references/secrets-patterns.md` | Secrets detection |
| `references/api-security-checklist.md` | API-heavy applications |
| `references/business-logic-checklist.md` | E-commerce, fintech, auth flows |

## Directory Exclusions

Auto-exclude these directories:
- Universal: `.git/`, `.svn/`, `.hg/`, `node_modules/`, `vendor/`, `dist/`, `build/`
- Python: `venv/`, `env/`, `.venv/`, `__pycache__/`, `.tox/`, `*.egg-info/`
- JavaScript: `.npm/`, `.yarn/`, `.next/`, `.nuxt/`
- Go: `bin/`, `pkg/`
- Java: `target/`, `.gradle/`, `.m2/`
- Ruby: `.bundle/`, `tmp/`

## Quality Checklist

Before finalizing report:
- [ ] Every finding has exact file:line reference
- [ ] Every finding has actual code snippet
- [ ] Every finding explains WHY it's vulnerable
- [ ] Every finding has remediation with code example
- [ ] No generic/theoretical findings without evidence
- [ ] Severity ratings are justified
- [ ] CWE IDs are accurate
