# pi-skill-audit

Deterministic, read-only skill auditor for Pi, plus safe LLM-assisted skill improvement proposals.

## Commands

```text
/skill-audit              audit all discovered skills
/skill-audit global       audit global skill dirs
/skill-audit project      audit project skill dirs
/skill-audit <query>      audit skills whose name/path contains query
/skill-improve <query>    generate a Gemini Flash improvement proposal for one skill
/skill-manager            open an interactive menu to pick a skill and run actions
```

## Tool

The extension also registers:

- `skill_audit` so the agent can run the same audit.
- `skill_improve` so the agent can request a Gemini Flash proposal for one specific skill.

## Output

Writes:

```text
.pi/skill-audit/report.md
.pi/skill-audit/improve-<skill>.md
```

`improve-<skill>.md` includes review scores, main gaps, proposed changes, a suggested patch, lightweight eval scenarios, and approval questions. For symlinked skills it records both the display path and resolved source path.

## Scope

Scans the standard Pi skill locations:

- `~/.pi/agent/skills/`
- `~/.agents/skills/`
- `.pi/skills/`
- `.agents/skills/` in the current directory and ancestors up to the git root
- paths configured in `skills` arrays in user/project `settings.json`

## Checks

- missing/invalid frontmatter
- missing/invalid `name` or `description`
- name/path mismatches
- duplicate skill names
- vague descriptions
- oversized `SKILL.md`
- missing usage trigger / verification / pitfalls guidance
- missing referenced files under `references/`, `scripts/`, `templates/`, `assets/`
- basic prompt-injection phrase warnings
- non-executable shell scripts under `scripts/`

## Policy

`/skill-audit` does not use an LLM and never edits skills.

`/skill-improve` prefers `google/gemini-3-flash-preview`, falls back to `google/gemini-2.5-flash`, then the current model. It uses a fixed rubric inspired by skill optimization workflows: completeness, actionability, conciseness, robustness, invocation clarity, safety/approval, and validation. It generates a proposal/diff only and never edits skills. Review the proposal and explicitly ask Pi to apply changes if you approve.

`/skill-manager` opens quickly by listing discovered skills without auditing them all. The skill picker uses a scrollable TUI list with compact labels, prefix filtering by typing, symlink badges, duplicate-count badges, and paths in descriptions. Pick a skill, then choose `Run audit`, `Generate improve proposal`, `Open latest proposal in nvim`, or `Show paths`. `Run audit` keeps the persistent widget compact and points to `/skill-audit <name>` for full details. After generating an improve proposal, the UI asks whether to open the proposal in Neovim. Symlinked skill directories are followed during discovery; path views and improve reports show the resolved source path to make future approved edits target the source.
