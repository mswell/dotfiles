#!/bin/bash
# Copia as configs atuais desta máquina (Ghostty e herdr) para dentro do repo,
# para o instalador levá-las para os próximos Macs/Linux.
#
# Uso: setup/macOS/capture_configs.sh
# Depois revise com `git diff` e faça o commit. Nada é commitado automaticamente.
set -euo pipefail

if [[ -z "${DOTFILES:-}" ]]; then
    DOTFILES=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." &>/dev/null && pwd)
fi
export DOTFILES
source "$DOTFILES/setup/lib/common.sh"

CONFIG_DIR="${CONFIG_DIR:-$HOME/.config}"
GHOSTTY_MACOS_DIR="$HOME/Library/Application Support/com.mitchellh.ghostty"

# Primeiro arquivo existente da lista
first_existing() {
    local candidate
    for candidate in "$@"; do
        if [[ -f "$candidate" ]]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done
    return 1
}

capture_file() {
    local label="$1" source="$2" destination="$3"
    mkdir -p "$(dirname "$destination")"
    if [[ -f "$destination" ]] && cmp -s "$source" "$destination"; then
        echo "${green}= $label já está igual no repo${reset}"
        return 0
    fi
    cp "$source" "$destination"
    echo "${green}✓ $label: $source => ${destination#"$DOTFILES"/}${reset}"
}

capture_ghostty() {
    local config
    # No macOS o arquivo em Application Support é lido por último e vence.
    if config=$(first_existing "$GHOSTTY_MACOS_DIR/config" "$CONFIG_DIR/ghostty/config"); then
        capture_file "Ghostty" "$config" "$DOTFILES/config/Ghostty/config"
        local themes_dir
        themes_dir="$(dirname "$config")/themes"
        if [[ -d "$themes_dir" ]]; then
            mkdir -p "$DOTFILES/config/Ghostty/themes"
            cp -R "$themes_dir/." "$DOTFILES/config/Ghostty/themes/"
            echo "${green}✓ Ghostty themes: $themes_dir${reset}"
        fi
    else
        echo "${yellow}[*] Nenhuma config do Ghostty encontrada${reset}"
    fi
}

capture_herdr() {
    local config
    if config=$(first_existing "${HERDR_CONFIG_PATH:-}" "$CONFIG_DIR/herdr/config.toml"); then
        capture_file "herdr" "$config" "$DOTFILES/config/herdr/config.toml"
    else
        echo "${yellow}[*] Nenhuma config do herdr encontrada (herdr --default-config gera uma)${reset}"
    fi
}

capture_ghostty
capture_herdr

echo
git -C "$DOTFILES" status --short -- config/Ghostty config/herdr
echo "${yellow}Revise com 'git diff' e faça o commit para o instalador usar essas versões.${reset}"
