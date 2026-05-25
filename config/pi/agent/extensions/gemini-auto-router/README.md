# Gemini Auto Router

Extensão Pi que roteia automaticamente para o **Gemini 3.5 Flash (Google API)**, garantindo a melhor performance e custo-benefício.

## Roteamento (Maio 2026)

Tudo é roteado para o **Gemini 3.5 Flash** (modelo de fronteira de alta velocidade).

| Complexidade | Modelo | Thinking | Custo Output |
|-------------|--------|----------|-------------|
| ⚡ Ultra-simples | `3.5-flash` | off | $2.5/1M |
| 🪶 Simples | `3.5-flash` | low | $2.5/1M |
| 💎 Médio | `3.5-flash` | medium | $2.5/1M |
| 🧠 Complexo | `3.5-flash` | high | $2.5/1M |
| 🔥 Crítico | `3.5-flash` | xhigh | $2.5/1M |

*Nota: O Gemini 3.1 Pro ainda pode ser acessado manualmente para tarefas de recuperação de contexto extremamente longo.*

## Comandos

| Comando | Descrição |
|---------|-----------|
| `/gem-route` | Info completa + estatísticas |
| `/gem-route auto` | Ativa auto-routing |
| `/gem-route manual` | Desativa |
| `/gem-route flash` | Força Flash (3.5) |
| `/gem-route pro` | Força Pro (3.1) |
| `/gem-route reset` | Reseta estatísticas |

## Atalho

- **Ctrl+Shift+E** — Toggle auto-routing on/off
