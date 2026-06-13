# pi-config-backup

Global Pi extension that backs up sanitized Pi configuration to your dotfiles, and restores it back with divergence protection.

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

/pi-restore
/pi-restore --dry-run
/pi-restore --force          # overwrite diverged/untracked files and settings.json
/pi-restore --prune          # also remove local extension/prompt/theme files absent from the backup
/pi-restore-undo             # roll back the most recent restore from the pre-restore snapshot
/pi-restore-undo --dry-run
```

## Tools

```text
pi_config_backup
pi_config_restore
```

## What is copied

- `~/.pi/agent/settings.json` -> `agent/settings.example.json` with sensitive values redacted
- `~/.pi/agent/extensions/`
- `~/.pi/agent/prompts/` and `~/.pi/agent/themes/` when present
- optionally `~/.agents/skills/` with `--include-agents-skills`
- `.backup-manifest.json` with content hashes (used for divergence detection on restore)

## What is excluded/redacted

- `~/.pi/agent/sessions/`
- `~/.pi/agent/skills/` — **intentionally excluded**; Pi skills are managed in a separate project
- package caches/install dirs such as `npm/`, `git/`, `node_modules/`
- symlinks (not followed)
- `.env`, token/secret/cookie/auth/private-key-looking filenames
- API keys, tokens, bearer tokens, JWTs, AWS/Google/Slack/GitLab keys, cookies, OAuth material, and similar values in text files

This is a safety filter, not cryptographic proof. Review diffs before committing dotfiles.

## Syntax validation

- Loadable JS (`.js`/`.cjs`/`.mjs`/`.jsx`) is validated with `node --check`; files with errors are **skipped**.
- TypeScript sources (`.ts`/`.tsx`/`.mts`/`.cts`) are best-effort checked but **never skipped** on parse failure — `node --check` cannot reliably parse type annotations, so failures are reported as warnings and the file is still backed up.

## Restore guardrails

- Files modified locally since the last backup (hash differs from the manifest) are **skipped**, not overwritten.
- Files that exist locally but are not tracked in the backup manifest are **skipped** (use `--force`).
- `settings.json` is **never auto-overwritten** — the backup is a sanitized example with secrets redacted; use `--force` to apply it explicitly.
- A pre-restore snapshot of every overwritten file is saved to `~/.pi/agent/.pre-restore-snapshot/`.
- `/pi-restore-undo` rolls back the most recent restore from that snapshot.
- `--force` overrides divergence/untracked protection; `--prune` mirrors the backup by removing local orphans.

## UI behavior

`/pi-backup` and `/pi-restore` report completion through transient notifications and intentionally do not keep a persistent widget block in the Pi UI. The tools return a concise summary; detailed file lists, warnings, and the redaction count remain in the tool `details` and the generated `.backup-manifest.json`.

## Development

```text
# run unit tests for the pure helpers
node --experimental-strip-types --test test-lib.ts

# rebuild the loadable bundle after editing index.ts / lib.ts
esbuild index.ts --bundle --platform=node --format=cjs \
  --external:typebox --external:@earendil-works/pi-coding-agent \
  --outfile=index.js
```
