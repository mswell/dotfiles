# Copilot Auto Router

Provider-specific GitHub Copilot router inspired by Amp's model-by-purpose architecture.

It routes only when the current provider is `github-copilot`. Vision is handled inside Copilot because enterprise vision is available on Gemini 3.5 Flash.

## Purpose table

The router is intentionally lightweight again: it chooses only the parent model and thinking level. It does not promise Amp/Claude-Code-style subagent orchestration.

| Role | Command aliases | Model | Thinking | Use |
| --- | --- | --- | --- | --- |
| Rush | `rush`, `fast` | `github-copilot/gpt-5.5` | `low` | fast, low-overhead work and simple prompts |
| Smart | `smart`, `main` | `github-copilot/claude-opus-4.7` | `medium` | default high-capability agent mode |
| Deep | `deep`, `think` | `github-copilot/gpt-5.5` | `high` | hard debugging, architecture, risky/broad changes |
| Search | `search` | `github-copilot/gemini-3.5-flash` | `low` | retrieval-heavy/exploration prompts |
| View Image | `vision` | `github-copilot/gemini-3.5-flash` | `medium` | image prompts inside Copilot |

The router uses only models visible in `pi --list-models github-copilot`. If GitHub Copilot changes available models, revisit this table.

## Vision

Image prompts route directly to the Copilot `vision` route: `github-copilot/gemini-3.5-flash` with `medium` thinking.

No external fallback is configured.

## Context-aware workflow routing

The router uses cheap deterministic scored heuristics, not an LLM classifier. This keeps routing fast while avoiding the older rigid `if keyword then deep` behaviour:

- image attachments and image file paths
- current/previous route
- continuation prompts like `continua`, `segue`, `faz isso`, `ok`
- recent session text and tool results, with lower weight unless the prompt is a continuation
- self-contamination filtering for previous `Copilot Route Plan` blocks
- failure signals from tests/build/logs
- architecture/debug/search/simple keyword groups
- risky domains such as auth, permissions, production, database/schema, secrets, security
- broad-change signals such as migration, rewrite, refactor, whole-codebase edits
- external-research signals such as docs, release notes, libraries, frameworks

Scoring shape:

1. image still short-circuits to `vision`
2. current prompt signals are weighted strongly
3. recent context signals are weighted lightly unless this is a short continuation
4. light discussion/questions can keep architecture-adjacent prompts on `smart` instead of over-routing to `deep`
5. search-only prompts route to `search`, but edit intent beats search-only routing
6. external docs/library signals keep `smart`; use subagents manually only when worth the overhead
7. default bias remains `smart` / `main`

The selected route is shown in the status bar. The extension no longer injects verbose `Copilot Route Plan` messages by default because they created noise and encouraged expensive subagent calls.

## Subagents

`copilot-subagents` was removed from active extensions. `copilot-auto-router` controls only the **parent/main thread** model and thinking level.

## Metrics

`/copilot-route status` reports route counts and manual overrides.

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
