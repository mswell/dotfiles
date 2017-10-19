#!/bin/sh
sudo dnf install -y vim gvim ncurses-devel git ctags-etags curl python2-pip python3-pip
cp ../.vimrc ~/.vimrc
cp ../.vimrc.local ~/
cp ../.vimrc.local.bundles ~/
vim +PlugInstall +qall
