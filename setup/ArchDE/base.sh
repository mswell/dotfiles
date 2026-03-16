#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

arch_base_setup

# DE-specific extras
install_yay npm wezterm ghostty neovim tar lsb-release vim python-pip
