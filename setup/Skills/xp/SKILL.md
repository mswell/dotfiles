---
name: xp
description: Extreme Programming adapted for AI-human pair development. Use when the user says "/xp", "follow XP", "pair with me", mentions agile/YAGNI/TDD/simple-design, or wants to build features incrementally with feedback loops and clear human-AI roles.
---

# XP — Extreme Programming with AI Agents

> **Ao ativar esta skill, leia também os arquivos de referência:**
> ```
> read /home/mswell/.pi/agent/skills/xp/references/practices.md
> read /home/mswell/.pi/agent/skills/xp/references/roles.md
> ```
> `practices.md` — as 12 práticas XP adaptadas para AI. `roles.md` — papéis Driver/Navigator e anti-padrões de pareamento.

## Quick Reference

```
CICLO: Plan → RED test → GREEN impl → Refactor → Commit + Tag
REGRA: 1 ciclo por vez. Pausa para review humano antes do próximo.
TOOLS: bash(scout) → edit(impl) → bash(tests) → context_tag → harness
YAGNI: só construa o que o teste exige. Delete código morto. Sem "por via das dúvidas".
```

## When to Use

Ative quando:
- O usuário diz `/xp`, "follow XP", "vamos fazer XP", "pair comigo"
- O usuário menciona agile, YAGNI, design simples, refactoring contínuo, TDD
- O usuário quer construir uma feature incrementalmente com testes e loops de feedback
- O usuário quer divisão clara de papéis human-AI no desenvolvimento

**Não ative quando:**
- É uma correção pontual de 3 linhas sem testes (use `diagnose` ou resolva diretamente)
- O usuário está explorando sem compromisso (use skill `prototype`)
- O usuário pediu explicitamente para pular cerimônia e só quer o código

## Philosophy

Extreme Programming pega boas práticas de engenharia de software e as leva ao extremo. Code reviews se tornam *contínuos* (pair programming). Testes se tornam *implacáveis* (TDD). Melhoria de design se torna *constante* (refactoring). Planejamento se torna *frequente* (small releases).

Com agentes AI, XP evolui ainda mais. O AI não cansa, não perde foco, e pode revisar cada linha de código enquanto é escrita. Mas o humano traz julgamento, conhecimento de domínio, e a capacidade de dizer "não." O par — humano + AI — é mais poderoso do que qualquer um dos dois sozinhos, mas apenas quando trabalham juntos com papéis claros e valores compartilhados.

Esta skill é a metodologia que governa como você e seu agente AI colaboram. Não é uma ferramenta ou framework — é uma disciplina.

## The Five Values

These are the foundation. Every practice and every workflow decision traces back to these.

### Communication

- **Share context explicitly.** The AI doesn't have your mental model. Describe what you're building, why, and what "done" looks like before starting.
- **Read before writing.** Always understand the existing codebase before proposing changes.
- **Ask, don't assume.** When requirements are unclear, ask the human. A 30-second question saves a 30-minute wrong implementation.
- **Explain your reasoning.** When the AI makes a decision, it should articulate why — not just what.

### Simplicity

The YAGNI principle — You Aren't Gonna Need It.

- **Build only what's needed today.** Don't add "flexibility" for a future that may never come.
- **One test, one implementation.** Each cycle should be the smallest possible unit of progress.
- **Delete code fearlessly.** If something isn't used, remove it.
- **Simplest thing that works.** Before proposing a clever solution, ask: does a straightforward approach work?

### Feedback

Kent Beck said: "Optimism is an occupational hazard of programming. Feedback is the treatment."

- **Run tests and lint after every change.** No exceptions.
- **Show, don't tell.** When the AI completes a task, the human should see the result — run the code, show the output.
- **Fast feedback loops.** Keep each cycle short enough that the human can review and redirect within minutes.
- **Verify assumptions.** If the AI is unsure about a library API or convention, check it — don't guess.

### Courage

- **Refactor without fear.** The AI can refactor large sections while tests confirm correctness.
- **Throw away bad code.** If a direction isn't working, delete it and start over.
- **Try experiments.** The AI can prototype three approaches in the time it takes a human to try one.
- **Push back.** If the human's request would lead to a bad design, the AI should say so — respectfully, with reasoning.

### Respect

- **Follow project conventions.** Read existing code, match its style, use its patterns.
- **Understand before changing.** Never modify code you haven't read.
- **Respect the human's time.** Don't generate walls of code without explanation. Don't commit without permission.
- **Preserve intent.** When refactoring, behavior must stay the same.

## Workflow

### 1. Plan — Define One Small Task

Pick the smallest possible piece of work that delivers value:

```
Bad:  "Add authentication"
Good: "Add a login endpoint that accepts email+password and returns a JWT"
```

Before starting, confirm with the human:
- What does "done" look like?
- Which behaviors matter most?
- Are there constraints or conventions to follow?

### 2. Test — Write One Test

Write a single test that describes the expected behavior. The test should fail — this confirms you're testing the right thing.

```
RED: Write one test → test fails
```

**Se o projeto não tem framework de teste ainda:**
1. Identifique o stack do projeto (package.json, pyproject.toml, Cargo.toml, etc.)
2. Proponha o framework mínimo adequado ao stack (ex: `vitest` para TS, `pytest` para Python)
3. Confirme com o humano antes de instalar
4. Configure o mínimo necessário para rodar um teste
5. Só então escreva o teste RED

Use a skill **tdd** para o loop red-green-refactor detalhado.

### 3. Implement — Minimal Code to Pass

Write the simplest code that makes the test pass. Nothing more.

```
GREEN: Minimal implementation → test passes
```

### 4. Refactor — Improve While Green

Now that the test passes, clean up:
- Duplication to extract
- Names that could be clearer
- Structure that could be simpler
- Better abstraction (only if needed *now*)

Run tests after each refactor step. **Never refactor while red.**

```
REFACTOR: Clean up → all tests still pass
```

### 5. Release — Commit the Increment

Commit as a coherent unit. Small, focused commits with clear messages. Then pick the next task and repeat.

## Continuous Practices

- **Read the codebase first.** Before touching anything, explore with `bash` (grep, find) and `read`.
- **Run lint and tests.** After every meaningful change.
- **Follow conventions.** Match the style of surrounding code.
- **Stay small.** If a task feels big, split it. Each cycle should take minutes, not hours.
- **Communicate constantly.** Explain what you're doing, why, and what tradeoffs exist.

## Pitfalls

- **Over-ceremony on small tasks**: Don't run the full XP workflow for a 3-line typo fix.
- **Skipping the test step**: The RED step is the most important. Skipping it inverts XP — you're just writing code and hoping.
- **Chaining cycles without review**: The Ghost Pair anti-pattern (see `roles.md`). Always pause after each cycle.
- **Abstracting too early**: YAGNI applies to abstractions too. Wait for concrete duplication (rule of three).
- **Harness overload**: Don't create a harness task for every micro-step. One task per meaningful increment (minutes to ~1h of work).

## Pi Integration

These guidelines adapt XP specifically for the **Pi coding agent** toolchain.

### Session Start Ritual

1. **Read project context** — `harness({ action: "readContext" })` para entender arquitetura, convenções e decisões existentes.
2. **Read reference files** — `read references/practices.md` e `read references/roles.md` (ver instrução no topo).
3. **Iniciar tarefa** — `harness({ action: "startTask", title: "<uma tarefa pequena>" })`.
4. **Scout** — `bash` (grep, find) + `read` nos arquivos relevantes. Não toque nada antes de entender.
5. **Confirmar com o humano** — Diga o que vai fazer e o que "pronto" significa. Aguarde aprovação.

### Session End Ritual

Ao final de cada sessão XP:

1. **Fechar tarefas** — `harness({ action: "completeTask" })` para tarefas que atingiram critérios de done.
2. **Registrar lições** — `harness({ action: "recordNote", text: "..." })` para aprendizados que devem sobreviver ao reset de contexto.
3. **Deferir ideias** — `harness({ action: "appendIdea", text: "..." })` para tudo que surgiu mas não foi implementado (YAGNI).
4. **Taggear estado estável** — `context_tag({ name: "xp-session-end-<data>" })` como ponto de restore.
5. **Commit** — Se há mudanças não commitadas, commitar com mensagem clara antes de encerrar.

### PREVC → XP Cycle Mapping

Pi usa o modelo de fases **P-R-E-V-C**. Mapeamento correto sobre o ciclo XP:

| PREVC | Significado Pi | XP correspondente | O que fazer |
|---|---|---|---|
| **P** — Planning | Definir escopo e plano | **Plan** | Escrever a tarefa pequena; quebrar em menor incremento; confirmar com humano |
| **R** — Review | Revisar plano/contrato | **Revisar especificação do teste** | Humano revisa "o que o teste deve verificar" *antes* de escrever código de teste |
| **E** — Execution | Implementar | **RED → GREEN → Refactor** | Escrever teste que falha; implementação mínima; refactor imediato; rodar lint/testes |
| **V** — Validation | Validar resultado | **Feedback** | Rodar todos os testes + lint; mostrar output ao humano; registrar evidência no harness |
| **C** — Confirmation | Confirmar e fechar | **Release** | Commitar incremento; `context_tag`; registrar decisão se relevante |

Avance a fase com `harness({ action: "advancePhase" })` a cada transição.

### Harness + Context Integration

- **Decisões de design** → `harness({ action: "recordDecision", text: "..." })`
- **Estado verde estável** → `context_tag({ name: "xp-<feature>-green" })`
- **Antes de fechar ciclo** → `harness({ action: "recordEvidence", text: "Tests pass: <resumo>" })`
- **Nova ideia durante impl** → `harness({ action: "appendIdea", text: "..." })` — não implemente agora (YAGNI)
- **Handoffs / lições** → `harness({ action: "recordNote", text: "..." })`

### Pi Tool Usage in XP

| XP Practice | Pi Tool |
|---|---|
| Read before writing | `read`, `bash` (grep/find) |
| Run tests continuously | `bash` com comando de teste do projeto |
| Small releases / commit | `bash` (git commit) + `context_tag` |
| Track cycle state | `harness` tasks + `advancePhase` |
| Refactor safely | `edit` (targeted edits) + rodar testes após cada edit |
| Prototype alternatives | `subagent` com parallel tasks |
| Defer ideas | `harness appendIdea` |

### Anti-Ghost-Pair Rule

Em Pi, nunca encadeie mais de **um ciclo XP completo** sem pausa para review humano. Após cada ciclo:
1. Mostre o output dos testes e o diff.
2. Pergunte: "Pronto para continuar com a próxima tarefa, ou quer revisar primeiro?"
3. Aguarde confirmação antes de iniciar o próximo `harness startTask`.

Isso mapeia diretamente à restrição do blueprint Pi: **máximo 2 repair loops autônomos**.

### Interação com Blueprints Pi

Quando um blueprint `implement-feature` está ativo junto com XP:
- O blueprint define o flow macro (Scout → Implement → Validate → Judge)
- O XP define o flow micro dentro de cada ciclo (Plan → RED → GREEN → Refactor → Release)
- Use o harness do blueprint para evidências; use `context_tag` para cada ciclo verde
- O "Final Judge" do blueprint corresponde ao **C (Confirmation)** do PREVC

## References

- [practices.md](references/practices.md) — The 12 XP practices adapted for AI-human pairing
- [roles.md](references/roles.md) — Driver/Navigator dynamics, anti-patterns, and pairing variations
- Use the **tdd** skill for the detailed red-green-refactor loop
