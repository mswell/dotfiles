# Route Router

Minimal GPT/Gemini/OpenCode Go model router for Pi.

It only activates when the current model is one of:

```txt
google/gemini-*
openai-codex/gpt-*
opencode-go/*
```

All other providers are dormant and unaffected, including GitHub Copilot, Z.ai, Anthropic, local models, direct DeepSeek providers, and `google/gemma-*`.

## Commands

```txt
/route
/route mode
/route mode cheap|dev|bugbounty|max|manual|off
/route why
```

Convenience aliases are accepted through the same command:

```txt
/route dev
/route off
/route models
```

## Routing pattern

Default development flow is asymmetric:

1. **Plan/review with frontier models**: GPT-5.5/Codex for architecture, strategy, hard reasoning, and final review.
2. **Execute with OpenCode Go**: Qwen/DeepSeek-class models for implementation, tests, patch loops, debugging iterations, and report/code drafting.
3. **Use Gemini for explicit Gemini requests and vision fallback**: Gemini Flash/Pro remain available for image-bearing turns and user-directed Gemini analysis.

This keeps GPT-5.5 quota focused on decisions where it matters and moves high-volume coding loops onto the OpenCode Go subscription.

## Modes

| Mode | Behavior |
| --- | --- |
| `cheap` | Prefer OpenCode Go fast models; explicit user escalation only; Gemini Flash for images. |
| `dev` | GPT-5.5/Codex for planning/review; OpenCode Go for implementation/debug/review loops. |
| `bugbounty` | Security-oriented routing only. GPT-5.5 for heavy exploitability reasoning; OpenCode Go for PoC/code/report execution. No bbhunter workflow duplication. |
| `max` | Escalate sooner to GPT-5.5/Codex high reasoning, while still using OpenCode Go for concrete code loops unless Codex is explicit. |
| `manual` | Suggest only; no model or thinking changes. |
| `off` | No routing and no status. |

## Model roles

| Role | Fallbacks |
| --- | --- |
| `opencodeFast` | `opencode-go/deepseek-v4-flash`, `opencode-go/mimo-v2.5`, `opencode-go/qwen3.6-plus`, `opencode-go/minimax-m2.5` |
| `opencodeWork` | `opencode-go/qwen3.7-max`, `opencode-go/deepseek-v4-pro`, `opencode-go/qwen3.6-plus`, `opencode-go/kimi-k2.6`, `opencode-go/glm-5.1` |
| `codexPlan` | `openai-codex/gpt-5.5`, `openai-codex/gpt-5.4`, `openai-codex/gpt-5.3-codex`, `openai-codex/gpt-5.2` |
| `codexWork` | `openai-codex/gpt-5.5`, `openai-codex/gpt-5.4`, `openai-codex/gpt-5.3-codex`, `openai-codex/gpt-5.2` |
| `geminiFlash` | `google/gemini-3.5-flash`, `google/gemini-flash-latest`, `google/gemini-3-flash-preview`, `google/gemini-2.5-flash` |
| `geminiPro` | `google/gemini-3.1-pro-preview`, `google/gemini-3-pro-preview`, `google/gemini-2.5-pro` |

`openai-codex/gpt-5.3-codex-spark` is intentionally excluded: it can appear in model listings but is rejected by Codex with a ChatGPT account.

## Anti-churn

When the suggested provider family differs from the current family, the router avoids switching if the decision confidence is below the configured threshold. It also avoids very recent switches unless the new decision is a strong phase signal (`confidence >= 0.92`), so deliberate phase changes like **GPT planning → OpenCode Go execution** are not blocked.

## Config

Config lives next to the extension:

```txt
agent/extensions/route-router/config.json
```

It stores only routing preferences. Fail-safe default is `off`; enable explicitly with `/route mode dev` (or another mode):

```json
{
  "mode": "off",
  "switchConfidenceThreshold": 0.8,
  "familySwitchCooldownPrompts": 2,
  "showStatus": true
}
```

The router does not persist raw prompts, traffic, findings, reports, cookies, tokens, or other sensitive content.

## Bug bounty boundary

`/route` is not a bug bounty workflow engine. It does not integrate Caido/browser automation, LTM, recon, scoring, evidence management, or report pipelines. Those belong in `~/Projects/bbhunter`.
