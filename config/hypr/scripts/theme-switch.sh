#!/usr/bin/env bash
# theme-switch.sh — Cycle or set desktop theme
# Usage: theme-switch.sh [wellpunk-dark|wellpunk-light|tokyonight|next]

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
DOTFILES_ROOT="${DOTFILES:-${DOTFILES_PATH:-$HOME/Projects/dotfiles}}"

if [[ -f "$DOTFILES_ROOT/setup/lib/theme_orchestrator.sh" ]]; then
    source "$DOTFILES_ROOT/setup/lib/theme_orchestrator.sh"
elif [[ -f "$SCRIPT_DIR/../../../setup/lib/theme_orchestrator.sh" ]]; then
    source "$SCRIPT_DIR/../../../setup/lib/theme_orchestrator.sh"
else
    echo "theme_orchestrator.sh not found. Set DOTFILES or DOTFILES_PATH." >&2
    exit 1
fi

theme_apply "${1:-}"
