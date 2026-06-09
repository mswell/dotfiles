# Copilot Blueprints

Structured daily-work blueprints for Pi using the GitHub Copilot-only route router.

## Commands

```txt
/blueprint help
/blueprint list
/blueprint <name> <task or command>
/bp <name> <task or command>
/bp runs [count]
/bp run <latest|id-substring>
/bp dashboard [count]
/bp config
/bp config init
```

## Auto-suggestion

When you type a normal request that looks like blueprint work, Pi asks for confirmation before converting it to the matching blueprint.

Examples that trigger a confirmation:

```txt
implemente filtro por status
corrija o teste de login falhando
revise o diff atual
analise risco de IDOR nesses handlers
refatore esse módulo sem mudar comportamento
diagnostique essa regressão
atualize o README depois da migração
migre schema de usuários para UUID
faça polish nos estados vazios da dashboard
escreva o relatório HackerOne desse achado
```

It does **not** auto-run during steering/follow-up, extension-injected messages, slash commands, image prompts, or non-UI modes.

## Blueprints

| Name | Purpose |
| --- | --- |
| `fix-test` | Reproduce, diagnose, patch, and validate a failing test/command. |
| `implement-feature` | Scout, plan, implement a vertical slice, test, and final judge. |
| `review-diff` | Read-only Cloudflare-style review of current git diff with subagent/judge pattern. |
| `refactor-safe` | Behavior-preserving refactor with invariants, validation, and final judge. |
| `security-check` | Concrete security review with evidence, exploitability, impact, and remediation. |
| `diagnose` | Reproduce, hypothesize, instrument, fix, and regression-test a bug. |
| `docs-update` | Update docs/agent instructions/runbooks from code/config source of truth. |
| `migration` | Migration-safe schema/API/dependency/config changes with deployment-risk judge. |
| `ui-polish` | Product UI polish with accessibility, states, and final judge. |
| `bugbounty-report` | Draft/refine a bug bounty report from concrete evidence. |

## Project presets

You can customize validation and per-blueprint behavior with:

```txt
.pi/blueprints.json
```

Create a sample file:

```txt
/bp config init
```

Show schema/current config:

```txt
/bp config
```

Example:

```json
{
  "prependValidationCommands": [
    { "cmd": "pnpm test -- --runInBand", "purpose": "primary project test", "confidence": "high" }
  ],
  "validationCommands": [
    { "cmd": "pnpm lint", "purpose": "lint", "confidence": "medium" }
  ],
  "blueprints": {
    "implement-feature": {
      "maxRepairLoops": 2,
      "requiresJudge": true,
      "validationCommands": [
        { "cmd": "pnpm typecheck", "purpose": "type safety", "confidence": "high" }
      ]
    },
    "diagnose": { "maxRepairLoops": 2, "requiresJudge": true },
    "migration": { "maxRepairLoops": 1, "requiresJudge": true },
    "review-diff": { "readOnly": true },
    "bugbounty-report": { "readOnly": true }
  }
}
```

Preset fields:

- `prependValidationCommands`: high-priority commands shown before detected ones
- `validationCommands`: commands appended after detected ones
- `blueprints.<name>.validationCommands`: blueprint-specific appended commands
- `blueprints.<name>.prependValidationCommands`: blueprint-specific prepended commands
- `blueprints.<name>.maxRepairLoops`: override repair loop cap, clamped 0-5
- `blueprints.<name>.readOnly`: override read-only guardrail
- `blueprints.<name>.requiresJudge`: override final judge requirement

## Validation detection

Each run detects likely validation commands, merges project presets, and writes them to:

```txt
.pi/runs/<run>/context/validation-suggestions.md
```

Currently detected:

- `package.json` scripts: `test`, `typecheck`, `lint`, `build`, `check`, `format:check`, and targeted `test:*`/`lint:*`/`typecheck:*`/`check:*`
- package manager from lockfile: `pnpm`, `yarn`, `bun`, `npm`
- Python: `pytest`, `ruff check .`
- Go: `go test ./...`
- Rust: `cargo test`, `cargo clippy --all-targets --all-features`
- Makefile: `make test`

These are injected as candidates, not blindly executed; the agent should choose targeted validation first.

## Run history

Runs are indexed at:

```txt
.pi/runs/index.jsonl
```

Use:

```txt
/bp runs          # latest 10
/bp runs 20       # latest 20
/bp run latest    # show latest result/review/validation suggestions
/bp run <id>      # match by run directory substring or timestamp substring
/bp dashboard     # aggregate totals/status for latest 12
/bp dashboard 30  # aggregate totals/status for latest 30
```

Dashboard status is inferred from run artifacts:

- `○ created`: run exists, no commands/result yet
- `… in-progress`: commands were recorded but no result yet
- `✓ complete`: `result.md` exists
- `◉ reviewed`: `review.md` exists
- `✗ failed`: result/review appears failed without a passing/success marker

## Subagent / judge behavior

For `implement-feature`, `review-diff`, `diagnose`, `migration`, and `ui-polish`, the kickoff prompt explicitly asks the agent to use subagents when available:

- `scout` / `context-builder` for context gathering
- `reviewer` / `oracle` for adversarial validation
- main agent as coordinator/judge to deduplicate and verify

For `implement-feature`, `refactor-safe`, `diagnose`, `migration`, and `ui-polish`, the extension also enforces a final judge follow-up if the first response does not include:

```txt
FINAL_JUDGE_DONE
```

This makes the judge pass harder to accidentally skip.

## Read-only guardrail

`review-diff`, `security-check`, and `bugbounty-report` default to enforced read-only mode unless the task text explicitly asks to fix/patch/edit.

While read-only is active:

- `edit` is blocked outside the run directory
- `write` is blocked outside the run directory
- `bash` is limited to read-only inspection commands such as `git diff`, `git status`, `rg`, `grep`, `find`, `ls`, `cat`, `sed`, `awk`, `head`, `tail`, `wc`, `pwd`

The agent may still write observability files inside the run directory.

## Observability

Each run creates a local directory under the repository:

```txt
.pi/runs/<timestamp>-<blueprint>-<slug>/
  blueprint.json
  kickoff.md
  commands.jsonl
  context/git-status.txt
  context/changed-files.txt
  context/diff-stat.txt
  context/validation-suggestions.md
```

Each index record also stores `presetPath` when `.pi/blueprints.json` was loaded.

The generated prompt asks the agent to maintain:

```txt
commands.jsonl
result.md
review.md
```

Secrets are redacted from the kickoff/task preview, and the prompt instructs the agent not to persist raw sensitive outputs.

## Guardrails

- GitHub Copilot-only routing is expected.
- Autonomous validation repair loops are capped at 2.
- Deterministic checks are preferred over guessing.
- `review-diff` and `security-check` default to read-only unless the user explicitly asks for patches.
