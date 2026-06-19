---
name: xp
description: Extreme Programming adapted for AI-human pair development. Use when the user says "/xp", "follow XP", "pair with me", mentions agile/YAGNI/TDD/simple-design, or wants to build features incrementally with feedback loops and clear human-AI roles.
---

# XP — Extreme Programming with AI Agents

> **When activating this skill, also read the reference files:**
> ```
> read /home/mswell/.pi/agent/skills/xp/references/practices.md
> read /home/mswell/.pi/agent/skills/xp/references/roles.md
> ```
> `practices.md` — the 12 XP practices adapted for AI. `roles.md` — Driver/Navigator roles and pairing anti-patterns.

## Quick Reference

```
CYCLE: Plan → RED test → GREEN impl → Refactor → Commit + Tag
RULE: 1 cycle at a time. Pause for human review before the next one.
TOOLS: bash(scout) → edit(impl) → bash(tests) → context_tag → harness
YAGNI: build only what the test requires. Delete dead code. No "just in case" work.
```

## When to Use

Activate when:
- The user says `/xp`, "follow XP", "let's do XP", "pair with me"
- The user mentions agile, YAGNI, simple design, continuous refactoring, or TDD
- The user wants to build a feature incrementally with tests and feedback loops
- The user wants a clear human-AI role split during development

**Do not activate when:**
- It is a one-off 3-line fix with no tests (use `diagnose` or solve it directly)
- The user is exploring without commitment (use the `prototype` skill)
- The user explicitly asked to skip ceremony and only wants the code

## Philosophy

Extreme Programming takes good software engineering practices and pushes them to the extreme. Code reviews become *continuous* (pair programming). Tests become *relentless* (TDD). Design improvement becomes *constant* (refactoring). Planning becomes *frequent* (small releases).

With AI agents, XP evolves even further. The AI does not get tired, does not lose focus, and can review every line of code as it is written. But the human brings judgment, domain knowledge, and the ability to say "no." The pair — human + AI — is more powerful than either one alone, but only when they work together with clear roles and shared values.

This skill is the methodology that governs how you and your AI agent collaborate. It is not a tool or framework — it is a discipline.

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

**If the project does not have a test framework yet:**
1. Identify the project stack (package.json, pyproject.toml, Cargo.toml, etc.)
2. Propose the minimum framework appropriate for the stack (for example: `vitest` for TS, `pytest` for Python)
3. Confirm with the human before installing
4. Configure only what is needed to run one test
5. Only then write the RED test

Use the **tdd** skill for the detailed red-green-refactor loop.

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

1. **Read project context** — `harness({ action: "readContext" })` to understand existing architecture, conventions, and decisions.
2. **Read reference files** — `read references/practices.md` and `read references/roles.md` (see the instruction at the top).
3. **Start the task** — `harness({ action: "startTask", title: "<one small task>" })`.
4. **Scout** — `bash` (grep, find) + `read` on the relevant files. Do not touch anything before understanding it.
5. **Confirm with the human** — Say what you will do and what "done" means. Wait for approval.

### Session End Ritual

At the end of each XP session:

1. **Close tasks** — `harness({ action: "completeTask" })` for tasks that met their done criteria.
2. **Record lessons** — `harness({ action: "recordNote", text: "..." })` for learnings that should survive a context reset.
3. **Defer ideas** — `harness({ action: "appendIdea", text: "..." })` for anything that came up but was not implemented (YAGNI).
4. **Tag stable state** — `context_tag({ name: "xp-session-end-<date>" })` as a restore point.
5. **Commit** — If there are uncommitted changes, commit them with a clear message before ending.

### PREVC → XP Cycle Mapping

Pi uses the **P-R-E-V-C** phase model. Correct mapping onto the XP cycle:

| PREVC | Pi meaning | XP equivalent | What to do |
|---|---|---|---|
| **P** — Planning | Define scope and plan | **Plan** | Write the small task; break it into the smallest increment; confirm with the human |
| **R** — Review | Review plan/contract | **Review test specification** | Human reviews "what the test should verify" *before* test code is written |
| **E** — Execution | Implement | **RED → GREEN → Refactor** | Write the failing test; minimal implementation; immediate refactor; run lint/tests |
| **V** — Validation | Validate result | **Feedback** | Run all tests + lint; show output to the human; record evidence in the harness |
| **C** — Confirmation | Confirm and close | **Release** | Commit the increment; `context_tag`; record a decision if relevant |

Advance the phase with `harness({ action: "advancePhase" })` at each transition.

### Harness + Context Integration

- **Design decisions** → `harness({ action: "recordDecision", text: "..." })`
- **Stable green state** → `context_tag({ name: "xp-<feature>-green" })`
- **Before closing a cycle** → `harness({ action: "recordEvidence", text: "Tests pass: <summary>" })`
- **New idea during implementation** → `harness({ action: "appendIdea", text: "..." })` — do not implement it now (YAGNI)
- **Handoffs / lessons** → `harness({ action: "recordNote", text: "..." })`

### Pi Tool Usage in XP

| XP Practice | Pi Tool |
|---|---|
| Read before writing | `read`, `bash` (grep/find) |
| Run tests continuously | `bash` with the project's test command |
| Small releases / commit | `bash` (git commit) + `context_tag` |
| Track cycle state | `harness` tasks + `advancePhase` |
| Refactor safely | `edit` (targeted edits) + run tests after each edit |
| Prototype alternatives | `subagent` with parallel tasks |
| Defer ideas | `harness appendIdea` |

### Anti-Ghost-Pair Rule

In Pi, never chain more than **one full XP cycle** without pausing for human review. After each cycle:
1. Show the test output and the diff.
2. Ask: "Ready to continue with the next task, or do you want to review first?"
3. Wait for confirmation before starting the next `harness startTask`.

This maps directly to the Pi blueprint constraint: **maximum 2 autonomous repair loops**.

### Interaction with Pi Blueprints

When an `implement-feature` blueprint is active together with XP:
- The blueprint defines the macro flow (Scout → Implement → Validate → Judge)
- XP defines the micro flow inside each cycle (Plan → RED → GREEN → Refactor → Release)
- Use the blueprint harness for evidence; use `context_tag` for each green cycle
- The blueprint's "Final Judge" corresponds to PREVC **C (Confirmation)**

## References

- [practices.md](references/practices.md) — The 12 XP practices adapted for AI-human pairing
- [roles.md](references/roles.md) — Driver/Navigator dynamics, anti-patterns, and pairing variations
- Use the **tdd** skill for the detailed red-green-refactor loop
