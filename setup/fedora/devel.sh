#!/bin/sh

echo "Installing tools for developers"

# python and neovim dependencies
sudo -H pip install --upgrade  virtualenvwrapper
mkdir $HOME/.config/nvim
sudo pip install neovim

# install base packages
sudo dnf install -y vim gvim ncurses-devel git ctags-etags curl 

echo "Setting Rust dev environment"

curl https://sh.rustup.rs -sSf | sh
source $HOME/.cargo/env
rustup install nightly
rustup component add rls-preview --toolchain nightly

echo "Setting Go dev environment"

wget https://storage.googleapis.com/golang/go1.10.linux-amd64.tar.gz
sudo tar -zxvf go1.10.linux-amd64.tar.gz -C /usr/local/
rm go1.10.linux-amd64.tar.gz
echo "Set your env!"
echo "echo 'export GOROOT=/usr/local/go' >> ~/.zshrc"
echo "echo 'export GOPATH=\$HOME/go' >> ~/.zshrc"
echo "echo 'export PATH=\$PATH:\$GOROOT/bin:\$GOPATH/bin' >> ~/.zshrc"