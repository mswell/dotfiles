# pi-harness

Global Pi extension for project-local harness state without MCP or dotcontext.

Version: 0.5.1

Installed globally at:

```text
~/.pi/agent/extensions/pi-harness/index.ts
```

Project data is stored per repository in:

```text
.pi/harness/
```

## Commands

```text
/harness init
/harness status
/harness tasks [all]
/harness tasks-ui [all]
/harness context
/harness task <title>
/harness phase <P|R|E|V|C>
/harness advance
/harness done [note]
/harness close <task-id> [note]
/harness decision <text>
/harness evidence <text>
/harness check [pass|fail] <command> -- <summary>
/harness note <text>
/harness idea <text>
/harness contract <markdown>
/harness plan <markdown>
/harness goal [status]
/harness goal [--max-turns N] [--max-minutes N] <verifiable condition>
/harness goal clear
/harness goal achieved <evidence>
/harness summary
/harness rebuild-summary
/harness report [note]
/harness remember <type>: <content>
/harness recall [type|query]
/harness forget <type>: <substring>
/harness reflect [task-id]
/harness reflect-ai [task-id]
/harness memory-audit
/harness memory-dedupe
/harness improve-report
```

## Workflow

PREVC phases:

- P: Planning
- R: Review
- E: Execution
- V: Validation
- C: Confirmation

Use the `harness` tool or `/harness` command to keep durable task contracts, plans, goals, decisions, evidence, structured checks, notes, ideas, reports, and traces in `.pi/harness`.

For many tasks, `/harness tasks all` opens a navigable task browser instead of a truncating widget. Use `/harness tasks text all` for the old plain text list, or `/harness tasks-ui all` to explicitly open the browser. In the browser, type to filter, use ↑/↓ or j/k to move, Enter to insert `/harness reflect-ai <task-id>`, `r` to insert `/harness reflect <task-id>`, and q/Esc to close.

Long outputs such as `/harness reflect-ai`, `/harness reflect`, `/harness report`, `/harness summary`, `/harness context`, and `/harness improve-report` open in a scrollable overlay reader instead of the truncating command widget. Use ↑/↓ or j/k to scroll, PgUp/PgDn/Space to page, Home/End, and q/Esc to close.

Tool actions for task files are `updatePlan` and `updateContract`. Compatibility aliases `recordPlan` and `recordContract` are accepted because agents sometimes infer those names from `recordDecision` / `recordEvidence`.

For validation, prefer structured checks when possible:

```text
/harness check pass npx tsc --noEmit -- typecheck passed
/harness check fail npm test -- 2 tests still fail; see output above
```

The tool equivalent is `harness({ action: "recordCheck", command, exitCode, passed, text })`.

## Goal mode

`/harness goal` is an evidence-driven, budgeted loop inspired by Claude Code's `/goal`:

```text
/harness goal --max-turns 10 npm test exits 0 and git status is clean
/harness goal status
/harness goal clear
/harness goal achieved tests pass with exit 0 and git status is clean
```

Goal mode requires an active task. It stores state in the active task's `goal.json`, injects the goal into future turns, evaluates the visible conversation after each agent turn using a fast model when available, and automatically sends a follow-up message while the condition remains unmet and the turn/time budget has not been reached. If the evaluator is unavailable, the loop remains agent-driven: the agent or user should mark success with `achieveGoal` / `/harness goal achieved <evidence>` once proof is surfaced.

Write goals as verifiable conditions. The evaluator does not run tools by itself; it judges from surfaced evidence such as test output, exit codes, file reads, and `recordEvidence` entries. Default budget is 10 evaluated turns unless `--max-turns` is supplied.

## Memory and continuous improvement

Memory is explicit and project-local. Use `/harness remember <type>: <content>` to persist reusable knowledge. Valid types are `facts`, `preferences`, `patterns`, `mistakes`, `playbooks`, and `glossary`. The lean prompt automatically includes high-signal `preferences`, `playbooks`, and `mistakes`.

`/harness reflect [task-id]` performs a deterministic heuristic review of the active task, or a selected open/closed task when an id, slug, or exact title is provided. `/harness reflect-ai [task-id]` asks the current Pi model for continuous-improvement suggestions, extracts suggested `/harness remember ...` commands, and opens a checkbox approval overlay. Only selected memories are applied; press `v` in the overlay to inspect the full read-only report without applying anything.

`/harness memory-audit` writes a deterministic `.pi/harness/memory-audit.md` report with entry counts, duplicate counts, and lean-context footprint notes. `/harness memory-dedupe` removes exact normalized duplicate entries within each memory type; it does not do semantic pruning.

## Autoresearch-inspired additions

- `events.jsonl`: append-only project-level event log.
- Per-task `trace.jsonl`: append-only task event log.
- Per-task `journal.md`: operational notes and handoffs.
- Per-task `ideas.md`: deferred ideas/backlog, inspired by `autoresearch.ideas.md`.
- `summary.md`: deterministic state snapshot generated by `/harness rebuild-summary` and refreshed before Pi compaction.

Pi's normal compaction is not replaced; the harness simply persists a deterministic summary first so future turns can recover the project/task state.

## Token footprint

pi-harness defaults to a minimal prompt footprint. It injects only task counts, active-task title/phase when present, and a pointer to `harness({ action: "readContext" })` for full detail. Large traces, summaries, journals, evidence, decisions, ideas, and most memory stay on disk unless explicitly requested.

Context injection is configurable with `PI_HARNESS_CONTEXT`:

```text
PI_HARNESS_CONTEXT=minimal  # default: smallest useful status
PI_HARNESS_CONTEXT=lean     # bounded summary, recent decisions, selected memory
PI_HARNESS_CONTEXT=off      # no automatic harness context injection
```

Before compaction, pi-harness rebuilds `.pi/harness/summary.md` so Pi's normal compaction has a deterministic project/task snapshot available. Normal turns no longer trust `summary.md` for prompt injection because it can become stale between compactions.

## UI footprint

By default, pi-harness only uses the footer status (`harness:on ...`) and does not reserve a persistent widget block above the input. The full status remains available through `/harness status` and the tool action `status`.

## Dynamic workflow features (v0.5.0)

Inspired by Claude Code's dynamic workflows, pi-harness v0.5.0 adds three advisory features that combat common agentic failure modes:

### Anti-laziness tracker

When completing a task (`/harness done` or `completeTask`), the harness parses enumerated items from the plan and checks evidence coverage. If less than 80% of plan items have corresponding evidence, a warning is emitted:

```
⚠️  Anti-laziness check: plan coverage is 45% (5/11 items addressed).
Items without evidence:
  - Validate error handling for rate limits
  - Test concurrent access patterns
  ...
```

This prevents premature task completion when items remain unaddressed.

### Auto-adversarial review suggestion

When transitioning to Validation phase (`setPhase V` or `advancePhase` into V), the harness suggests spawning a fresh-context reviewer with the contract criteria. This reviewer hasn't seen the execution reasoning, eliminating self-preferential bias:

```
🔍 Adversarial review suggestion — entering Validation phase.
To combat self-preferential bias, consider spawning a fresh-context reviewer:

/run reviewer "Adversarially validate this implementation against the contract criteria..."
```

### Workflow pattern suggestions

When updating a plan or contract (`updatePlan` / `updateContract`), the harness detects task patterns and suggests appropriate subagent workflow shapes:

| Pattern | Trigger | Shape |
|---------|---------|-------|
| Fan-out-and-synthesize | 8+ list items, "audit all", "migrate everywhere" | Parallel workers, one per item |
| Adversarial verification | "verify claims", "fact-check" | Worker → parallel verifiers → synthesizer |
| Deep research | "research", "compare options", "trade-offs" | Parallel researchers + scout → synthesizer |
| Loop-until-done | "until all pass", "fix until zero errors" | Goal mode or acceptance-contract worker |
| Classify-and-route | "classify", "triage by type" | Classifier → dynamic fanout |
| Tournament | "best approach", "pick winner" | Parallel competitors → judge |

Suggestions are advisory — they appear in the tool response but don't block workflow.

## Smoke test

From `~/.pi`, run:

```bash
node scripts/test-pi-harness-smoke.mjs
```

The smoke test checks TypeScript, syntax, extension startup through `pi --list-models`, and that the route router remains fail-safe `off`.

## Manual dotfiles backup notes

Useful paths to copy manually when you want this in `~/Projects/dotfiles`:

```text
~/.pi/agent/extensions/pi-harness/
~/.pi/agent/settings.json   # review/sanitize before committing
```

Avoid backing up `~/.pi/agent/sessions/` and any API keys, tokens, OAuth material, cookies, or authentication files.
