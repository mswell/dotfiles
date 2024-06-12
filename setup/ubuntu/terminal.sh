#!/bin/sh

#--- Cores
red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

#---- script

sudo apt install -y autojump tree ttf-ancient-fonts fzf tmux alacritty

# Install tmux TPM
echo "${yellow}[+] Install tmux TPM${reset}"
sleep 1
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

# Install ZAP ZSH
zsh <(curl -s https://raw.githubusercontent.com/zap-zsh/zap/master/install.zsh) --branch release-v1

echo "Now type \`chsh -s $(which zsh)\` to zsh becomes default."
echo "${red}Logout and login to effective your changes.${reset}"
chsh -s $(which zsh)

echo "${yellow}[*] Feito.${reset}"
sleep 1
