#!/bin/sh

echo "Installing tools for developers"

# python and neovim dependencies
sudo -H pip3 install --upgrade pynvim virtualenvwrapper

echo "Install latest Neovim"
mkdir $HOME/.config/nvim
bash <(curl -s https://raw.githubusercontent.com/LunarVim/LunarVim/rolling/utils/installer/install-neovim-from-release)

sudo apt update
# install base packages
sudo apt install -y vim-nox tmux git exuberant-ctags zsh tree htop ncurses-term silversearcher-ag curl npm

# install Rust

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
