#!/bin/sh

#--- set colors
red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

# Clones the tmux plugin manager
echo "${yellow}[+] Installing tmux plugin manager${reset}"
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

# Changes the default shell to zsh
echo "${yellow}[+] Changing default shell to zsh${reset}"
chsh -s $(which zsh)

# Prints instructions for the user
echo "${yellow}[+] Please restart the system to apply the changes.${reset}"

echo "${green}[+] Terminal configuration completed!${reset}"