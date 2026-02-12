# JavaScript Code Analysis Skill for Bug Bounty

## TL;DR

> **Quick Summary**: Criar uma skill completa de análise de código JavaScript para bug bounty, focada em vulnerabilidades de alto impacto com patterns validados, técnicas de escalação, e Safe Harbor compliance. Estrutura modular seguindo o padrão do security-audit existente.
> 
> **Deliverables**: 
> - `setup/Skills/js-code-analysis/SKILL.md` - Skill principal
> - `scripts/analyze.js`, `scripts/check_safety.js`, `scripts/pattern_validator.js` - Scripts auxiliares
> - `references/vulnerability-patterns.md`, `references/escalation-guide.md`, `references/h1-examples.md` - Documentação de referência
> - `references/patterns/*.yaml` - ast-grep patterns validados
> - `tests/fixtures/*.js` - Code snippets vulneráveis para validação
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves (estrutura, scripts, references)
> **Critical Path**: Task 1 (Estrutura) → Task 2-4 (Scripts) → Task 5-7 (References) → Task 8 (Integração)

---

## Context

### Original Request
Criar uma nova skill em `setup/Skills/` para análise de código JavaScript extraído de aplicações testadas em bug bounty. As vulnerabilidades devem ter impacto real de segurança com PoC funcional. Foco em escalação para aumentar criticidade. Considerar Safe Harbor para plataformas HackerOne, Bugcrowd, Intigriti e YesWeHack.

### Interview Summary
**Key Discussions**:
- **Estrutura**: Completa (SKILL.md + scripts + references) - similar ao security-audit
- **Automação**: Apenas análise manual (grep/ast-grep, sem SAST tools)
- **Frameworks**: Faseado - Express + Next.js primeiro (com fallback para agente especialista se outros frameworks)
- **PoC**: Exemplos de código apenas (sem scripts completos de exploit)

**Research Findings**:
- Top 10 JS vulnerabilities by H1 impact identificados (Prototype Pollution, IDOR, SSRF, Command Injection, NoSQL Injection, JWT Issues, PostMessage, Path Traversal, GraphQL, ReDoS)
- Técnicas de escalação documentadas (IDOR→ATO via token leak, XSS→RCE via React2Shell CVE-2025-66478, SSRF→Cloud metadata access)
- Safe Harbor guidelines para todas as plataformas

### Metis Review
**Identified Gaps** (addressed):
- **Framework Scope**: Faseado para não diluir qualidade - Express + Next.js first, com fallback para especialista
- **False Positive Fatigue**: Usar ast-grep estrutural, não grep simples
- **Safety/Legal**: Implementar Safe Harbor check obrigatório em todos os scripts
- **Pattern Validation**: Incluir test suite com code snippets vulneráveis

---

## Work Objectives

### Core Objective
Criar uma skill de análise de código JavaScript especializada em bug bounty, com patterns validados, técnicas de escalação, e compliance Safe Harbor para todas as plataformas principais.

### Concrete Deliverables
- `setup/Skills/js-code-analysis/SKILL.md` - Skill principal com workflow completo
- `setup/Skills/js-code-analysis/scripts/analyze.js` - Wrapper para ast-grep com filtering inteligente
- `setup/Skills/js-code-analysis/scripts/check_safety.js` - Safe Harbor verification
- `setup/Skills/js-code-analysis/scripts/pattern_validator.js` - Valida patterns contra test fixtures
- `setup/Skills/js-code-analysis/references/vulnerability-patterns.md` - Patterns por categoria (Prototype Pollution, IDOR, SSRF, etc.)
- `setup/Skills/js-code-analysis/references/escalation-guide.md` - Técnicas de escalação (IDOR→ATO, XSS→RCE, etc.)
- `setup/Skills/js-code-analysis/references/h1-examples.md` - Exemplos reais do HackerOne com IDs
- `setup/Skills/js-code-analysis/references/patterns/*.yaml` - ast-grep patterns em YAML
- `setup/Skills/js-code-analysis/tests/fixtures/*.js` - Vulnerable code snippets para validação

### Definition of Done
- [x] Skill invocável via `/js-code-analysis` ou detecção automática
- [x] Scripts executáveis e retornam help text
- [x] ast-grep patterns validados (sintaxe correta)
- [x] Safe Harbor warning presente em todas as saídas
- [x] Pelo menos 5 vulnerabilidades core com patterns completos

### Must Have
- Foco em Express.js e Next.js (maior incidência em bug bounty)
- Safe Harbor check obrigatório (verifica security.txt, programa ativo, etc.)
- ast-grep patterns estruturais (não apenas grep textual)
- Técnicas de escalação para cada vulnerabilidade
- Exemplos reais do HackerOne com H1 IDs

### Must NOT Have (Guardrails)
- Scripts de auto-exploit (apenas detecção e PoC manual)
- SELF-XSS ou vulnerabilidades sem impacto real
- Testes destrutivos em produção
- Coverage de todos os frameworks de uma vez (dilui qualidade)
- Ferramentas SAST complexas (Semgrep/CodeQL) - manter foco em análise manual assistida

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (nova skill)
- **Automated tests**: Tests-after (validar patterns após criação)
- **Framework**: Node.js built-in + custom validation script

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Scenario 1: Verify directory structure exists**
```
Tool: Bash
Preconditions: Working directory is dotfiles repo root
Steps:
  1. ls -la setup/Skills/js-code-analysis/
  2. Assert: SKILL.md, scripts/, references/, tests/ exist
  3. ls setup/Skills/js-code-analysis/scripts/
  4. Assert: analyze.js, check_safety.js, pattern_validator.js exist
Expected Result: Complete directory structure in place
Evidence: Directory listing output
```

**Scenario 2: Verify scripts are executable**
```
Tool: Bash
Preconditions: Node.js available
Steps:
  1. node setup/Skills/js-code-analysis/scripts/check_safety.js --help
  2. Assert: Output contains "Usage:" or "SAFE HARBOR"
  3. node setup/Skills/js-code-analysis/scripts/analyze.js --help
  4. Assert: Output contains "Usage:" or "analyze"
Expected Result: Scripts executable with help text
Evidence: Help output captured
```

**Scenario 3: Verify ast-grep patterns are valid**
```
Tool: Bash
Preconditions: ast-grep (sg) installed, patterns created
Steps:
  1. ls setup/Skills/js-code-analysis/references/patterns/*.yaml
  2. for f in setup/Skills/js-code-analysis/references/patterns/*.yaml; do sg -p $(cat $f) --json 2>&1 | head -1; done
  3. Assert: No "error" or "invalid pattern" in output
Expected Result: All patterns syntactically valid
Evidence: Pattern validation output
```

**Scenario 4: Verify Safe Harbor warning**
```
Tool: Bash
Preconditions: check_safety.js script exists
Steps:
  1. node setup/Skills/js-code-analysis/scripts/check_safety.js --dry-run
  2. Assert: Output contains "SAFE HARBOR" or "security.txt" or "authorization"
Expected Result: Safe Harbor check present in script
Evidence: Script output with warning
```

**Scenario 5: Validate patterns against vulnerable fixtures**
```
Tool: Bash
Preconditions: Pattern validator script and test fixtures exist
Steps:
  1. node setup/Skills/js-code-analysis/scripts/pattern_validator.js --test
  2. Assert: Output contains "PASS" or patterns matched
  3. Assert: No "FAIL" or false negatives
Expected Result: Patterns correctly detect vulnerable code
Evidence: Validator output with test results
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Create directory structure + SKILL.md skeleton
└── Task 5: Create vulnerability patterns reference

Wave 2 (After Wave 1):
├── Task 2: Create analyze.js script
├── Task 3: Create check_safety.js script
├── Task 4: Create pattern_validator.js script
├── Task 6: Create escalation guide reference
└── Task 7: Create H1 examples reference

Wave 3 (After Wave 2):
├── Task 8: Create ast-grep patterns (YAML files)
└── Task 9: Create test fixtures + integration

Critical Path: Task 1 → Task 2 → Task 8 → Task 9
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | All | 5 |
| 2 | 1 | 8, 9 | 3, 4, 6, 7 |
| 3 | 1 | None | 2, 4, 6, 7 |
| 4 | 1 | 9 | 2, 3, 6, 7 |
| 5 | None | 6, 7 | 1 |
| 6 | 5 | None | 2, 3, 4, 7 |
| 7 | 5 | None | 2, 3, 4, 6 |
| 8 | 1, 2 | 9 | None |
| 9 | 4, 8 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 5 | task(category="quick", load_skills=[], ...) - Create files |
| 2 | 2, 3, 4, 6, 7 | Parallel dispatch - Scripts + References |
| 3 | 8, 9 | task(category="quick", load_skills=[], ...) - Patterns + Tests |

---

## TODOs

- [x] 1. Create Directory Structure + SKILL.md Skeleton

  **What to do**:
  - Create `setup/Skills/js-code-analysis/` directory
  - Create subdirectories: `scripts/`, `references/`, `references/patterns/`, `tests/`, `tests/fixtures/`
  - Create `SKILL.md` with frontmatter and skeleton structure:
    - name: js-code-analysis
    - description: Specialized JavaScript code analysis for bug bounty hunting
    - Workflow Overview
    - Quick Start section
    - Phase structure placeholder
  - Include fallback instruction: "Se o código não for Express.js ou Next.js, invoque um agente especialista em segurança web (subagent_type='oracle', load_skills=['security-audit']) para análise customizada."

  **Must NOT do**:
  - Não criar conteúdo completo ainda (apenas skeleton)
  - Não criar outros arquivos ainda

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file/directory creation task
  - **Skills**: []
    - No special skills needed for directory creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 5)
  - **Blocks**: Tasks 2, 3, 4, 8
  - **Blocked By**: None

  **References**:
  - `setup/Skills/security-audit/SKILL.md:1-50` - Frontmatter and structure pattern to follow
  - `setup/Skills/AgentsSkillsBugBounty/HYBRID_GUIDE.md` - Reference for agent fallback instructions

  **Acceptance Criteria**:
  - [x] Directory structure: `ls -R setup/Skills/js-code-analysis` shows SKILL.md, scripts/, references/, tests/
  - [x] SKILL.md has valid frontmatter (name, description fields)
  - [x] SKILL.md contains workflow overview section
  - [x] Fallback instruction present for non-Express/Next.js code

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify directory structure created
    Tool: Bash
    Steps:
      1. ls -la setup/Skills/js-code-analysis/
      2. Assert: SKILL.md, scripts/, references/, tests/ in output
      3. ls setup/Skills/js-code-analysis/references/patterns/
      4. Assert: Directory exists (may be empty)
    Expected Result: Complete directory structure
    Evidence: Directory listing output
  ```

  **Commit**: YES (groups with 5)
  - Message: `feat(skills): add js-code-analysis skill structure`
  - Files: `setup/Skills/js-code-analysis/`

---

- [x] 2. Create analyze.js Script

  **What to do**:
  - Create `setup/Skills/js-code-analysis/scripts/analyze.js`
  - Implement ast-grep wrapper with intelligent filtering
  - Support pattern categories: prototype-pollution, idor, ssrf, command-injection, nosql-injection, jwt, postmessage, path-traversal, graphql, redos
  - Output format: JSON (for agent parsing) + Markdown summary
  - Include Safe Harbor warning at script start
  - CLI interface: `node analyze.js --target /path/to/code --category idor --format json`

  **Must NOT do**:
  - Não implementar auto-exploitation
  - Não usar ferramentas SAST externas (Semgrep/CodeQL)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Script creation with clear requirements
  - **Skills**: []
    - Standard Node.js scripting, no special skills

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:
  - `setup/Skills/security-audit/scripts/detect_project.py` - Python script pattern to follow
  - Research findings: ast-grep CLI syntax, pattern structure

  **Acceptance Criteria**:
  - [x] Script executable: `node scripts/analyze.js --help` shows usage
  - [x] Safe Harbor warning in output or help text
  - [x] Supports `--target`, `--category`, `--format` flags
  - [x] Returns JSON output when `--format json` specified

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Script executes with help
    Tool: Bash (node)
    Preconditions: Node.js available
    Steps:
      1. node setup/Skills/js-code-analysis/scripts/analyze.js --help
      2. Assert: Output contains "Usage:" or "--target"
    Expected Result: Help text displayed
    Evidence: Help output

  Scenario: Script runs Safe Harbor check
    Tool: Bash (node)
    Steps:
      1. node setup/Skills/js-code-analysis/scripts/analyze.js --dry-run
      2. Assert: Output contains "SAFE HARBOR" or "security.txt"
    Expected Result: Safe Harbor acknowledgment required
    Evidence: Warning output
  ```

  **Commit**: YES (groups with 3, 4)
  - Message: `feat(skills): add js analysis scripts`
  - Files: `setup/Skills/js-code-analysis/scripts/`

---

- [x] 3. Create check_safety.js Script

  **What to do**:
  - Create `setup/Skills/js-code-analysis/scripts/check_safety.js`
  - Implement Safe Harbor verification:
    - Check for security.txt
    - Verify bug bounty program is active on platform
    - Prompt for confirmation before proceeding
  - Platform support: HackerOne, Bugcrowd, Intigriti, YesWeHack
  - CLI interface: `node check_safety.js --target example.com --platform hackerone`
  - Exit codes: 0 = safe to proceed, 1 = warning, 2 = not authorized

  **Must NOT do**:
  - Não fazer requests automáticos sem confirmação
  - Não armazenar informações de programas

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple safety verification script
  - **Skills**: []
    - Standard scripting

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 6, 7)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - Safe Harbor guidelines from research
  - Platform policies (HackerOne, Bugcrowd, etc.)

  **Acceptance Criteria**:
  - [x] Script checks for security.txt: `node check_safety.js --target example.com`
  - [x] Returns exit code 0/1/2 based on safety status
  - [x] Supports --platform flag for specific platform checks

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Check safety with security.txt
    Tool: Bash (node)
    Steps:
      1. node setup/Skills/js-code-analysis/scripts/check_safety.js --target example.com --dry-run
      2. Assert: Output contains "security.txt" or "SAFE HARBOR"
    Expected Result: Safety check runs
    Evidence: Check output
  ```

  **Commit**: YES (groups with 2, 4)

---

- [x] 4. Create pattern_validator.js Script

  **What to do**:
  - Create `setup/Skills/js-code-analysis/scripts/pattern_validator.js`
  - Validate ast-grep patterns against test fixtures
  - Support test mode: `node pattern_validator.js --test`
  - Report: patterns matched, false positives, false negatives
  - CLI interface: `node pattern_validator.js --patterns-dir ./references/patterns --fixtures-dir ./tests/fixtures`

  **Must NOT do**:
  - Não criar patterns aqui (Task 8)
  - Não criar fixtures aqui (Task 9)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Testing/validation script
  - **Skills**: []
    - Standard scripting

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 6, 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 1

  **References**:
  - ast-grep documentation for pattern syntax

  **Acceptance Criteria**:
  - [x] Script validates pattern syntax: `node pattern_validator.js --validate`
  - [x] Supports test mode: `node pattern_validator.js --test`
  - [x] Reports pass/fail for each pattern

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Validate patterns syntax
    Tool: Bash (node)
    Preconditions: Pattern files exist (Task 8)
    Steps:
      1. node setup/Skills/js-code-analysis/scripts/pattern_validator.js --validate
      2. Assert: Output contains "valid" or no errors
    Expected Result: Patterns syntactically valid
    Evidence: Validation output
  ```

  **Commit**: YES (groups with 2, 3)

---

- [x] 5. Create vulnerability-patterns.md Reference

  **What to do**:
  - Create `setup/Skills/js-code-analysis/references/vulnerability-patterns.md`
  - Document patterns for top 5 high-impact vulnerabilities:
    1. **Prototype Pollution**: Object.assign, _.merge, recursive merge functions
    2. **IDOR/BOLA**: Database queries without ownership check, missing .where()
    3. **SSRF**: axios.get(userInput), fetch(userProvidedUrl)
    4. **Command Injection**: exec(`${cmd}`), spawn with shell: true
    5. **NoSQL Injection**: { $ne: null }, { $where: ... } in MongoDB
  - For each: code pattern (vulnerable vs secure), detection commands, impact assessment
  - Framework-specific sections: Express.js patterns, Next.js patterns

  **Must NOT do**:
  - Não incluir todos os 10 tipos (foco nos 5 principais)
  - Não criar PoC scripts completos

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Documentation/reference file creation
  - **Skills**: []
    - Standard markdown editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: None

  **References**:
  - `setup/Skills/security-audit/references/vulnerability-patterns.md` - Structure and style to follow
  - Research findings: H1 reports, CVE examples
  - Draft file: `.sisyphus/drafts/js-code-analysis-skill.md` - Research findings

  **Acceptance Criteria**:
  - [x] At least 5 vulnerability categories documented
  - [x] Each category has vulnerable code example
  - [x] Each category has secure code example
  - [x] Detection commands (grep/ast-grep) included

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify patterns document structure
    Tool: Bash
    Steps:
      1. cat setup/Skills/js-code-analysis/references/vulnerability-patterns.md | grep -E "## (Prototype Pollution|IDOR|SSRF|Command Injection|NoSQL)"
      2. Assert: At least 5 matches
      3. grep "VULNERABLE" setup/Skills/js-code-analysis/references/vulnerability-patterns.md
      4. Assert: At least 5 matches (one per category)
    Expected Result: Complete vulnerability documentation
    Evidence: Pattern count output
  ```

  **Commit**: YES (groups with 1)

---

- [x] 6. Create escalation-guide.md Reference

  **What to do**:
  - Create `setup/Skills/js-code-analysis/references/escalation-guide.md`
  - Document escalation chains:
    1. **IDOR → Account Takeover**: Extract email → trigger reset → IDOR token leak → reset password
    2. **XSS → RCE**: React2Shell (CVE-2025-66478), Electron with nodeIntegration
    3. **SSRF → Cloud Metadata**: AWS/Azure/GCP metadata endpoints
    4. **Prototype Pollution → RCE**: child_process gadgets, EJS outputFunctionName
    5. **Open Redirect → OAuth Hijacking**: Chain with OAuth callback
  - For each: step-by-step escalation, code examples, impact multiplier

  **Must NOT do**:
  - Não criar exploit scripts completos
  - Não incluir técnicas destrutivas

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Documentation creation
  - **Skills**: []
    - Standard markdown editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 4, 7)
  - **Blocks**: None
  - **Blocked By**: Task 5

  **References**:
  - Research findings from librarian agent
  - H1 reports with escalation examples
  - CVE details (React2Shell, Lodash PP)

  **Acceptance Criteria**:
  - [x] At least 5 escalation chains documented
  - [x] Each chain has step-by-step explanation
  - [x] Code examples or payloads included
  - [x] Impact assessment for each escalation

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify escalation guide completeness
    Tool: Bash
    Steps:
      1. grep -E "## (IDOR|XSS|SSRF|Prototype Pollution|Open Redirect)" setup/Skills/js-code-analysis/references/escalation-guide.md
      2. Assert: At least 5 matches
      3. grep "→" setup/Skills/js-code-analysis/references/escalation-guide.md
      4. Assert: Arrow notation used for escalation chains
    Expected Result: Escalation guide with chains
    Evidence: Grep output
  ```

  **Commit**: YES (groups with 7)

---

- [x] 7. Create h1-examples.md Reference

  **What to do**:
  - Create `setup/Skills/js-code-analysis/references/h1-examples.md`
  - Document real HackerOne examples with H1 IDs:
    - Prototype Pollution: #998398 (Elastic), #1130874 (Rocket.Chat)
    - IDOR: #152407, #311283
    - SSRF: #158219, #1276163
    - Command Injection: #141956, #341144
    - JWT Issues: #162351, #214393
    - PostMessage: #168116, #231053
    - GraphQL: #489146, #1499063
  - For each: vulnerability type, H1 ID link, brief description, bounty range (if public)

  **Must NOT do**:
  - Não incluir reports não-públicos
  - Não divulgar informações confidenciais

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Documentation creation
  - **Skills**: []
    - Standard markdown editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 4, 6)
  - **Blocks**: None
  - **Blocked By**: Task 5

  **References**:
  - Research findings with H1 IDs
  - HackerOne disclosed reports (public only)

  **Acceptance Criteria**:
  - [x] At least 10 H1 examples documented
  - [x] Each has H1 ID link (https://hackerone.com/reports/XXXXXX)
  - [x] Categorized by vulnerability type

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Verify H1 examples links
    Tool: Bash
    Steps:
      1. grep -o "https://hackerone.com/reports/[0-9]*" setup/Skills/js-code-analysis/references/h1-examples.md
      2. Assert: At least 10 unique links
    Expected Result: H1 report links present
    Evidence: Link count
  ```

  **Commit**: YES (groups with 6)

---

- [x] 8. Create ast-grep Patterns (YAML files)

  **What to do**:
  - Create pattern files in `setup/Skills/js-code-analysis/references/patterns/`:
    - `prototype-pollution.yaml` - Object.assign, _.merge patterns
    - `idor.yaml` - findById without ownership, missing .where()
    - `ssrf.yaml` - axios.get($URL), fetch($URL) patterns
    - `command-injection.yaml` - exec(`${VAR}`), spawn with shell
    - `nosql-injection.yaml` - { $ne, $where, $gt } patterns
  - Each pattern file: rule name, pattern, message, severity
  - Test patterns against fixtures before commit

  **Must NOT do**:
  - Não criar patterns genéricos demais (causa false positives)
  - Não pular validação de sintaxe

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pattern file creation
  - **Skills**: []
    - ast-grep pattern syntax knowledge

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Task 2)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 2

  **References**:
  - ast-grep documentation: pattern syntax
  - `setup/Skills/js-code-analysis/references/vulnerability-patterns.md` - Pattern inspiration

  **Acceptance Criteria**:
  - [x] At least 5 pattern YAML files created
  - [x] Each pattern has: id, pattern, message, severity
  - [x] Patterns pass syntax validation: `sg -p "pattern" --json`

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Validate pattern syntax
    Tool: Bash (ast-grep)
    Preconditions: ast-grep (sg) installed
    Steps:
      1. for f in setup/Skills/js-code-analysis/references/patterns/*.yaml; do echo "Testing $f"; sg -p "$(grep 'pattern:' $f | cut -d: -f2-)" --json 2>&1 | head -1; done
      2. Assert: No "error" or "invalid" in output
    Expected Result: All patterns valid
    Evidence: Validation output
  ```

  **Commit**: YES
  - Message: `feat(skills): add ast-grep vulnerability patterns`
  - Files: `setup/Skills/js-code-analysis/references/patterns/`

---

- [x] 9. Create Test Fixtures + Final Integration

  **What to do**:
  - Create vulnerable code fixtures in `setup/Skills/js-code-analysis/tests/fixtures/`:
    - `prototype-pollution-vuln.js` - Example vulnerable code
    - `idor-vuln.js` - Example IDOR in Express
    - `ssrf-vuln.js` - Example SSRF
    - `command-injection-vuln.js` - Example RCE
    - `nosql-injection-vuln.js` - Example NoSQL injection
  - Run pattern_validator.js against fixtures
  - Update SKILL.md with final workflow integration
  - Test end-to-end: analyze.js → patterns → report

  **Must NOT do**:
  - Não criar fixtures com código real de produção
  - Não pular validação final

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test file creation and integration
  - **Skills**: []
    - Standard testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Final (after all others)
  - **Blocks**: None
  - **Blocked By**: Tasks 4, 8

  **References**:
  - `setup/Skills/js-code-analysis/references/vulnerability-patterns.md` - Vulnerable code examples

  **Acceptance Criteria**:
  - [x] At least 5 fixture files with vulnerable code
  - [x] pattern_validator.js --test passes for all fixtures
  - [x] End-to-end test: analyze.js detects vulnerabilities in fixtures

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Validate patterns against fixtures
    Tool: Bash (node)
    Preconditions: Pattern validator and fixtures exist
    Steps:
      1. node setup/Skills/js-code-analysis/scripts/pattern_validator.js --test
      2. Assert: Output contains "PASS" or matched patterns
      3. Assert: No false negatives (known vulns detected)
    Expected Result: Patterns correctly detect vulnerable code
    Evidence: Validator output with results

  Scenario: End-to-end analysis test
    Tool: Bash (node)
    Steps:
      1. node setup/Skills/js-code-analysis/scripts/analyze.js --target setup/Skills/js-code-analysis/tests/fixtures --format json
      2. Assert: JSON output contains findings
      3. Assert: Findings match expected vulnerability types
    Expected Result: Analysis pipeline works end-to-end
    Evidence: Analysis output JSON
  ```

  **Commit**: YES
  - Message: `feat(skills): add test fixtures and finalize js-code-analysis skill`
  - Files: `setup/Skills/js-code-analysis/tests/`, `setup/Skills/js-code-analysis/SKILL.md`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1, 5 | `feat(skills): add js-code-analysis skill structure` | `setup/Skills/js-code-analysis/` | `ls -R` shows structure |
| 2, 3, 4 | `feat(skills): add js analysis scripts` | `setup/Skills/js-code-analysis/scripts/` | Scripts executable with --help |
| 6, 7 | `feat(skills): add js-code-analysis references` | `setup/Skills/js-code-analysis/references/` | References complete |
| 8 | `feat(skills): add ast-grep vulnerability patterns` | `setup/Skills/js-code-analysis/references/patterns/` | Patterns valid |
| 9 | `feat(skills): add test fixtures and finalize js-code-analysis skill` | `setup/Skills/js-code-analysis/` | E2E test passes |

---

## Success Criteria

### Verification Commands
```bash
# Verify directory structure
ls -R setup/Skills/js-code-analysis | grep -E "SKILL.md|scripts/|references/|tests/"

# Verify scripts executable
node setup/Skills/js-code-analysis/scripts/check_safety.js --help
node setup/Skills/js-code-analysis/scripts/analyze.js --help

# Verify Safe Harbor warning
node setup/Skills/js-code-analysis/scripts/check_safety.js --dry-run | grep "SAFE HARBOR"

# Validate patterns
node setup/Skills/js-code-analysis/scripts/pattern_validator.js --validate

# End-to-end test
node setup/Skills/js-code-analysis/scripts/analyze.js --target setup/Skills/js-code-analysis/tests/fixtures --format json
```

### Final Checklist
- [x] All "Must Have" present (Express/Next.js focus, Safe Harbor, ast-grep patterns, escalation techniques, H1 examples)
- [x] All "Must NOT Have" absent (auto-exploit, SELF-XSS, destructive tests, all frameworks at once, SAST tools)
- [x] All scripts executable with help text
- [x] Safe Harbor warning in all script outputs
- [x] At least 5 vulnerability patterns validated
- [x] Pattern validator passes all fixtures
- [x] Fallback instruction for non-Express/Next.js code present in SKILL.md
