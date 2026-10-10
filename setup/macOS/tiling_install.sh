#!/bin/bash
# install.sh option [9]: dinky + Raycast on top of the macOS setup.
# To turn it off later: setup/macOS/tiling.sh disable
set -euo pipefail
source "${DOTFILES}/setup/macOS/tiling.sh"
cmd_install
