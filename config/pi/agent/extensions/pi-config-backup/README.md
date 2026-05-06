# pi-config-backup

Global Pi extension that backs up sanitized Pi configuration to your dotfiles.

Default destination:

```text
~/Projects/dotfiles/config/pi
```

## Commands

```text
/pi-backup
/pi-backup --dry-run
/pi-backup ~/Projects/dotfiles/config/pi
/pi-backup --include-agents-skills
```

## Tool

```text
pi_config_backup
```

## What is copied

- `~/.pi/agent/settings.json` -> `agent/settings.example.json` with sensitive values redacted
- `~/.pi/agent/extensions/`
- `~/.pi/agent/skills/`, `prompts/`, `themes/` when present
- optionally `~/.agents/skills/` with `--include-agents-skills`

## What is excluded/redacted

- `~/.pi/agent/sessions/`
- package caches/install dirs such as `npm/`, `git/`, `node_modules/`
- `.env`, token/secret/cookie/auth/private-key-looking filenames
- API keys, tokens, Bearer <REDACTED>, JWTs, cookies, OAuth material, and similar values in text files

This is a safety filter, not cryptographic proof. Review diffs before committing dotfiles.
