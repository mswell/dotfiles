#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DOTFILES:-}" ]]; then
    DOTFILES=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)
    export DOTFILES
fi

source "${DOTFILES}/setup/lib/common.sh"
source "${DOTFILES}/setup/lib/dotfiles_manifest.sh"
source "${DOTFILES}/setup/lib/theme_orchestrator.sh"

CONFIG_DIR="${CONFIG_DIR:-$HOME/.config}"
export CONFIG_DIR

printf '%s\n' "${yellow}[+] Installing dotfiles from manifest${reset}"
dotfiles_apply_manifest

# Re-apply the current theme so all components reload from the freshly synced files.
# On first install no current-theme file exists yet; fall back to the configured default.
target_theme="${DOTFILES_DEFAULT_THEME:-}"
if [[ -z "$target_theme" ]]; then
    target_theme="$(theme_current)"
fi
printf '%s\n' "${yellow}[+] Applying theme: ${target_theme}${reset}"
theme_apply "$target_theme"

printf '%s\n' "${yellow}[+] Done.${reset}"
