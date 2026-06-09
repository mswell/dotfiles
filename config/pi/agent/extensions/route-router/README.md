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
<REDACTED>.json
```

Current default is `dev` for Copilot-only routing:

```json
{
  "mode": "dev",
  "switchConfidenceThreshold": 0.8,
  "familySwitchCooldownPrompts": 2,
  "showStatus": true
}
```

The router does not persist raw prompts, traffic, findings, reports, cookies, tokens, or other sensitive content.
