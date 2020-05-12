#!/bin/sh

echo "Installing tools for developers"

# python and neovim dependencies
sudo pacman -Syu --noconfirm python python-setuptools
sudo easy_install pip
sudo pip install neovim
mkdir $HOME/.config/nvim

# install base packages

yay -S --noconfirm --noedit ctags ncurses curl unzip neovim docker docker-compose tmux zsh htop fzf xsel silver-searcher-git tree exa dconf

echo "Setting Go dev environment"
wget https://dl.google.com/go/go1.14.2.linux-amd64.tar.gz
sudo tar -zxvf go1.14.2.linux-amd64.tar.gz -C /usr/local/
rm go1.14.2.linux-amd64.tar.gz
echo "Set your env!"
echo "echo 'export GOROOT=/usr/local/go' >> ~/.zshrc"
echo "echo 'export GOPATH=\$HOME/go' >> ~/.zshrc"
echo "echo 'export PATH=\$PATH:\$GOROOT/bin:\$GOPATH/bin' >> ~/.zshrc"
