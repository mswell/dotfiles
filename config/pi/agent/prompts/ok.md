---
description: Approve proposed implementation with XP discipline
argument-hint: "[scope tweaks]"
---
Proceed with the proposed implementation.

Extra instructions: $ARGUMENTS

Rules:
- Implement only the already proposed/approved scope plus explicit tweaks above.
- Stop and ask before major ambiguity, scope change, destructive action, new dependency, commit, push, release, or issue/PR comment.
- Follow the `xp` skill: small increments, read first, YAGNI, simple design, test when behavior is testable, validate after changes.
- For non-trivial work, keep harness state lean and record validation evidence. Never store secrets.
- Use `tmux-pilot` if it helps context/window management or parallel investigation. Only if inside tmux; use `-d`, explicit targets, capture before acting, and manage only panes you created.
- Run relevant tests/lints/checks. If validation is impossible, say why.
- Report changed files, key decisions, validation commands/results, and pause after one substantial XP cycle for human review.
