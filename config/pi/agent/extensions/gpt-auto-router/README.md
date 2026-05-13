# GPT Auto Router

Extensão Pi que roteia automaticamente entre modelos **GPT (OpenAI Codex)** para economizar cota.

## Problema

GPT-5.5 com thinking high custa **7.5x** mais que modelos menores. Muitas tasks simples (renomear variável, listar arquivos, responder "sim") não precisam do flagship.

## Roteamento

| Complexidade | Modelo | Thinking | Custo Output | Quando |
|-------------|--------|----------|-------------|--------|
| ⚡ Ultra-simples | `gpt-5.4-mini` | off | $4.5/1M | "ok", "sim", prompts muito curtos |
| 🪶 Simples | `gpt-5.4-mini` | low | $4.5/1M | perguntas diretas, rename, list |
| 💰 Médio | `gpt-5.4` | medium | $15/1M | coding multi-step, code blocks |
| 🧠 Complexo | `gpt-5.4` | high | $15/1M | arquitetura, debugging, refactoring |
| 🔥 Crítico | `gpt-5.5` | high | $30/1M | system design, refatorar tudo, deep debugging |

## Economia estimada

Se ~60% dos seus prompts são simples e ~30% são médios:
- **Antes**: tudo em GPT-5.5 high = $30/1M × 100%
- **Depois**: mix ponderado ≈ ~$10/1M em média
- **Economia**: ~65% da cota

## Como funciona

1. **Só ativa quando o modelo atual é `openai-codex/*`** — outros providers não são afetados
2. Antes de cada prompt, analisa:
   - Tamanho do prompt (curto → simples)
   - Padrões ultra-simples ("yes", "ok", "continue")
   - Keywords de coding + code blocks + file paths → complexidade
   - Keywords críticas (system design, memory leak, from scratch) → flagship
   - Frequência de tool calls recentes
3. Troca modelo **E** thinking level automaticamente
4. Mostra no footer: modelo selecionado + economia estimada

## Comandos

| Comando | Descrição |
|---------|-----------|
| `/gpt-route` | Mostra info completa + estatísticas |
| `/gpt-route auto` | Ativa roteamento automático |
| `/gpt-route manual` | Desativa (mantém modelo atual) |
| `/gpt-route mini` | Força gpt-5.4-mini |
| `/gpt-route balanced` | Força gpt-5.4 |
| `/gpt-route flagship` | Força gpt-5.5 |
| `/gpt-route reset` | Reseta estatísticas |

## Atalho

- **Ctrl+Shift+G** — Toggle auto-routing on/off

## Aliases

- `mini` / `light` / `leve` → gpt-5.4-mini
- `balanced` / `balanceado` / `medio` → gpt-5.4
- `flagship` / `max` / `full` → gpt-5.5

## Comparação com Gemini CLI

O Gemini CLI usa um **ClassifierStrategy** que chama o Flash Lite para classificar prompts. Nossa abordagem é **determinística** (keywords + heurísticas), evitando:
- ❌ Custo extra da chamada de classificação
- ❌ Latência adicional (~200-500ms)
- ❌ Possibilidade de erro do classificador

Mantendo:
- ✅ Roteamento instantâneo
- ✅ Zero custo adicional
- ✅ Previsibilidade (regras claras)

## Instalação

Já está em `~/.pi/agent/extensions/gpt-auto-router/` — é descoberta automaticamente pelo Pi.

Para recarregar após edições: `/reload`
