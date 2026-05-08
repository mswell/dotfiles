# ZAI Auto Router

Extensão Pi que roteia automaticamente entre modelos **Z.ai (ZhipuAI)** com base no tipo de uso.

## Roteamento

| Sinal detectado | Modelo | Razão |
|----------------|--------|-------|
| Imagens no prompt | `google/gemini-3-flash-preview` | Vision fallback (GLM-5V-Turbo pode não estar disponível no plano) |
| Coding/agente complexo | `zai/glm-5.1` | Flagship SOTA |
| Alta frequência de tool calls | `zai/glm-5-turbo` | Otimizado pra velocidade |
| Complexidade média | `zai/glm-4.7` | Balanceado, mais barato |
| Prompt simples/curto | `zai/glm-4.5-air` | Ultra-leve |

## Como funciona

1. **Só ativa quando o modelo atual é `zai/*`** — outros providers não são afetados
2. Antes de cada chamada ao agente, analisa:
   - Presença de imagens (via `event.images` E paths no texto como `/tmp/pi-clipboard-*.png`) → vision fallback
   - Keywords de coding + code blocks + file paths → flagship
   - Histórico de muitos tool calls recentes → speed
   - Tamanho/complexidade do prompt → economy ou ultra-light
3. Troca o modelo automaticamente via `pi.setModel()`
4. **Para imagens**: troca temporariamente para `google/gemini-3-flash-preview`, e volta pro zai no próximo prompt sem imagem
5. Mostra no footer qual modelo foi selecionado

## Detecção de imagens

A extensão detecta imagens de três formas:
- `event.images` (imagens anexadas pelo Pi)
- Paths de clipboard: `/tmp/pi-clipboard-*.png|jpg|...`
- Referências a arquivos de imagem no texto: `@image.png`, `./screenshot.jpg`, etc.

## Comandos

| Comando | Descrição |
|---------|-----------|
| `/zai-route` | Mostra info completa do roteamento |
| `/zai-route auto` | Ativa roteamento automático |
| `/zai-route manual` | Desativa (mantém modelo atual) |
| `/zai-route <modelo>` | Força modelo específico |

## Atalho

- **Ctrl+Shift+Z** — Toggle auto-routing on/off

## Aliases para `/zai-route <modelo>`

- `flagship` → glm-5.1
- `speed` / `turbo` → glm-5-turbo
- `vision` → glm-5v-turbo
- `economy` / `eco` → glm-4.7
- `light` / `air` → glm-4.5-air

## Instalação

Já está em `~/.pi/agent/extensions/zai-auto-router/` — é descoberta automaticamente pelo Pi.

Para recarregar após edições: `/reload`
