# pi-config-backup

Global Pi extension that backs up sanitized Pi configuration to your dotfiles and restores it across machines.

Default destination:

```text
~/Projects/dotfiles/config/pi
```

## Backup commands

```text
/pi-backup
/pi-backup --dry-run
/pi-backup ~/Projects/dotfiles/config/pi
/pi-backup --include-agents-skills
```

## Restore modes

| Mode | Command | Behavior |
|------|---------|----------|
| **merge** (default) | `/pi-restore` or `/pi-restore --merge` | Restore new/updated files; keep local extras that are not in the backup |
| **sync** | `/pi-restore --sync` | Restore + delete local extras so the machine is an exact mirror of the backup |

Additional flags (both modes):

```text
/pi-restore --dry-run       preview what would change
/pi-restore --force         overwrite locally-diverged files
/pi-restore --sync --force  full mirror, force-overwrite diverged files
```

### Keeping machines in sync

```bash
# On the source machine (after changes):
/pi-backup
git commit && git push

# On each other machine:
git pull
/pi-restore --sync
```

## Tools

```text
pi_config_backup   { destination?, dryRun?, includeAgentsSkills? }
pi_config_restore  { source?, dryRun?, force?, sync?, merge? }
```

## What is copied

- `~/.pi/agent/settings.json` → `agent/settings.example.json` with sensitive values redacted
- `~/.pi/agent/extensions/`
- `~/.pi/agent/prompts/`, `themes/` when present
- optionally `~/.agents/skills/` with `--include-agents-skills`

> **Note:** `agent/skills/` is intentionally excluded — Pi skills are managed in a separate project.

## What is excluded/redacted

- `~/.pi/agent/sessions/`
- package caches/install dirs such as `npm/`, `git/`, `node_modules/`
- `.env`, <REDACTED> filenames
- API keys, tokens, bearer tokens, JWTs, cookies, OAuth material
- Files with syntax errors (validated with `node --check`)

This is a safety filter, not cryptographic proof. Review diffs before committing dotfiles.

## Guardrails (restore)

- Files modified locally since last backup are **skipped** (not overwritten) — use `--force` to override
- A pre-restore snapshot is saved to `~/.pi/agent/.pre-restore-snapshot/` before any overwrite
- In `--sync` mode, only managed directories are pruned (`extensions/`, `prompts/`, `themes/`); `sessions/` and other dirs are never touched

## UI behavior

`/pi-backup` and `/pi-restore` report completion through a transient notification without a persistent widget. The tool versions return a one-line summary; detailed file lists remain in the tool `details` and generated `manifest.json`.
