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

Se o código não for Express.js ou Next.js, invoque um agente especialista em segurança web (subagent_type='oracle', load_skills=['security-audit']) para análise customizada.

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

## Directory Structure

- `scripts/`: Automation scripts for analysis
- `references/`: Documentation and checklists
- `references/patterns/`: Known vulnerable code patterns
- `tests/`: Unit tests for analysis scripts
- `tests/fixtures/`: Sample vulnerable code for testing
