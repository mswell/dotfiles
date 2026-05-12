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

# First-install theme initialization uses the same orchestration path as runtime switching.
# In dry-run mode this prints the planned theme effects instead of mutating the host.
printf '%s\n' "${yellow}[+] Initializing default theme${reset}"
theme_apply "${DOTFILES_DEFAULT_THEME:-vantablack}"

printf '%s\n' "${yellow}[+] Done.${reset}"
