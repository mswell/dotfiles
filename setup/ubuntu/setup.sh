#!/bin/bash

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

source $DOTFILES/setup/ubuntu/base.sh
source $DOTFILES/setup/ubuntu/devel.sh
source $DOTFILES/setup/install_golang.sh
source $DOTFILES/setup/ubuntu/apps.sh
source $DOTFILES/setup/ubuntu/terminal.sh
source $DOTFILES/setup/copy_dots.sh

echo "Now run option [4] for dev environment (mise) and [3] for hacktools"
