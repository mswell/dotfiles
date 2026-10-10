# Handoff — macOS tiling com dinky + SketchyBar (Hyprland-style)

**Data:** 2026-10-10  
**Sessão:** Claude Code (cloud, sem acesso ao Mac)  
**Branch:** `claude/compassionate-lovelace-nm9zwt`  
**Próximo foco:** validar no Mac real e instalar, respeitando o estado do dotfiles local

---

## Contexto

O objetivo é ter no macOS um tiling no estilo do Hyprland, com os mesmos atalhos e o tema tokyonight. A troca de temas fica para uma segunda etapa.

A sessão anterior rodou na nuvem, sobre o clone do GitHub. Ela **não viu o dotfiles local do Mac** (commits não enviados, arquivos alterados, configs reais em `~/.config`) e **nada foi testado em macOS de verdade**.

---

## O que foi feito (commits na branch)

| Arquivo | Mudança |
|---|---|
| `config/dinky/dinky.toml` | **NOVO** — dinky com atalhos do `hyprland.lua` (`alt` = `SUPER`), bordas tokyonight, gaps, hooks da SketchyBar, modo resize (`alt-r`) e modo service (`alt-shift-r`) |
| `config/sketchybar/` | **NOVO** — barra parecida com a Waybar (workspaces, modo do dinky, app em foco, relógio, volume, bateria, rede, cpu, memória) em tokyonight |
| `setup/macOS/tiling.sh` | **NOVO** — `install / disable / enable / uninstall / status`. Faz backup dos `defaults` que altera e os restaura no `disable` |
| `setup/macOS/tiling_install.sh` | **NOVO** — passo da opção `[9]` do `install.sh` |
| `setup/macOS/capture_configs.sh` | **NOVO** — copia o Ghostty e o herdr atuais da máquina para o repo |
| `setup/macOS/apps.sh` | Adiciona `herdr` |
| `setup/lib/dotfiles_manifest.sh` | Instala `config/herdr/config.toml`. `copy_file` faz backup `.bak.<ts>` quando o arquivo local é diferente |
| `install.sh`, `setup/lib/setup_plans.sh` | Opção `[9] macOS Setup + dinky tiling` |
| `tests/test_macos_tiling.sh` | **NOVO** — `defaults` e `sketchybar` falsos, validação do TOML, backups |

`defaults` alterados (somente no usuário, sem sudo): `com.apple.dock workspaces-auto-swoosh=false`, `com.apple.dock mru-spaces=false`, `NSGlobalDomain _HIHideMenuBar=true`.

---

## Próximos passos (na sessão local, no Mac)

1. **Ver o estado local antes de tudo:** `git status`, `git log origin/master..HEAD`, `git fetch origin claude/compassionate-lovelace-nm9zwt` e comparar com a branch. Não sobrescrever trabalho local não commitado.
2. **Comparar as configs reais com as do repo:**
   - Ghostty: `~/Library/Application Support/com.mitchellh.ghostty/config` e `~/.config/ghostty/config`
   - herdr: `~/.config/herdr/config.toml`
   - SketchyBar, AeroSpace ou outro tiler, se já existirem

   Se fizer sentido, rodar `setup/macOS/capture_configs.sh`.
3. **Checar os requisitos:** macOS >= 15, `arm64`, nenhum outro tiler rodando (AeroSpace, yabai, Amethyst, Rectangle).
4. **Instalar só o tiling primeiro:** `setup/macOS/tiling.sh install`, e não a opção `[9]` inteira.
5. **Rodar `dinky doctor`** e corrigir o que não foi verificado:
   - nomes de tecla `enter`, `tab`, `backspace`, `minus`, `equal`, `shift-equal`
   - o seletor `[display.built-in]`
6. **Ajustar o gap do topo** (`gaps.outer.top = 37`) depois de ver a SketchyBar na tela.

## Pendências conhecidas

- A SketchyBar não destaca o workspace atual ao iniciar; o destaque só começa na primeira troca (falta descobrir o formato de `dinky list-workspaces`).
- O manifest do macOS referencia `config/bin/*-sync-tokyonight-theme` e `config/launchagents/*.plist`, que não existem no repo (problema anterior a esta branch).
- O teclado US no Mac perde as dead keys do Option nas teclas usadas pelo dinky (ex.: `alt-n`).

## Rollback

`setup/macOS/tiling.sh disable` (restaura os defaults e para dinky e SketchyBar). Se janelas ficarem presas após um crash: `dinky recover`.
