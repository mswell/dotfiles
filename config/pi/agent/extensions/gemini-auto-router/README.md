# Gemini Auto Router

Extensão Pi que roteia automaticamente entre modelos **Gemini (Google API)** para economizar custos e otimizar performance.

## Problema

Modelos "Pro" custam significativamente mais que modelos "Flash". Com a chegada do **Gemini 3.5 Flash**, temos um modelo que supera o **Gemini 3.1 Pro** em tarefas de codificação e agentic, custando apenas uma fração.

## Roteamento (Maio 2026)

| Complexidade | Modelo | Thinking | Custo Output | Economia vs Pro 3.1 |
|-------------|--------|----------|-------------|-----------------|
| ⚡ Ultra-simples | `3.1-flash-lite` | off | $0.4/1M | **97%** |
| 🪶 Simples | `3.1-flash-lite` | low | $0.4/1M | **97%** |
| 💎 Médio | `3.5-flash` | medium | $2.5/1M | **79%** |
| 🧠 Complexo | `3.5-flash` | high | $2.5/1M | **79%** |
| 🔥 Crítico | `3.5-flash` | xhigh | $2.5/1M | **79%** |

*Nota: O Gemini 3.1 Pro ainda pode ser acessado manualmente para tarefas de recuperação de contexto extremamente longo (128k+).*

## Economia estimada

Com o uso do **Gemini 3.5 Flash** para tarefas complexas:
- **Antes**: tudo em Pro 3.1 = $12/1M × 100%
- **Depois**: mix ponderado ≈ ~$1.5/1M em média
- **Economia**: ~85%

## Comandos

| Comando | Descrição |
|---------|-----------|
| `/gem-route` | Info completa + estatísticas |
| `/gem-route auto` | Ativa auto-routing |
| `/gem-route manual` | Desativa |
| `/gem-route lite` | Força Flash Lite (3.1) |
| `/gem-route flash` | Força Flash (3.5) |
| `/gem-route pro` | Força Pro (3.1) |
| `/gem-route reset` | Reseta estatísticas |

## Atalho

- **Ctrl+Shift+E** — Toggle auto-routing on/off

## Aliases

- `lite` / `leve` / `flash-lite` → gemini-3.1-flash-lite-preview
- `flash` / `medio` / `balanced` → gemini-3.5-flash
- `pro` / `max` / `full` → gemini-3.1-pro-preview
