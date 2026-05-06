# pi-harness

Global Pi extension for project-local harness state without MCP or dotcontext.

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
/harness context
/harness task <title>
/harness phase <P|R|E|V|C>
/harness advance
/harness decision <text>
/harness evidence <text>
/harness report [note]
```

## Workflow

PREVC phases:

- P: Planning
- R: Review
- E: Execution
- V: Validation
- C: Confirmation

Use the `harness` tool or `/harness` command to keep durable task contracts, plans, decisions, evidence, reports, and traces in `.pi/harness`.

## Manual dotfiles backup notes

Useful paths to copy manually when you want this in `~/Projects/dotfiles`:

```text
~/.pi/agent/extensions/pi-harness/
~/.pi/agent/settings.json   # review/sanitize before committing
```

Avoid backing up `~/.pi/agent/sessions/` and any API keys, tokens, OAuth material, cookies, or authentication files.
