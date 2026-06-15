#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

arch_base_setup

# WSL-specific extras - official repositories only.
install_pacman npm tar lsb-release vim python-pip neovim
