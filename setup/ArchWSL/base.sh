#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

arch_base_setup

# WSL-specific extras
install_yay npm tar lsb-release vim python-pip neovim
