# pi-skill-audit

Deterministic, read-only skill auditor for Pi.

## Commands

```text
/skill-audit              audit all discovered skills
/skill-audit global       audit global skill dirs
/skill-audit project      audit project skill dirs
/skill-audit <query>      audit skills whose name/path contains query
/skill-improve <query>    generate a Gemini Flash improvement proposal for one skill
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

`/skill-improve` uses `google/gemini-2.5-flash` through Pi's model registry to generate a proposal/diff only. It never edits skills. Review the proposal and explicitly ask Pi to apply changes if you approve.
