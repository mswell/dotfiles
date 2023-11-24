#!/bin/sh

#------- Constantes
URL_NEOVIM=" https://raw.githubusercontent.com/LunarVim/LunarVim/rolling/utils/installer/install-neovim-from-release"
URL_RUST="https://sh.rustup.rs"

#--- Cores
red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

#---- script
echo "${yellow}[+] Instalando tools for developers${reset}"

# python and neovim dependencies
echo "${yellow}[+] Instalando python & neovim dependencies${reset}"
sudo -H pip3 install --upgrade pynvim virtualenvwrapper

# neovim
echo "${yellow}[+] Instalando Neovim${reset}"
# cria diretorio se ele nao existe
[ ! -d "$HOME/.config/nvim" ] && mkdir -p $HOME/.config/nvim
#bash <(curl -s https://raw.githubusercontent.com/LunarVim/LunarVim/rolling/utils/installer/install-neovim-from-release)
# Faz o download e instala
wget -q -O - --no-check-certificate $URL_NEOVIM | bash

# install base packages
echo "${yellow}[+] Instalando pacotes base${reset}"
sudo apt update
sudo apt install -y vim-nox tmux git exuberant-ctags zsh tree htop ncurses-term silversearcher-ag curl npm

# instala o Rust
echo "${yellow}[+] Instalando o  Rust${reset}"
curl --proto '=https' --tlsv1.2 -sSf $URL_RUST | sh

echo "${yellow}[+] Feito.${reset}"
