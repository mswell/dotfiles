# Sandcastle Templates for Pi + OpenAI Codex

Reusable Sandcastle configuration for any project using Pi as the agent
with OpenAI Codex models via GPT Plus/Pro subscription (OAuth).

## Usage

Copy this directory into a new project as `.sandcastle/`:

```bash
cp -r ~/Projects/dotfiles/config/sandcastle/ /path/to/project/.sandcastle/
```

Then:

1. Build the Docker image: `npx @ai-hero/sandcastle docker build-image`
2. Run: `npx tsx .sandcastle/main.mts`

## Requirements

- Node.js 22+
- Docker Desktop
- Pi authenticated with OpenAI Codex (`pi /login openai-codex`)
- `gh` CLI authenticated (for issue management)
- `npm install --save-dev @ai-hero/sandcastle zod`

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Pi agent container (whitelist mode, no extensions) |
| `pi-settings.json` | Minimal Pi config (zero packages, openai-codex provider) |
| `main.mts` | Parallel planner/implementer/reviewer/merger pipeline |
| `plan-prompt.md` | Planner: analyzes issues, builds dependency graph |
| `implement-prompt.md` | Implementer: RGR/TDD, exploration, conventional commits |
| `review-prompt.md` | Reviewer: code quality, correctness, CODING_STANDARDS |
| `merge-prompt.md` | Merger: merges branches, closes issues |
| `CODING_STANDARDS.md` | Project coding standards (customize per project) |
| `.env.example` | Environment variables reference |
| `.gitignore` | Ignores .env, logs, worktrees |

## Customization

- **Model**: Change `openai-codex/gpt-5.4` in `main.mts`
- **Label**: Change `Sandcastle` in `plan-prompt.md` to match your issue label
- **Tests**: Change `bash tests/run.sh` in prompts to your test command
- **CODING_STANDARDS.md**: Rewrite per project (shell, TypeScript, Python, etc.)
- **Parallelism**: Adjust `MAX_ITERATIONS` and `maxIterations` per agent in `main.mts`

## Auth

Pi auth is mounted from `~/.pi/agent/auth.json` (OAuth).
No API keys needed — uses your GPT Plus subscription.
