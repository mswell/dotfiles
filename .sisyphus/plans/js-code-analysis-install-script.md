# JavaScript Code Analysis Skill - Install Script

## TL;DR

> **Quick Summary**: Criar script `install.sh` para a skill `js-code-analysis`, seguindo o padrão do `security-audit/install.sh`.
> 
> **Deliverables**: 
> - `setup/Skills/js-code-analysis/install.sh` - Script de instalação
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - single file

---

## Context

### Original Request
Criar um script de instalação para a skill `js-code-analysis`, similar ao existente em `setup/Skills/security-audit/install.sh`. O usuário confirmou que os alvos já possuem Safe Harbor, então a verificação de segurança é opcional.

---

## Work Objectives

### Core Objective
Criar script `install.sh` que instala a skill globalmente para uso com Claude Code.

### Concrete Deliverables
- `setup/Skills/js-code-analysis/install.sh` - Script bash executável

### Definition of Done
- [ ] Script criado e executável
- [ ] Segue o padrão do `security-audit/install.sh`
- [ ] Verifica todos os arquivos necessários da skill
- [ ] Verifica dependências (Node.js, ast-grep)

### Must Have
- Verificação de arquivos obrigatórios (SKILL.md, scripts/, references/, patterns/, fixtures/)
- Verificação de dependências (Node.js, ast-grep opcional via npx)
- Mensagens coloridas de status
- Suporte a `--path` customizado
- Suporte a `--help`

### Must NOT Have
- Verificação obrigatória de Safe Harbor (usuário confirmou que já tem)

---

## TODOs

- [x] 1. Create install.sh Script

  **What to do**:
  - Create `setup/Skills/js-code-analysis/install.sh`
  - Follow the pattern from `setup/Skills/security-audit/install.sh`
  - Adapt for JavaScript-specific files and dependencies
  - Include verification for all skill components:
    - SKILL.md
    - references/vulnerability-patterns.md
    - references/escalation-guide.md
    - references/h1-examples.md
    - references/patterns/prototype-pollution.yaml
    - references/patterns/idor.yaml
    - references/patterns/ssrf.yaml
    - references/patterns/command-injection.yaml
    - references/patterns/nosql-injection.yaml
    - scripts/analyze.js
    - scripts/check_safety.js
    - scripts/pattern_validator.js
    - tests/fixtures/prototype-pollution.js
    - tests/fixtures/idor.js
    - tests/fixtures/ssrf.js
    - tests/fixtures/command-injection.js
    - tests/fixtures/nosql-injection.js
  - Check for Node.js (required)
  - Check for ast-grep (optional, can use npx)

  **Must NOT do**:
  - Não incluir verificação obrigatória de Safe Harbor

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single script file creation
  - **Skills**: []
    - Standard bash scripting

  **References**:
  - `setup/Skills/security-audit/install.sh` - Template to follow

  **Acceptance Criteria**:
  - [x] Script executable: `chmod +x install.sh && ./install.sh --help` works
  - [x] All required files listed in verification
  - [x] Node.js check present
  - [x] ast-grep dependency noted (with npx fallback)

  **Commit**: YES
  - Message: `feat(skills): add install script for js-code-analysis skill`
  - Files: `setup/Skills/js-code-analysis/install.sh`

---

## Success Criteria

### Verification Commands
```bash
# Make executable and test help
chmod +x setup/Skills/js-code-analysis/install.sh
./setup/Skills/js-code-analysis/install.sh --help

# Run installation
./setup/Skills/js-code-analysis/install.sh
```

### Final Checklist
- [x] Script follows security-audit pattern
- [x] All skill components verified
- [x] Dependencies checked
- [x] Color output works
