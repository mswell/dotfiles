#!/bin/sh

echo "Installing tools for developers"

# python and neovim dependencies
sudo pacman -Syu --noconfirm python python-setuptools
sudo easy_install pip
sudo pip install neovim
mkdir $HOME/.config/nvim

# install base packages
yay -S --noconfirm --noedit ctags ncurses emacs curl unzip neovim go docker docker-compose tmux zsh htop fzf xsel silver-searcher-git tree exa dconf

# install spacemacs

git clone https://github.com/syl20bnr/spacemacs ~/.emacs.d