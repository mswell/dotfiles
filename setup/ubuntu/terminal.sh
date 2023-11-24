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

# Install Colorscripts
echo "${yellow}[+] Install colorscripts${reset}"
sleep 1
git clone https://gitlab.com/dwt1/shell-color-scripts.git
cd shell-color-scripts
sudo make install
cd -
rm -rf shell-color-scripts

# Install Starship
echo "${yellow}[+] Install starship${reset}"
sleep 1
sh -c "$(curl -fsSL https://starship.rs/install.sh)"

# zsh
echo "${yellow}[+] Install oh-my-zsh${reset}"
sleep 1
sh -c "$(wget https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O -)"

echo "${yellow}[+] Install syntax highlighting and autosuggestions, for zsh${reset}"
sleep 1
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

echo "Now type \`chsh -s $(which zsh)\` to zsh becomes default."
echo "${red}Logout and login to effective your changes.${reset}"
chsh -s $(which zsh)

echo "${yellow}[*] Feito.${reset}"
sleep 1
