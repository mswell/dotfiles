#!/bin/sh
sudo apt install -y vim-nox vim-gtk git exuberant-ctags ncurses-term silversearcher-ag curl python-pip python3-pip
cp ../.vimrc ~/.vimrc
cp ../.vimrc.local ~/
cp ../.vimrc.local.bundles ~/
vim +PlugInstall +qall