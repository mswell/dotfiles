#!/bin/sh

echo "Installing tools for developers"

# python and neovim dependencies
sudo apt install -y python-dev python3-dev python3-pip python-pip
sudo -H pip install --upgrade  virtualenvwrapper
mkdir $HOME/.config/nvim
sudo pip install neovim

# install base packages
sudo apt install -y vim-nox tmux vim-gtk git exuberant-ctags zsh tree htop ncurses-term silversearcher-ag curl python-pip python3-pip

git clone https://github.com/tmux-plugins/tpm $HOME/.tmux/plugins/tpm
tmux source $HOME/.tmux.conf

echo "Setting Go dev environment"

wget https://dl.google.com/go/go1.12.7.linux-amd64.tar.gz
sudo tar -zxvf go1.12.7.linux-amd64.tar.gz -C /usr/local/
rm go1.12.7.linux-amd64.tar.gz
echo "Set your env!"
echo "echo 'export GOROOT=/usr/local/go' >> ~/.zshrc"
echo "echo 'export GOPATH=\$HOME/go' >> ~/.zshrc"
echo "echo 'export PATH=\$PATH:\$GOROOT/bin:\$GOPATH/bin' >> ~/.zshrc"
