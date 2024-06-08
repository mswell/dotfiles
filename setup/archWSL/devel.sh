#!/bin/sh

echo "Installing tools for developers"

# python and neovim dependencies
yay -S --noconfirm python python-setuptools neovim
mkdir "$HOME/.config/nvim"

# install base packages

yay -S --noconfirm ctags ripgrep ncurses curl unzip docker docker-compose xsel tree exa
