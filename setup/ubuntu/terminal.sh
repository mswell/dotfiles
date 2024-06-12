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

# Install Starship
echo "${yellow}[+] Install starship${reset}"
sleep 1
sh -c "$(curl -fsSL https://starship.rs/install.sh)"

echo "${yellow}[+] Instalando syntax highlighting e autosuggestions , para o zsh${reset}"
sleep 1
git clone https://github.com/zsh-users/zsh-autosuggestions ~/.zsh/z sh-autosuggestions
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ~/.zsh/zsh-syntax-highlighting

echo "Now type \`chsh -s $(which zsh)\` to zsh becomes default."
echo "${red}Logout and login to effective your changes.${reset}"
chsh -s $(which zsh)

echo "${yellow}[*] Feito.${reset}"
sleep 1
