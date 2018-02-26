#!/bin/sh

echo "Installing tools for developers"

# python and neovim dependencies
sudo pacman -Syu --noconfirm python python-setuptools
sudo easy_install pip
sudo pip install neovim

# install base packages
pacaur -S --noconfirm --noedit ctags ncurses curl unzip neovim go docker docker-compose tmux zsh htop fzf xsel silver-searcher-git tree exa dconf ranger

echo "Setting Rust dev environment"

curl https://sh.rustup.rs -sSf | sh
source $HOME/.cargo/env
rustup install nightly
rustup component add rls-preview --toolchain nightly