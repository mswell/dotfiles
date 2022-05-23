#!/bin/sh

echo "Installing tools for developers"

# python and neovim dependencies
paru -S --noconfirm python python-setuptools neovim
mkdir "$HOME/.config/nvim"

# install base packages

paru -S --noconfirm --noedit ctags ncurses curl unzip neovim docker docker-compose tmux zsh htop fzf xsel silver-searcher-git tree exa dconf

