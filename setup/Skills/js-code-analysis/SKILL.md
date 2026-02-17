---
name: js-code-analysis
description: Specialized JavaScript code analysis for bug bounty hunting
---

# JavaScript Code Analysis Skill

Specialized analysis for JavaScript/TypeScript applications, focusing on common bug bounty targets like Express.js and Next.js.

## Workflow Overview

1. **Project Identification:** Determine if the project is Express.js, Next.js, or another JS framework.
2. **Entry Point Mapping:** Identify routes, API endpoints, and server-side functions.
3. **Data Flow Analysis:** Trace user input from entry points to dangerous sinks.
4. **Vulnerability Detection:** Search for framework-specific security flaws.
5. **Reporting:** Document findings with PoCs and remediation steps.

## Fallback Instruction

If the code is not Express.js or Next.js, proceed with a generic analysis using the `analyze.js` script with the `--category all` flag. Do not invoke external agents or AI-context tools unless explicitly requested. Use standard tools like `grep` and `ast-grep` for manual verification if needed.

## Framework Specifics

### Express.js
- Route handlers (`app.get`, `app.post`, etc.)
- Middleware usage
- Template engines (EJS, Pug, etc.)

### Next.js
- API Routes (`pages/api` or `app/api`)
- Server Components vs Client Components
- `getServerSideProps`, `getStaticProps`

## Vulnerability Patterns

- **Injection:** SQLi, NoSQLi, Command Injection
- **Broken Access Control:** IDOR, Middleware bypass
- **Cross-Site Scripting (XSS):** Server-side rendering flaws
- **Server-Side Request Forgery (SSRF):** `fetch`, `axios` calls with user input
- **Prototype Pollution:** Unsafe object merging/assignment

## Usage Instructions

### 1. Run Analysis
To scan a target directory for vulnerabilities:
```bash
node setup/Skills/js-code-analysis/scripts/analyze.js --target <path_to_code> --category all --format markdown
```

### 2. Validate Patterns
To ensure analysis patterns are working correctly against test fixtures:
```bash
node setup/Skills/js-code-analysis/scripts/pattern_validator.js --patterns-dir setup/Skills/js-code-analysis/references/patterns --fixtures-dir setup/Skills/js-code-analysis/tests/fixtures
```

### 3. Safety Check
Before running any analysis, ensure the environment is safe:
```bash
node setup/Skills/js-code-analysis/scripts/check_safety.js
```

## Directory Structure

- `scripts/`: Automation scripts for analysis
- `references/`: Documentation and checklists
- `references/patterns/`: Known vulnerable code patterns
- `tests/`: Unit tests for analysis scripts
- `tests/fixtures/`: Sample vulnerable code for testing
