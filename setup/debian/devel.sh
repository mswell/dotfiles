#!/bin/sh

echo "Installing tools for developers"

# python and neovim dependencies
sudo apt install -y python-dev python3-dev python3-pip
sudo -H pip install --upgrade  virtualenvwrapper
mkdir $HOME/.config/nvim
sudo add-apt-repository -y ppa:neovim-ppa/stable
sudo apt-get update
sudo apt install -y neovim
# install base packages
sudo apt install -y vim-nox tmux git exuberant-ctags zsh tree htop ncurses-term silversearcher-ag curl python3-pip

git clone https://github.com/tmux-plugins/tpm $HOME/.tmux/plugins/tpm
tmux source $HOME/.tmux.conf