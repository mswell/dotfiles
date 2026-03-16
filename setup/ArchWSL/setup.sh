#!/bin/bash
set -euo pipefail
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
export DOTFILES=$(dirname "$(dirname "$SCRIPT_DIR")")
source "$DOTFILES/setup/lib/common.sh"

source_script "$DOTFILES/setup/ArchWSL/base.sh"
source_script "$DOTFILES/setup/ArchWSL/apps.sh"
source_script "$DOTFILES/setup/terminal.sh"
source_script "$DOTFILES/setup/copy_dots.sh"

echo "${green}Arch WSL setup completed!${reset}"
echo "Now run option [5] for dev environment (mise) and [4] for hacktools"
