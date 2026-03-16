#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

arch_base_setup

# VPS-specific extras
install_yay npm neovim tar lsb-release vim python-pip
