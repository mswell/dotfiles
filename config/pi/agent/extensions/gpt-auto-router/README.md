# GPT Auto Router

Extensão Pi que mantém a família **GPT-5.5 (OpenAI Codex)** e roteia automaticamente o **thinking/reasoning** conforme a complexidade do prompt.

## Estratégia atual

A estratégia escolhida é a **Opção B**: não trocar para modelos menores; variar apenas o nível de reasoning para preservar cota sem sair do GPT-5.5.

| Complexidade | Modelo | Thinking | Quando |
|-------------|--------|----------|--------|
| ⚡ Ultra-simples | `gpt-5.5` | low | "ok", "sim", prompts muito curtos |
| 🪶 Simples | `gpt-5.5` | low | perguntas diretas, rename, list |
| 💰 Médio | `gpt-5.5` | medium | coding multi-step, code blocks |
| 🧠 Complexo | `gpt-5.5` | high | arquitetura, debugging, refactoring |
| 🔥 Crítico | `gpt-5.5` | high | system design, refatorar tudo, deep debugging |

## Economia / preservação de cota

Na assinatura do ChatGPT/OpenAI, o impacto não é cobrado como API por token. O objetivo aqui é evitar **GPT-5.5 high fixo** em tarefas simples.

A estimativa mostrada pelo router é heurística:

- low ≈ menor pressão na cota
- medium ≈ intermediário
- high ≈ maior pressão na cota

## Como funciona

1. Só ativa quando o provider atual é `openai-codex`.
2. Antes de cada prompt, analisa:
   - tamanho do prompt
   - padrões ultra-simples (`yes`, `ok`, `continue`)
   - keywords de coding + code blocks + file paths
   - keywords críticas (`system design`, `memory leak`, `from scratch`)
   - frequência de tool calls recentes
3. Mantém `gpt-5.5` e ajusta o thinking automaticamente.
4. Mostra no footer o thinking selecionado e preservação estimada vs `GPT-5.5 high` fixo.

## Comandos

| Comando | Descrição |
|---------|-----------|
| `/gpt-route` | Mostra info completa + estatísticas |
| `/gpt-route auto` | Ativa roteamento automático |
| `/gpt-route manual` | Desativa auto-routing |
| `/gpt-route low` | Força `gpt-5.5` com thinking low |
| `/gpt-route medium` | Força `gpt-5.5` com thinking medium |
| `/gpt-route high` | Força `gpt-5.5` com thinking high |
| `/gpt-route reset` | Reseta estatísticas |

Aliases antigos preservados:

- `mini` / `light` / `leve` → `gpt-5.5 low`
- `balanced` / `balanceado` / `medio` → `gpt-5.5 medium`
- `flagship` / `max` / `full` → `gpt-5.5 high`

## Atalho

- **Ctrl+Shift+G** — toggle auto-routing on/off

## Instalação

Já está em `~/.pi/agent/extensions/gpt-auto-router/` — é descoberta automaticamente pelo Pi.

Para recarregar após edições: `/reload`
