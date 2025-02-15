#!/bin/sh

URL_NEOVIM="https://raw.githubusercontent.com/LunarVim/LunarVim/rolling/utils/installer/install-neovim-from-release"
URL_RUST="https://sh.rustup.rs"

red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

echo "${yellow}[+] Install tools for developers${reset}"

echo "${yellow}[+] Install python & neovim dependencies${reset}"
sudo -H pip3 install --upgrade pynvim virtualenvwrapper

[ ! -d "$HOME/.config/nvim" ] && mkdir -p $HOME/.config/nvim
wget -q -O - --no-check-certificate $URL_NEOVIM | bash

sudo apt update
sudo apt install -y vim-nox tmux git exuberant-ctags zsh tree htop ncurses-term silversearcher-ag curl npm

curl --proto '=https' --tlsv1.2 -sSf $URL_RUST | sh

echo "${yellow}[+] Done.${reset}"
