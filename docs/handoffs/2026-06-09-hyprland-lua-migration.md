# Handoff — Migração Hyprland 0.55+ e correções do ambiente

**Data:** 2026-06-09  
**Sessão:** Pi Coding Agent / Claude Sonnet  
**Próximo foco:** Consolidar e testar a migração Lua em nova instalação

---

## Contexto

Esta sessão resolveu dois problemas inter-relacionados que ocorreram ao reinstalar o dotfiles em um sistema com Hyprland 0.55+:

1. Os atalhos de teclado não funcionavam após a instalação
2. O Waybar entrava em loop de erros com `stream_status: No such file or directory`

---

## O que foi feito

### 1. Diagnóstico do problema de atalhos

- **Causa raiz:** O Hyprland 0.55+ introduziu Lua como formato de config padrão. Ao detectar `~/.config/hypr/hyprland.lua` (gerado automaticamente na primeira inicialização sem config), o Hyprland ignora completamente o `hyprland.conf`.
- A troca de provider (`hyprlang` → `lua`) **só ocorre no restart da sessão**, não no `hyprctl reload`.
- **Solução imediata:** `cp config/hypr/hyprland.conf ~/.config/hypr/` + `hyprctl reload` para restaurar os atalhos.

### 2. Migração do config para Lua (solução definitiva)

**Arquivos criados/modificados nos commits `fdb2a5e` e `4e6847d`:**

| Arquivo | Mudança |
|---|---|
| `config/hypr/hyprland.lua` | **NOVO** — migração completa do `hyprland.conf` para Lua |
| `config/hypr/themes/wellpunk-dark.lua` | **NOVO** — cores do tema em Lua (retorna tabela) |
| `config/hypr/themes/wellpunk-light.lua` | **NOVO** — cores do tema em Lua |
| `config/hypr/themes/tokyonight.lua` | **NOVO** — cores do tema em Lua |
| `setup/lib/theme_orchestrator.sh` | Cria symlinks `colors.lua` além de `colors.conf` |
| `setup/lib/dotfiles_manifest.sh` | Instala `hyprland.lua` + mantém `hyprland.conf` como fallback |
| `config/waybar/config.jsonc` | Remove `custom/stream_status` (script inexistente) |
| `config/waybar/style.css` | Remove CSS do `#custom-stream_status` |

**Decisões de design:**

- Os temas `.conf` foram **mantidos** porque o `hyprlock.conf` (binário separado, usa hyprlang) ainda faz `source = colors.conf`. O `theme-switch.sh` agora cria **ambos** os symlinks: `colors.conf` (para hyprlock) e `colors.lua` (para hyprland.lua).
- O `hyprland.conf` foi **mantido no repositório** mas **também instalado**, para que quem ainda está no provider `hyprlang` continue funcionando até o próximo login.
- A migração Lua não usa `hl.exec_once` (não existe na API) — usa `hl.on("hyprland.start", function() ... end)`.
- Opacidade em `hl.window_rule` usa string: `opacity = "0.90 0.80"`, não tabela.

### 3. Correção do loop do Waybar

- **Causa:** `custom/stream_status` com `interval: 5` chamando `~/.local/scripts/stream_status` (script que nunca existiu no dotfiles).
- **Solução:** Removidos o módulo do `config.jsonc` e os estilos do `style.css`.

---

## Estado atual (pós-sessão)

```
hyprctl systeminfo → configProvider: lua ✅
hyprctl configerrors → (vazio, zero erros) ✅
hyprctl binds → 81 binds ativos ✅
waybar → rodando, sem erros de loop ✅
```

---

## Bugs de API Lua descobertos (documentar para futuras migrações)

| API incorreta | API correta | Fonte |
|---|---|---|
| `hl.exec_once("cmd")` | `hl.on("hyprland.start", function() hl.exec_cmd("cmd") end)` | wiki.hypr.land/Configuring/Basics/Autostart |
| `opacity = { active = 0.9, inactive = 0.8 }` | `opacity = "0.9 0.8"` | wiki.hypr.land/Configuring/Basics/Window-Rules |

---

## O que ainda pode ser feito

- [ ] Testar a instalação completa em máquina limpa com Hyprland 0.55+ para validar o fluxo `copy_dots.sh` → login → Lua carregado automaticamente
- [ ] Avaliar migração do `hyprlock.conf` para Lua (quando hyprlock suportar — atualmente ainda usa hyprlang)
- [ ] Remover `hyprland.conf` do repositório após algumas versões, quando não houver mais risco de regressão

---

## Commits de referência

- `fdb2a5e` — `feat(hyprland): migrate config and theme colors to Lua (0.55+)` (repo: `mswell/dotfiles`)
- `4e6847d` — `fix(waybar): remove unused custom/stream_status causing loop errors`

---

## Skills sugeridas para a próxima sessão

- **`diagnose`** — se houver novos erros no `hyprctl configerrors` após reinstalação limpa
- **`triage`** — para criar issues rastreando os itens pendentes acima
- **`tdd`** — para adicionar testes automatizados que validem o `hyprland.lua` via `luac -p`
