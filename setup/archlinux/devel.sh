#!/bin/sh

echo "Installing tools for developers"

# python and neovim dependencies
yay -S --noconfirm python python-setuptools neovim
mkdir "$HOME/.config/nvim"

# install base packages

yay -S --noconfirm --noedit ctags ripgrep fzf ncurses curl unzip neovim docker docker-compose tmux zsh htop fzf xsel silver-searcher-git tree exa dconf

