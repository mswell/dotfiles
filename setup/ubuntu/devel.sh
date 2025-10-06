#!/bin/sh

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

URL_RUST="https://sh.rustup.rs"

red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

echo "${yellow}[+] Install tools for developers${reset}"

echo "${yellow}[+] Install python & neovim dependencies${reset}"
# Use pipx for CLI tools instead of --break-system-packages (PEP 668 compliant)
sudo apt install -y python3-pipx
pipx ensurepath

# Install pynvim in user site-packages (safe)
python3 -m pip install --user --upgrade pynvim

# virtualenvwrapper via pipx (isolated from system Python)
pipx install virtualenvwrapper

[ ! -d "$HOME/.config/nvim" ] && mkdir -p $HOME/.config/nvim
sudo apt install -y neovim

sudo apt update
sudo apt install -y vim-nox tmux git exuberant-ctags zsh tree htop ncurses-term silversearcher-ag curl npm

curl --proto '=https' --tlsv1.2 -sSf $URL_RUST | sh

echo "${yellow}[+] Done.${reset}"
