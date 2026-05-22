# Copilot Auto Router

Provider-specific GitHub Copilot router inspired by Amp's model-by-purpose table.

It only routes when the current provider is `github-copilot`, except for the explicit vision fallback to Google while Copilot Enterprise vision is disabled.

## Purpose table

| Purpose | Model | Thinking | Use |
| --- | --- | --- | --- |
| `fast` | `github-copilot/claude-haiku-4.5` | `low` | short/simple answers, summaries, translations |
| `main` | `github-copilot/claude-sonnet-4.6` | `medium` | default daily coding and normal agent work |
| `think` | `github-copilot/gpt-5.5` | `high` | hard debugging, architecture, design decisions, deep reasoning |
| `search` | `github-copilot/gemini-3-flash-preview` | `low` | finder/exploration/synthesis when deterministic search is primary |
| `vision` | `google/gemini-3.5-flash` | `medium` | external vision fallback while Copilot vision is unavailable |

The router uses only models visible in `pi --list-models github-copilot`. When new Copilot models appear locally, revisit this table.

## Vision modes

Default: `off`.

- `off`: image prompts route directly to `google/gemini-3.5-flash`.
- `try`: image prompts stay inside Copilot via the search/Gemini route.
- `on`: image prompts stay on the Copilot main route.

After external vision fallback, the next non-image prompt returns to Copilot and recalculates the route from the prompt and recent session context.

## Context-aware routing

The v1 router uses cheap deterministic heuristics, not subagents or LLM classifiers:

- image attachments and image file paths
- current/previous route
- continuation prompts like `continua`, `segue`, `faz isso`, `ok`
- recent session text and tool results
- failure signals from tests/build/logs
- architecture/debug/search/simple keyword groups

Priority:

1. image → `vision`
2. think/architecture → `think`
3. search/exploration → `search`
4. simple prompt → `fast`
5. default → `main`

## Commands

```text
/copilot-route
/copilot-route status
/copilot-route auto
/copilot-route manual
/copilot-route vision off|try|on
/copilot-route fast|main|think|search|vision
/copilot-route reset
```

Alias:

```text
/cop-route
```

Forcing a purpose manually applies that model/thinking and disables auto-routing. Use `/copilot-route auto` to re-enable.

No shortcut is registered in v1.
