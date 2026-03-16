#!/bin/bash
set -euo pipefail

# Guard: prevent re-sourcing
[ "${_COMMON_SH_LOADED:-}" = "1" ] && return 0
_COMMON_SH_LOADED=1

# DOTFILES detection (works standalone and via install.sh)
if [ -z "${DOTFILES:-}" ]; then
    _SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[1]:-${BASH_SOURCE[0]}}" )" &> /dev/null && pwd )
    export DOTFILES=$(dirname "$(dirname "$_SCRIPT_DIR")")
fi

# Colors with fallback
export TERM="${TERM:-xterm}"
red=$(tput setaf 1 2>/dev/null || echo "")
green=$(tput setaf 2 2>/dev/null || echo "")
yellow=$(tput setaf 3 2>/dev/null || echo "")
blue=$(tput setaf 4 2>/dev/null || echo "")
reset=$(tput sgr0 2>/dev/null || echo "")

# source_script() — replaces 5 identical copies
source_script() {
    local script_path="$1"
    echo "${blue}[+] Sourcing ${script_path}${reset}"
    if source "$script_path"; then
        echo "${green}[✓] ${script_path}${reset}"
    else
        echo "${red}[✗] Failed: ${script_path}${reset}"
        exit 1
    fi
}
