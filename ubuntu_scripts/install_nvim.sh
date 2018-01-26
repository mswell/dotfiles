#!/bin/sh
sudo pip install neovim
mkdir $HOME/.config/nvim
cp ../init.vim ~/.config/nvim/
cp ../local_init.vim ~/.config/nvim/
cp ../ local_bundles.vim ~/.config/nvim/
nvim