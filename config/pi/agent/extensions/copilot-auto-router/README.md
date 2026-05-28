# Copilot Auto Router

Provider-specific GitHub Copilot router inspired by Amp's model-by-purpose architecture.

It routes only when the current provider is `github-copilot`. Vision is handled inside Copilot because enterprise vision is available on Gemini 3.5 Flash.

## Amp-style purpose table

| Amp role | Command aliases | Model | Thinking | Use |
| --- | --- | --- | --- | --- |
| Rush | `rush`, `fast` | `github-copilot/gpt-5.5` | `low` | fast, low-overhead work and simple prompts |
| Smart | `smart`, `main` | `github-copilot/claude-opus-4.7` | `medium` | default high-capability agent mode |
| Deep | `deep`, `think` | `github-copilot/gpt-5.5` | `high` | hard debugging, architecture, design decisions, deep reasoning |
| Search | `search` | `github-copilot/gemini-3.5-flash` | `low` | retrieval-heavy exploration when deterministic search is primary |
| View Image | `vision` | `github-copilot/gemini-3.5-flash` | `medium` | image/video-ish prompts inside Copilot |

The router uses only models visible in `pi --list-models github-copilot`. If GitHub Copilot changes available models, revisit this table.

## Vision

Image prompts route directly to the Copilot `vision` route: `github-copilot/gemini-3.5-flash` with `medium` thinking.

No external fallback is configured.

## Context-aware routing

The router uses cheap deterministic heuristics, not an LLM classifier:

- image attachments and image file paths
- current/previous route
- continuation prompts like `continua`, `segue`, `faz isso`, `ok`
- recent session text and tool results
- failure signals from tests/build/logs
- architecture/debug/search/simple keyword groups

Priority:

1. image → `vision`
2. think/architecture → `deep` / `think`
3. search/exploration → `search`
4. simple prompt → `rush` / `fast`
5. default → `smart` / `main`

## Relationship to `pi-subagents`

- `copilot-auto-router` controls the **parent/main thread** model.
- `pi-subagents` handles isolated child contexts. User agents/overrides in `~/.pi/agent/settings.json` and `~/.pi/agent/agents/` map Amp-style roles (`search`, `oracle`, `reviewer`, `librarian`, `handoff`) to Copilot models.

This mirrors Amp's split between agent modes and subagents while using the maintained `pi-subagents` runtime for fallback handling, diagnostics, async runs, chains, and parallel reviews.

## Commands

```text
/copilot-route
/copilot-route status
/copilot-route auto
/copilot-route manual
/copilot-route rush|smart|deep
/copilot-route fast|main|think
/copilot-route search|vision
/copilot-route reset
```

Alias:

```text
/cop-route
```

Forcing a purpose manually applies that model/thinking and disables auto-routing. Use `/copilot-route auto` to re-enable.
