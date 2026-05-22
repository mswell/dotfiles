# Copilot Context Scout

Automatic Amp-style context scout for GitHub Copilot workflows.

When the current provider is `github-copilot` and the user asks for a codebase task that likely requires discovering relevant files, this extension runs a read-only scout in an isolated Pi subprocess before the main model answers. The scout returns a capped Markdown brief, which is injected into the main session as a visible custom message.

## Why

Expensive reasoning models such as `github-copilot/gpt-5.5:high` should not spend context blindly reading many files. A cheaper scout can retrieve and compress relevant codebase context first.

## Default behavior

- Enabled by default.
- Only runs when current provider is `github-copilot`.
- Default scout model: `github-copilot/gemini-3-flash-preview:low`.
- Optional scout model: `github-copilot/claude-haiku-4.5:low`.
- Scout subprocess uses:
  - `--no-session`
  - `--no-extensions`
  - `--no-skills`
  - `--no-context-files`
  - read-only tools: `read,grep,find,ls`
- Timeout: 30 seconds.
- Brief cap: ~12 KB.
- Dedupe window: 10 minutes for similar prompts.

## When it scouts

Scouts when the prompt appears to require discovering files/context, for example:

- implement/fix/debug/refactor/investigate/review
- “onde está”, “where is”, “ache”, “find”
- stack traces/logs without an explicit file
- codebase tasks without explicit file paths

Skips scout for:

- non-Copilot providers
- idea/discussion prompts
- short continuation prompts
- image prompts
- prompts with explicit file paths
- inline opt-out: `sem scout:` or `no scout:`

## Injected brief contract

The scout returns:

```md
# Copilot Scout Brief

## Task
...

## Relevant files
- `path` — why it matters

## Key facts
- fact with evidence

## Snippets
### `path:start-end`
```text
short snippet
```

## Likely next reads
- `path:start-end`

## Non-relevant / skipped
- `path` — reason

## Confidence
low|medium|high
```

The scout does not implement or edit files.

## Commands

```text
/copilot-context status
/copilot-context on
/copilot-context off
/copilot-context model gemini
/copilot-context model haiku
/copilot-context reset
```

Alias:

```text
/cop-context
```
