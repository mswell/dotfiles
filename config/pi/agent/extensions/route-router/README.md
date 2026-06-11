# Route Router

GitHub Copilot-only model router for Pi, inspired by the Cloudflare/Stripe software-factory pattern:

- route by phase/risk, not by one huge prompt
- keep cheap/scout Copilot models on context and simple work
- reserve stronger Copilot models for planning, debugging, security reasoning, and final review
- avoid model churn with confidence thresholds and cooldowns
- keep the router small; use subagents/skills/blueprints for larger workflows

## Supported base

The router activates only when the current provider is:

```txt
github-copilot/*
```

All other providers are deliberately dormant, including direct `google/*`, `openai-codex/*`, `opencode-go/*`, Anthropic, Z.ai, local models, etc.

Only models accepted by GitHub Copilot's `vscode-chat` integrator are used in fallback chains. Gemini 3.1 Pro and models rejected by that integrator, such as `gpt-5.4-nano`, are intentionally not used.

The router uses **Copilot-effective** model budgets, not upstream provider marketing windows. For example, `github-copilot/gemini-3.5-flash` is treated as a 200k context-window model with a 160k safe input budget, not as the upstream 1M-window Gemini Flash model. Fallback resolution skips models that do not have enough safe context headroom for the current Pi context.

## Commands

```txt
/route
/route status
/route why
/route models
/route health
/route reset-health
/route mode
/route mode cheap|dev|bugbounty|max|manual|off
```

Convenience aliases are accepted:

```txt
/route dev
/route off
/route models
```

## Routing pattern

Default development flow is asymmetric, but always inside `github-copilot`:

1. **Scout/context** with lightweight Copilot models.
2. **Plan/reason** with Copilot GPT/Claude oracle models.
3. **Execute/debug** with Copilot Sonnet/Codex executor models.
4. **Review/judge** with Copilot GPT/Claude reviewer models.
5. **Use Copilot Gemini Flash only for fast context/vision-style fallback**, not as the deep Pro judge.

## Modes

| Mode | Behavior |
| --- | --- |
| `cheap` | Prefer lightweight/fast Copilot models; explicit user escalation only; vision fallback for images. |
| `dev` | Planning/review to Copilot oracle; implementation/debug loops to Copilot executor/debug; scout for context. |
| `bugbounty` | Security-oriented routing. Oracle for exploitability/business-logic reasoning; executor for PoCs, scripts, reports. |
| `max` | Escalate sooner to Copilot oracle/high reasoning while still using executor models for concrete code loops. |
| `manual` | Suggest only; no model or thinking changes. |
| `off` | No routing and no status. |

## Blueprint-lite specs

The router package also carries a small static blueprint spec for the daily `implement-feature` workflow:

```txt
Scout -> Plan -> Implement -> ValidateLocal -> Repair(max 2) -> Judge -> Result
```

Blueprint specs are data, not an executor. They are JSON-serializable and intentionally avoid raw prompt fields, direct provider/model IDs, secrets, cookies, tokens, and Authorization headers.

Node kinds:

| Kind | Purpose | Allowed model intent |
| --- | --- | --- |
| `deterministic` | Known local work such as validation commands, result assembly, and pass/fail criteria. Saves tokens by doing the obvious thing in code. | No `role`, no `riskTier`, no direct provider/model. Must carry `validationCommands` or `criteria`. |
| `agentic` | Bounded judgment work such as scout, plan, implement, repair, and final judge. | Declares `ModelRole` + `RiskTier` intent only. The Copilot-only router resolves actual models later. |

`blueprint.ts` exposes `implementFeatureBlueprint` plus a pure `validateBlueprintSpec()` helper. P2 only models and validates the workflow; real blueprint execution and automated fan-out remain follow-up tasks.

## JSONL telemetry

When a run directory is available through `PI_RUN_DIR`, `PI_BLUEPRINT_RUN_DIR`, `PI_ROUTER_RUN_DIR`, or `RUN_DIR`, the router appends redacted metadata events to:

```txt
<run-dir>/route-router-events.jsonl
```

Each line is one parseable JSON object. Emitted event names:

| Event | Purpose |
| --- | --- |
| `route.decision` | Router classified the current phase/risk and selected a target role. |
| `route.apply` | Router applied, skipped, or suggested a model/thinking change. |
| `route.fallback.skip` | A fallback model was skipped because it was unsupported, over context budget, unhealthy, or unavailable. |
| `blueprint.node.start` / `blueprint.node.end` | Blueprint node event shapes for future executors; P2 specs can emit these without raw prompts. |

Allowed fields are small metadata only: timestamp, mode, risk tier, target role, model name, context token count, safe input token budget, sanitized reason label, applied flag, blueprint node/kind, and deterministic exit code. Telemetry never records raw prompts, traffic, findings, reports, cookies, API keys, passwords, tokens, or Authorization headers. Secret-like substrings in reason labels are redacted before writing. If no run directory is available or writing fails, telemetry is a no-op and must not affect routing.

## Shared context staging

`context-staging.ts` provides a helper for passing large context to agents/reviewers by path instead of copying the same text into every prompt. It supports only these run-dir artifacts:

```txt
shared-context.md
diff-summary.md
validation-output.md
```

Default behavior:

- redact secret-like content before writing: Authorization headers, cookies, API keys, passwords, tokens, GitHub tokens, and `sk-*` keys;
- stage content to `<run-dir>/<artifact>` when it exceeds `8,000` chars, or when `force` is set;
- cap staged content at `60,000` chars with a truncation marker;
- return path + metadata for staged large context, not the raw content;
- return a redacted inline value only for below-threshold context;
- safely no-op with metadata when no run dir is available or writing fails.

Use this for `shared-context.md`, `diff-summary.md`, and `validation-output.md` before delegating to reviewers/subagents. The receiving agent should read the referenced path and avoid duplicating large staged content in its prompt.

## Fan-out / judge policy

`judge-policy.ts` models when a task should use reviewers/subagents based on `RiskTier`. It is a pure policy helper, not an executor:

| Risk tier | Default judge policy |
| --- | --- |
| `trivial` | No subagent. Prefer deterministic local checks and do not spend reviewer/oracle tokens. |
| `lite` | Optional single `reviewer`; no broad fan-out. Docs/typos do not fan out by default unless explicitly escalated. |
| `full` | Final `reviewer` is required; optional code-quality/docs specialists may be used when relevant. |
| `critical` | `oracle` + final `reviewer` + relevant specialist are required; security work requires a security specialist. |

Judge outputs should deduplicate repeated blockers, ignore nits/style preferences/theoretical risks without evidence, and prefer staged context paths over copying large context. If a required subagent/specialist is unavailable, the policy returns a manual-fallback reason instead of silently downgrading review. Final responses should explicitly state whether judge ran, was skipped by policy, or required manual fallback.

## Materiality check

`materiality-policy.ts` is a non-blocking helper that flags when router changes likely need docs, tests, or agent-instruction updates. It is intentionally advisory so it does not become noisy lint.

| Materiality | Typical changes | Recommendation |
| --- | --- | --- |
| `high` | model catalog, provider/base routing, routing policy/modes, validation commands, config defaults | Review/update `README.md` and the relevant route/blueprint policy fixtures. |
| `medium` | README/docs, `test-policy.ts`, telemetry event fields | Check related docs/tests for consistency. |
| `low` | internal refactors or trivial/non-code files | No docs/tests recommendation by default. |

Model catalog and routing policy changes specifically recommend checking `<REDACTED>.md` and `<REDACTED>.ts`. If a recommended doc is missing, the checker records a non-blocking recommendation instead of failing. Use `formatMaterialitySummary()` in final reports or future automation to state the level and suggested follow-up.

## Risk tiers

Every active route decision gets a risk tier so the router can spend stronger models only when the task warrants it:

| Tier | Typical signals | Routing impact |
| --- | --- | --- |
| `trivial` | acknowledgements, short/simple questions, no code/security/debug signals | force `copilotFast` with low thinking, even in `max` mode |
| `lite` | summarization, broad scout/context, images without sensitive/debug signals, medium context | scout/vision roles stay preferred |
| `full` | implementation, debugging, architecture, reports/PoCs, tool-heavy sessions, large context | work/debug/oracle paths are allowed by mode |
| `critical` | explicit max reasoning, critical/security-heavy signals, sensitive image/debug/architecture context | oracle/review/high-thinking routes are allowed by mode |

`/route why` and `/route status` show the last decision's tier. This mirrors the Cloudflare pattern: do not send a dream team to review a typo, but do escalate when risk or complexity is real.

## Copilot model roles

| Role | Fallbacks |
| --- | --- |
| `copilotFast` | `gpt-5.4-mini`, `gpt-5-mini`, `gemini-3.5-flash`, `claude-haiku-4.5`, `mai-code-1-flash` |
| `copilotScout` | `gemini-3.5-flash`, `gpt-5.4-mini`, `gpt-5-mini`, `claude-haiku-4.5` |
| `copilotWork` | `claude-sonnet-4.6`, `gpt-5.3-codex`, `gpt-5.4`, `claude-sonnet-4.5`, `gpt-5.2` |
| `copilotDebug` | `claude-sonnet-4.6`, `gpt-5.5`, `gpt-5.4`, `gpt-5.3-codex`, `claude-sonnet-4.5` |
| `copilotReview` | `gpt-5.5`, `claude-sonnet-4.6`, `claude-opus-4.7`, `gpt-5.4` |
| `copilotOracle` | `gpt-5.5`, `claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6`, `gpt-5.4` |
| `copilotVision` | `gemini-3.5-flash`, `claude-sonnet-4.6`, `gpt-5.5`, `gpt-5.4-mini` |

Each fallback also has a cost tier, latency tier, effective Copilot context window, and safe input budget in `model-catalog.ts`. `/route models` shows the currently resolved model plus its safe/effective budget.

## Runtime health / circuit breaker

The router tracks transient model failures at runtime and skips unhealthy models while resolving fallback chains.

A model circuit opens for 5 minutes when Pi observes retryable/model-specific failures such as:

- `requested model is not available`
- unsupported model/model not supported
- rate limits / `429`
- overloaded / temporary unavailable
- gateway `502/503/504`
- timeout

Auth/credential failures are not treated as model-health failures because switching models will not fix bad credentials.

Commands:

```txt
/route health
/route reset-health
```

Health state is runtime-only and is not persisted to disk.

## Config

Config lives next to the extension:

```txt
config.json
```

Current fail-safe default is `off`; enable routing explicitly with `/route mode dev` (or another mode):

```json
{
  "mode": "off",
  "switchConfidenceThreshold": 0.8,
  "familySwitchCooldownPrompts": 2,
  "showStatus": true
}
```

The router does not persist raw prompts, traffic, findings, reports, cookies, tokens, or other sensitive content.
