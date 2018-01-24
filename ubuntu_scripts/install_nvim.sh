#!/bin/sh
sudo add-apt-repository ppa:neovim-ppa/stable
sudo apt-get update
sudo apt-get install -y neovim
mkdir $HOME/.config/nvim
cp ../init.vim ~/.config/nvim/
cp ../local_init.vim ~/.config/nvim/
cp ../ local_bundles.vim ~/.config/nvim/
nvim