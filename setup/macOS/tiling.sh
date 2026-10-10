#!/bin/bash
# Tiling no macOS com dinky (https://dinky.rodeo) + Raycast, no estilo do Hyprland.
#
# Uso: setup/macOS/tiling.sh <comando>
#   install    instala dinky + Raycast, copia a config e ajusta o macOS
#   disable    desliga o dinky e restaura os ajustes originais do macOS (apps continuam instalados)
#   enable     religa o dinky depois de um disable
#   uninstall  disable + remove o dinky e a config (Raycast só com --with-raycast)
#   status     mostra o estado atual
#
# Os valores originais do macOS são salvos antes da primeira alteração e
# restaurados no disable/uninstall, então o Mac volta exatamente ao que era.
# Compatível com o bash 3.2 que vem no macOS.
set -euo pipefail

if [[ -z "${DOTFILES:-}" ]]; then
    DOTFILES=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." &>/dev/null && pwd)
fi
export DOTFILES
source "$DOTFILES/setup/lib/common.sh"

DINKY_CASK="mikker/tap/dinky"
DINKY_APP="Dinky"
DINKY_CONFIG_SRC="$DOTFILES/config/dinky/dinky.toml"
DINKY_CONFIG_DIR="${CONFIG_DIR:-$HOME/.config}/dinky"
DINKY_CONFIG="$DINKY_CONFIG_DIR/dinky.toml"
TILING_STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/dotfiles/macos-tiling"
DEFAULTS_BACKUP="$TILING_STATE_DIR/defaults.backup"

# Ajustes do macOS que o dinky precisa: "domínio|chave|valor desejado".
#  - workspaces-auto-swoosh: "ao trocar de app, ir para um Space com janelas abertas"
#    (precisa estar desligado para o follow-app-activation do dinky)
#  - mru-spaces: "reorganizar Spaces automaticamente" (desligado mantém a
#    numeração dos workspaces estável)
TILING_DEFAULTS="com.apple.dock|workspaces-auto-swoosh|false
com.apple.dock|mru-spaces|false"

ABSENT="__absent__"

# ---------------------------------------------------------------------------
# macOS defaults: snapshot / apply / restore
# ---------------------------------------------------------------------------

defaults_snapshot() {
    if [[ -f "$DEFAULTS_BACKUP" ]]; then
        echo "${yellow}[*] Backup dos ajustes originais já existe: $DEFAULTS_BACKUP${reset}"
        return 0
    fi
    mkdir -p "$TILING_STATE_DIR"
    local domain key _wanted current tmp="$DEFAULTS_BACKUP.tmp"
    : > "$tmp"
    while IFS='|' read -r domain key _wanted; do
        [[ -z "$domain" ]] && continue
        current=$(defaults read "$domain" "$key" 2>/dev/null) || current="$ABSENT"
        printf '%s|%s|%s\n' "$domain" "$key" "$current" >> "$tmp"
    done <<< "$TILING_DEFAULTS"
    mv "$tmp" "$DEFAULTS_BACKUP"
    echo "${green}✓ Ajustes originais salvos em $DEFAULTS_BACKUP${reset}"
}

defaults_apply() {
    local domain key wanted
    while IFS='|' read -r domain key wanted; do
        [[ -z "$domain" ]] && continue
        defaults write "$domain" "$key" -bool "$wanted"
        echo "${green}✓ $domain $key = $wanted${reset}"
    done <<< "$TILING_DEFAULTS"
}

defaults_restore() {
    if [[ ! -f "$DEFAULTS_BACKUP" ]]; then
        echo "${yellow}[*] Nenhum backup de ajustes encontrado; nada a restaurar.${reset}"
        return 1
    fi
    local domain key value
    while IFS='|' read -r domain key value; do
        [[ -z "$domain" ]] && continue
        if [[ "$value" == "$ABSENT" ]]; then
            defaults delete "$domain" "$key" 2>/dev/null || true
            echo "${green}✓ $domain $key restaurado (padrão do macOS)${reset}"
        else
            case "$value" in
                1|true|YES) defaults write "$domain" "$key" -bool true ;;
                *)          defaults write "$domain" "$key" -bool false ;;
            esac
            echo "${green}✓ $domain $key restaurado ($value)${reset}"
        fi
    done < "$DEFAULTS_BACKUP"
    rm -f "$DEFAULTS_BACKUP"
}

# O Dock só relê esses ajustes ao reiniciar. Reiniciar o Dock não fecha apps,
# mas pergunta antes mesmo assim.
restart_dock_prompt() {
    if [[ -t 0 ]]; then
        local answer
        read -r -p "${yellow}Reiniciar o Dock agora para aplicar os ajustes? [y/N] ${reset}" answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            killall Dock
            echo "${green}✓ Dock reiniciado${reset}"
            return 0
        fi
    fi
    echo "${yellow}[*] Os ajustes valem após 'killall Dock' ou no próximo login.${reset}"
}

# ---------------------------------------------------------------------------
# Config: start-at-login
# ---------------------------------------------------------------------------

# Define uma chave de topo do TOML (antes da primeira [tabela]) sem depender
# do sed -i (BSD e GNU diferem).
toml_set_top_key() {
    local key="$1" value="$2" file="$3" tmp
    tmp="$(mktemp)"
    awk -v key="$key" -v value="$value" '
        BEGIN { done = 0 }
        !done && $0 ~ "^[[:space:]]*" key "[[:space:]]*=" { print key " = " value; done = 1; next }
        !done && /^[[:space:]]*\[/ { print key " = " value; done = 1 }
        { print }
        END { if (!done) print key " = " value }
    ' "$file" > "$tmp"
    mv "$tmp" "$file"
}

# ---------------------------------------------------------------------------
# dinky app / CLI
# ---------------------------------------------------------------------------

dinky_running() { pgrep -xi dinky >/dev/null 2>&1; }

dinky_cli() {
    if command -v dinky &>/dev/null; then
        dinky "$@"
    else
        echo "${yellow}[*] CLI 'dinky' não encontrada no PATH; pulando: dinky $*${reset}"
        return 1
    fi
}

dinky_start() {
    open -a "$DINKY_APP"
    echo "${green}✓ dinky iniciado (conceda Acessibilidade se o macOS pedir)${reset}"
}

dinky_stop() {
    if ! dinky_running; then
        echo "${yellow}[*] dinky não está rodando${reset}"
        return 0
    fi
    # Recarrega a config para o dinky aplicar start-at-login = false,
    # devolve as janelas ao normal e então encerra o app.
    dinky_cli reload-config || true
    dinky_cli enable off || true
    osascript -e "quit app \"$DINKY_APP\"" || true
    echo "${green}✓ dinky desligado e janelas restauradas${reset}"
}

install_config() {
    mkdir -p "$DINKY_CONFIG_DIR"
    if [[ -f "$DINKY_CONFIG" ]] && ! cmp -s "$DINKY_CONFIG_SRC" "$DINKY_CONFIG"; then
        local backup
        backup="$DINKY_CONFIG.bak.$(date +%Y%m%d%H%M%S)"
        cp "$DINKY_CONFIG" "$backup"
        echo "${yellow}[*] Config anterior salva em $backup${reset}"
    fi
    cp "$DINKY_CONFIG_SRC" "$DINKY_CONFIG"
    echo "${green}✓ Config copiada para $DINKY_CONFIG${reset}"
}

require_macos() {
    if [[ "$(uname -s)" != "Darwin" ]]; then
        echo "${red}[-] Este script é só para macOS.${reset}"
        exit 1
    fi
    if [[ "$(uname -m)" != "arm64" ]]; then
        echo "${yellow}[!] dinky suporta apenas Apple Silicon; continuando mesmo assim.${reset}"
    fi
}

# ---------------------------------------------------------------------------
# Comandos
# ---------------------------------------------------------------------------

cmd_install() {
    require_macos
    source "$DOTFILES/setup/lib/homebrew.sh"
    ensure_homebrew

    echo "${yellow}[+] Instalando dinky e Raycast...${reset}"
    install_cask "$DINKY_CASK" raycast

    install_config

    echo "${yellow}[+] Ajustando o macOS para o dinky...${reset}"
    defaults_snapshot
    defaults_apply
    restart_dock_prompt

    dinky_start
    open -a Raycast || true

    dinky_cli doctor || echo "${yellow}[!] Rode 'dinky doctor' e ajuste o que ele apontar.${reset}"

    cat <<EOF

${green}Pronto!${reset} Passos manuais:
  1. Ajustes do Sistema > Privacidade e Segurança > Acessibilidade: libere o dinky.
  2. Raycast > Settings: hotkey do Raycast = Option+A (como SUPER+A/walker).
  3. Raycast > Extensions > Clipboard History: hotkey = Option+V (como SUPER+V).
  4. Atalhos: veja config/dinky/dinky.toml. Para voltar ao padrão do Mac:
     setup/macOS/tiling.sh disable
EOF
}

cmd_disable() {
    require_macos
    if [[ -f "$DINKY_CONFIG" ]]; then
        toml_set_top_key start-at-login false "$DINKY_CONFIG"
    fi
    dinky_stop
    if defaults_restore; then
        restart_dock_prompt
    fi
    echo "${green}✓ Tiling desativado. O Mac está com o comportamento padrão.${reset}"
    echo "  Para religar: setup/macOS/tiling.sh enable"
}

cmd_enable() {
    require_macos
    if [[ ! -f "$DINKY_CONFIG" ]]; then
        echo "${red}[-] Config não encontrada. Rode: setup/macOS/tiling.sh install${reset}"
        exit 1
    fi
    toml_set_top_key start-at-login true "$DINKY_CONFIG"
    defaults_snapshot
    defaults_apply
    restart_dock_prompt
    dinky_start
}

cmd_uninstall() {
    require_macos
    local with_raycast=0
    [[ "${1:-}" == "--with-raycast" ]] && with_raycast=1

    cmd_disable

    if brew list --cask "$DINKY_CASK" &>/dev/null; then
        brew uninstall --cask "$DINKY_CASK"
    fi
    if [[ -d "$DINKY_CONFIG_DIR" ]]; then
        local backup
        backup="$DINKY_CONFIG_DIR.removed.$(date +%Y%m%d%H%M%S)"
        mv "$DINKY_CONFIG_DIR" "$backup"
        echo "${yellow}[*] Config movida para $backup${reset}"
    fi
    if [[ "$with_raycast" == "1" ]] && brew list --cask raycast &>/dev/null; then
        osascript -e 'quit app "Raycast"' || true
        brew uninstall --cask raycast
    fi
    echo "${green}✓ dinky removido${reset}"
}

cmd_status() {
    if dinky_running; then
        echo "dinky: rodando"
    else
        echo "dinky: parado"
    fi
    if [[ -f "$DINKY_CONFIG" ]]; then
        echo "config: $DINKY_CONFIG ($(grep -E '^start-at-login' "$DINKY_CONFIG" || echo 'start-at-login padrão'))"
    else
        echo "config: não instalada"
    fi
    if [[ -f "$DEFAULTS_BACKUP" ]]; then
        echo "ajustes do macOS: alterados (backup em $DEFAULTS_BACKUP)"
    else
        echo "ajustes do macOS: originais"
    fi
}

tiling_usage() {
    sed -n '4,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

tiling_main() {
    local cmd="${1:-}"
    [[ $# -gt 0 ]] && shift
    case "$cmd" in
        install)   cmd_install "$@" ;;
        disable)   cmd_disable "$@" ;;
        enable)    cmd_enable "$@" ;;
        uninstall) cmd_uninstall "$@" ;;
        status)    cmd_status "$@" ;;
        *)         tiling_usage; [[ -z "$cmd" || "$cmd" == "-h" || "$cmd" == "--help" ]] || exit 1 ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    tiling_main "$@"
fi
