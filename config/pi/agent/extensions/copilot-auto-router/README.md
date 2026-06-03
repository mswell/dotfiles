# Copilot Auto Router

Minimalist provider-specific router for **GitHub Copilot** in Pi.

Only acts when the current provider is `github-copilot`.

## Rules

| Condition | Model | Why |
|---|---|---|
| Images attached to the prompt | `gemini-3.5-flash` | 200K ctx, no image count limit issues |
| Everything else | `claude-sonnet-4.6` | 1M ctx, solid all-rounder |

No text classification. No regex. No tier system. No false positives.

## Notes

- Router does not override if the model is already correct — no unnecessary switches.
- Premium / hard / cheap tiers are gone; use Pi's model picker manually when you need a different model.
- `gpt-5.5`, `xhigh` and other heavy options are never used automatically.
