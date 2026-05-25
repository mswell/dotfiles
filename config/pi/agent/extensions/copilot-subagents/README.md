# Copilot Subagents

Amp-style subagent layer for GitHub Copilot workflows in Pi.

This replaces the old `copilot-context` scout extension. It keeps the automatic context scout, but folds it into a broader subagent system with explicit delegation roles.

## Architecture

Amp treats an agent as a **model + system prompt + tools**. This extension mirrors that idea with small, isolated Pi subprocesses. Each subprocess gets its own context window and returns only a compact result to the parent session.

## Roles

| Role | Model | Thinking | Tools | Use |
| --- | --- | --- | --- | --- |
| `search` | `github-copilot/gemini-3-flash-preview` | `low` | `read,grep,find,ls` | Fast codebase retrieval / scout brief |
| `oracle` | `github-copilot/gpt-5.4` | `high` | read-only inspection + bash | Deep reasoning, planning, hard debugging second opinion |
| `review` | `github-copilot/gemini-3.1-pro-preview` | `medium` | read-only inspection + bash | Bug identification and code review |
| `librarian` | `github-copilot/claude-sonnet-4.6` | `medium` | local + web research tools | External docs/library/source research |
| `handoff` | `github-copilot/gemini-3-flash-preview` | `low` | read-only inspection + bash | Continuation context summary |

## Automatic Search

When current provider is `github-copilot`, the extension can run `search` automatically before the main model answers if the prompt likely needs codebase discovery.

It skips auto-search for:

- non-Copilot providers
- image prompts
- short continuation prompts
- idea/discussion prompts
- prompts with enough explicit file paths
- inline opt-out: `sem scout:`, `no scout:`, `sem search:`, `no search:`

The search output is injected as a visible `Copilot Search Brief` custom message.

## LLM Tool

The extension registers `copilot_subagent`.

### Single

```json
{
  "agent": "oracle",
  "task": "Analyze this failing auth test and recommend the safest fix before editing."
}
```

### Parallel

```json
{
  "tasks": [
    { "agent": "search", "task": "Find the files involved in auth token refresh." },
    { "agent": "librarian", "task": "Research current OAuth refresh-token rotation guidance." },
    { "agent": "review", "task": "Review the current diff for correctness and test gaps." }
  ],
  "concurrency": 3
}
```

### Chain

```json
{
  "chain": [
    { "agent": "search", "task": "Map the auth flow and likely edit points." },
    { "agent": "oracle", "task": "Use this context and recommend the implementation plan:\n\n{previous}" },
    { "agent": "handoff", "task": "Turn the plan into compact continuation context:\n\n{previous}" }
  ]
}
```

## Commands

```text
/copilot-subagents status
/copilot-subagents list
/copilot-subagents on
/copilot-subagents off
/copilot-subagents auto on
/copilot-subagents auto off
/copilot-subagents reset
```

Alias:

```text
/cop-subagents
```

## Relationship to `copilot-auto-router`

- `copilot-auto-router` chooses the parent model for the main turn: fast/main/think/search/vision.
- `copilot-subagents` delegates side work into isolated model+prompt+tool contexts.

The two are complementary: router controls the main thread, subagents protect the main thread from noisy context.
