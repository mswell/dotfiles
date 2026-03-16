#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/common.sh"
source "${DOTFILES}/setup/lib/shell_utils.sh"

# Clones the tmux plugin manager
echo "${yellow}[+] Installing tmux plugin manager${reset}"
if [ ! -d ~/.tmux/plugins/tpm ]; then
    git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
else
    echo "${yellow}[*] TPM already installed, skipping${reset}"
fi

# Changes the default shell to zsh (non-interactive)
echo "${yellow}[+] Changing default shell to zsh${reset}"
change_shell_to_zsh

echo "${yellow}[+] Restart the system to apply the changes.${reset}"
echo "${green}[+] Terminal configuration completed!${reset}"
