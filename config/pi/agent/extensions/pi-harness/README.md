# pi-harness

Global Pi extension for project-local harness state without MCP or dotcontext.

Version: 0.4.5

KISS simplification notes and future optional work are documented in [`KISS_ROADMAP.md`](./KISS_ROADMAP.md).

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
/harness note <text>
/harness idea <text>
/harness contract <markdown>
/harness plan <markdown>
/harness goal [status]
/harness goal [--max-turns N] [--max-minutes N] [--evaluator "<cmd>"] [--evaluator-timeout <ms|s|m>] <verifiable condition>
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
/harness improve-report
```

## Workflow

PREVC phases:

- P: Planning
- R: Review
- E: Execution
- V: Validation
- C: Confirmation

Use the `harness` tool or `/harness` command to keep durable task contracts, plans, goals, decisions, evidence, notes, ideas, reports, and optional traces in `.pi/harness`.

For many tasks, `/harness tasks all` opens a navigable task browser instead of a truncating widget. Use `/harness tasks text all` for the old plain text list, or `/harness tasks-ui all` to explicitly open the browser. In the browser, type to filter, use ↑/↓ or j/k to move, Enter to insert `/harness reflect-ai <task-id>`, `r` to insert `/harness reflect <task-id>`, and q/Esc to close.

Long outputs such as `/harness reflect-ai`, `/harness reflect`, `/harness report`, `/harness summary`, `/harness context`, and `/harness improve-report` open in a scrollable overlay reader instead of the truncating command widget. Use ↑/↓ or j/k to scroll, PgUp/PgDn/Space to page, Home/End, and q/Esc to close.

Tool actions for task files are `updatePlan` and `updateContract`. Compatibility aliases `recordPlan` and `recordContract` are accepted because agents sometimes infer those names from `recordDecision` / `recordEvidence`.

## Goal mode

`/harness goal` is an evidence-driven, budgeted loop inspired by Claude Code's `/goal`:

```text
/harness goal --max-turns 10 npm test exits 0 and git status is clean
/harness goal status
/harness goal clear
/harness goal achieved tests pass with exit 0 and git status is clean
```

Goal mode requires an active task. By default it is **manual/KISS**: it stores state in the active task's `goal.json`, and the agent or user marks success with `achieveGoal` / `/harness goal achieved <evidence>` once proof is surfaced.

Set `PI_HARNESS_GOAL_AUTO_LOOP=1` to restore the autonomous loop: pi-harness injects the active goal into future turns, evaluates the visible conversation after each agent turn using a fast model or shell evaluator when available, and automatically sends a follow-up message while the condition remains unmet and the turn/time budget has not been reached.

Write goals as verifiable conditions. The evaluator does not run tools by itself; it judges from surfaced evidence such as test output, exit codes, file reads, and `recordEvidence` entries. Default budget is 10 evaluated turns unless `--max-turns` is supplied.

### Shell evaluator (deterministic)

Pass `--evaluator "<shell cmd>"` to skip the LLM judge and use a shell command instead. Exit code `0` means the goal is achieved; any other exit means "not yet". This is the recommended evaluator when there is a real objective check available (tests, lint, build, custom script).

```text
/harness goal --evaluator "npm test --silent" tests pass
/harness goal --evaluator "./scripts/check.sh" --evaluator-timeout 5m fix the failing build
/harness goal --evaluator 'git diff --quiet HEAD && npm test' tree clean and tests green
```

Notes:

- The command runs with `cwd` = project root, `/bin/sh -c` semantics, `windowsHide: true`.
- Default timeout is `60000ms`; override with `--evaluator-timeout <n>[ms|s|m]`, capped at 10 minutes.
- Stdout/stderr tails are stored in `lastEvaluatorReason` with the standard pi-harness redactor applied (API keys, GitHub tokens, Authorization headers).
- The shell evaluator removes the implicit dependency on Gemini Flash for projects routed only through GitHub Copilot or any model without a configured external evaluator key. Combine with `--max-turns` / `--max-minutes` for a hard stop.

## Copilot-blueprints bridge

By default the `copilot-blueprints` bridge is **off** to keep pi-harness lazy and independent. Set `PI_HARNESS_BLUEPRINT_BRIDGE=1` to bridge to the `copilot-blueprints` extension in both directions (deterministic, no LLM in the path):

- **Entry side**: when a blueprint run with `requiresJudge` is created, copilot-blueprints drops a handoff marker (`.pi/blueprint-handoff.json`) containing a markdown contract rendered from the run's WorkflowSpec. On the next agent turn, pi-harness consumes the marker and creates a task in phase `E` with that contract. Idempotent per runId; skipped when a task is already active or the marker is stale (>10 min) or already consumed. A judged blueprint run is treated as explicit intent, so pi-harness **auto-initializes** `.pi/harness/` when it does not exist yet (no `/harness init` required). Opt out with `PI_HARNESS_BLUEPRINT_AUTOINIT=0`, which restricts the bridge to projects where the harness already exists.
- **Exit side**: when an agent turn ends with the marker `FINAL_JUDGE_DONE`, pi-harness records an evidence entry and advances the active task to phase `V`. Idempotent per assistant entry.

Both sides degrade silently when the other extension is absent or the project has no harness. If the bridge is enabled, a judged blueprint handoff may auto-initialize `.pi/harness/`; disable that sub-behaviour with `PI_HARNESS_BLUEPRINT_AUTOINIT=0`.

## Memory and continuous improvement

Memory is explicit and project-local. Use `/harness remember <type>: <content>` to persist reusable knowledge. Valid types are `facts`, `preferences`, `patterns`, `mistakes`, `playbooks`, and `glossary`. Memory is automatically included only when `PI_HARNESS_CONTEXT_MODE=lean`.

`/harness reflect [task-id]` performs a deterministic heuristic review of the active task, or a selected open/closed task when an id, slug, or exact title is provided. `/harness reflect-ai [task-id]` asks the current Pi model for continuous-improvement suggestions, extracts suggested `/harness remember ...` commands, and opens a checkbox approval overlay. Only selected memories are applied; press `v` in the overlay to inspect the full read-only report without applying anything.

## Autoresearch-inspired additions

- `events.jsonl`: append-only project-level event log for explicit harness events.
- Per-task `trace.jsonl`: append-only task event log. Generic tool call/result tracing is opt-in with `PI_HARNESS_TRACE_TOOLS=1`.
- Per-task `journal.md`: operational notes and handoffs.
- Per-task `ideas.md`: deferred ideas/backlog, inspired by `autoresearch.ideas.md`.
- `summary.md`: deterministic state snapshot generated by `/harness rebuild-summary` and refreshed before Pi compaction.

Pi's normal compaction is not replaced; the harness simply persists a deterministic summary first so future turns can recover the project/task state.

## Runtime defaults and opt-ins

pi-harness defaults are intentionally lazy/KISS:

| Setting | Default | Effect |
|---|---:|---|
| `PI_HARNESS_CONTEXT_MODE=off\|status\|lean` | `status` | `status` injects a one-line pointer; `lean` restores the old larger prompt; `off` injects nothing. |
| `PI_HARNESS_TRACE_TOOLS=1` | off | Append non-harness tool call/result events to `events.jsonl` and task `trace.jsonl`. |
| `PI_HARNESS_AUTO_PHASE_FROM_TOOLS=1` | off | Infer phase `E` when generic execution tools (`bash`, `edit`, `write`) run. |
| `PI_HARNESS_GOAL_AUTO_LOOP=1` | off | Evaluate active goals after each agent turn and enqueue follow-up prompts automatically. |
| `PI_HARNESS_BLUEPRINT_BRIDGE=1` | off | Consume copilot-blueprints handoffs and final-judge markers. |
| `PI_HARNESS_BLUEPRINT_AUTOINIT=0` | on if bridge enabled | Prevent bridge-created `.pi/harness/` directories. |

Legacy shortcut: `PI_HARNESS_LEAN_CONTEXT=1` is accepted as `PI_HARNESS_CONTEXT_MODE=lean` unless the explicit context mode is set.

## Token footprint

KISS default: pi-harness injects only a short status line into the system prompt, for example active task + open task count + a pointer to `harness({ action: "readContext" })` for details.

Set `PI_HARNESS_CONTEXT_MODE=lean` to restore the previous larger context injection: active task, bounded summary, recent decisions, high-signal memory, and operating rules. Set `PI_HARNESS_CONTEXT_MODE=off` to inject nothing. Large traces, full journals, full evidence, and ideas stay on disk and are loaded on demand.

Before compaction, pi-harness rebuilds `.pi/harness/summary.md` so Pi's normal compaction has a deterministic project/task snapshot available.

## UI footprint

By default, pi-harness only uses the footer status (`harness:on ...`) and does not reserve a persistent widget block above the input. The full status remains available through `/harness status` and the tool action `status`.

## Manual dotfiles backup notes

Useful paths to copy manually when you want this in `~/Projects/dotfiles`:

```text
~/.pi/agent/extensions/pi-harness/
~/.pi/agent/settings.json   # review/sanitize before committing
```

Avoid backing up `~/.pi/agent/sessions/` and any API keys, tokens, OAuth material, cookies, or authentication files.
