#!/bin/bash

set -euo pipefail

# Source shell utilities
source "${DOTFILES:-$(dirname "$(dirname "$0")")}/setup/lib/shell_utils.sh"

#--- set colors
red=$(tput setaf 1 2>/dev/null || echo "")
green=$(tput setaf 2 2>/dev/null || echo "")
yellow=$(tput setaf 3 2>/dev/null || echo "")
reset=$(tput sgr0 2>/dev/null || echo "")

# Clones the tmux plugin manager
echo "${yellow}[+] Installing tmux plugin manager${reset}"
if [ ! -d ~/.tmux/plugins/tpm ]; then
    git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
else
    echo "${yellow}[*] TPM already installed, skipping${reset}"
fi

# Changes the default shell to zsh (non-interactive)
echo "${yellow}[+] Changing the default shell to zsh${reset}"
change_shell_to_zsh

# Prints instructions for the user
echo "${yellow}[+] Restart the system to apply the changes.${reset}"

echo "${green}[+] Terminal configuration completed!${reset}"
