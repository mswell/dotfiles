#!/bin/sh

URL_RUST="https://sh.rustup.rs"

red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

echo "${yellow}[+] Install tools for developers${reset}"

echo "${yellow}[+] Install python & neovim dependencies${reset}"
sudo -H pip3 install --upgrade pynvim virtualenvwrapper --break-system-packages

[ ! -d "$HOME/.config/nvim" ] && mkdir -p $HOME/.config/nvim
sudo apt install -y neovim

sudo apt update
sudo apt install -y vim-nox tmux git exuberant-ctags zsh tree htop ncurses-term silversearcher-ag curl npm

curl --proto '=https' --tlsv1.2 -sSf $URL_RUST | sh

echo "${yellow}[+] Done.${reset}"
