# Gemini Auto Router

Extensão Pi que roteia automaticamente entre modelos **Gemini (Google API)** para economizar custos.

## Problema

Gemini 3.1 Pro custa **30x mais** que Flash Lite no output. Muitas tasks não precisam do Pro.

## Roteamento

| Complexidade | Modelo | Thinking | Custo Output | Economia vs Pro |
|-------------|--------|----------|-------------|-----------------|
| ⚡ Ultra-simples | `gemini-2.5-flash-lite` | off | $0.4/1M | **97%** |
| 🪶 Simples | `gemini-2.5-flash-lite` | low | $0.4/1M | **97%** |
| 💎 Médio | `gemini-2.5-flash` | medium | $2.5/1M | **79%** |
| 🧠 Complexo | `gemini-3.1-pro-preview` | high | $12/1M | 0% |
| 🔥 Crítico | `gemini-3.1-pro-preview` | high | $12/1M | 0% |

## Economia estimada

Se ~60% dos prompts são simples e ~30% são médios:
- **Antes**: tudo em Pro = $12/1M × 100%
- **Depois**: mix ponderado ≈ ~$2.5/1M em média
- **Economia**: ~80%

## Comandos

| Comando | Descrição |
|---------|-----------|
| `/gem-route` | Info completa + estatísticas |
| `/gem-route auto` | Ativa auto-routing |
| `/gem-route manual` | Desativa |
| `/gem-route lite` | Força Flash Lite |
| `/gem-route flash` | Força Flash |
| `/gem-route pro` | Força Pro |
| `/gem-route reset` | Reseta estatísticas |

## Atalho

- **Ctrl+Shift+E** — Toggle auto-routing on/off

## Aliases

- `lite` / `leve` / `flash-lite` → gemini-2.5-flash-lite
- `flash` / `medio` / `balanced` → gemini-2.5-flash
- `pro` / `max` / `full` → gemini-3.1-pro-preview
