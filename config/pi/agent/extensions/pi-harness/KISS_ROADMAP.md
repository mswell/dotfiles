# pi-harness KISS Roadmap / Future Resumption

This document records the `pi-harness` simplification decision and optional future work, so the topic can be resumed later without reopening the whole discussion.

## Context

`pi-harness` was drifting closer to an automatic workflow manager than to a lightweight Pi extension. The main problem was cognitive cost / token footprint per turn, plus implicit automations that conflicted with Pi's philosophy:

- Pi is minimalist and extensible.
- Workflows should be explicit/lazy, not imposed on every turn.
- Useful state should live in files and be loaded on demand.
- YAGNI: activate ceremony only when there is real pain.

## What was implemented

Main files changed/added:

- `config.ts` — pure/testable runtime configuration.
- `index.ts` — reduced automatic defaults.
- `test-config.ts` — tests for the new KISS defaults.
- `test-blueprint-bridge.ts` — removed test coupling to an installed `copilot-blueprints` extension.
- `README.md` — documented the new defaults and opt-ins.

## Desired current defaults

The default behavior should stay lazy/KISS:

| Behavior | Default | Rationale |
|---|---:|---|
| `PI_HARNESS_CONTEXT_MODE` | `status` | Inject only a short status line into the prompt. |
| `PI_HARNESS_TRACE_TOOLS` | off | Avoid giant logs for every tool call/result. |
| `PI_HARNESS_AUTO_PHASE_FROM_TOOLS` | off | Avoid implicit/ceremonial PREVC changes. |
| `PI_HARNESS_GOAL_AUTO_LOOP` | off | Avoid autonomous loops and unexpected `sendUserMessage` calls. |
| `PI_HARNESS_BLUEPRINT_BRIDGE` | off | Avoid implicit coupling to another extension. |

Compatible opt-ins:

```bash
PI_HARNESS_CONTEXT_MODE=lean          # restore the old larger context
PI_HARNESS_CONTEXT_MODE=off           # inject nothing
PI_HARNESS_LEAN_CONTEXT=1             # compatibility: alias for lean unless explicit mode exists

PI_HARNESS_TRACE_TOOLS=1
PI_HARNESS_AUTO_PHASE_FROM_TOOLS=1
PI_HARNESS_GOAL_AUTO_LOOP=1
PI_HARNESS_BLUEPRINT_BRIDGE=1
PI_HARNESS_BLUEPRINT_AUTOINIT=0
```

## Evidence recorded during implementation

Validation run after the simplification:

```bash
cd agent/extensions/pi-harness && node --test test-*.ts
```

Expected result:

```text
tests 4
pass 4
fail 0
```

A smoke import with jiti also passed using Pi's `NODE_PATH`.

Measured footprint:

- Before: approximately `4980 chars` / `~1245 tokens` injected per turn in this project.
- After: default status prompt of approximately `176 chars` / `~44 tokens`.

## Product/architecture decision

Stop here for now.

The main problem has already been solved. Do not do large refactors without new concrete pain. Future changes should follow XP/YAGNI: one small cycle at a time, with tests before/after.

## Optional future cycles

### 1. Extract prompt-context into a pure module

Priority: medium.

Reason: `before_agent_start` still builds part of the prompt inside `index.ts`. For better tests without loading Pi, extract something like:

```text
prompt-context.ts
```

Possible functions:

```ts
buildStatusPromptContext(...)
buildGoalPromptInstructions(...)
buildHarnessSystemPromptAppend(...)
```

Criteria:

- Test `off`, `status`, and `lean`.
- Test goal instructions only when `goalAutoLoop=true`.
- Keep the default status prompt below ~300 chars.

### 2. Split `index.ts`

Priority: medium/low.

`index.ts` still has more than 2k lines. Extract only if maintenance starts hurting again.

Possible modules:

```text
tasks.ts
memory.ts
commands.ts
ui.ts
events.ts
prompt-context.ts
```

Rule: do not rewrite everything. Extract one area per cycle while keeping tests green.

### 3. Project-local config

Priority: low.

Config is currently env-based. If persistent per-repo configuration becomes genuinely useful, add:

```text
.pi/harness/config.json
```

Example:

```json
{
  "contextMode": "off",
  "traceTools": false,
  "goalAutoLoop": false
}
```

Environment variables should continue to override local config for easy temporary overrides.

### 4. Trace cleanup/archive

Priority: low.

There are already large histories in `.pi/harness/events.jsonl` and `.pi/harness/tasks/*/trace.jsonl` from before the change. Implement this only if it becomes a real problem.

Possible commands:

```text
/harness prune-traces
/harness archive-done
```

Precautions:

- Never delete evidence/decisions without explicit confirmation.
- Prefer archiving/compressing over deleting.

### 5. Reevaluate PREVC

Priority: low.

PREVC still exists, but it is no longer inferred from tool usage by default. If it still feels ceremonial:

- treat phase as optional metadata;
- remove mandatory-sounding language from prompt/tool guidelines;
- keep `phase`/`advance` commands for compatibility.

## Anti-goals

Do not implement without concrete pain:

- a new workflow manager;
- more default automations;
- more internal LLM calls;
- more context injected per turn;
- mandatory dependency on other extensions.

## Resumption checklist

When returning to this topic:

1. Run `/reload` or open a new session to ensure the latest code is loaded.
2. Measure token/context footprint in a real session.
3. Run:

```bash
cd agent/extensions/pi-harness && node --test test-*.ts
```

4. Pick only one small cycle from "Optional future cycles".
5. Implement with a test and stop for review.
