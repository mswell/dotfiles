#!/bin/sh
cp ../.vimrc ~/.vimrc
cp ../.vimrc.local ~/
cp ../.vimrc.local.bundles ~/
vim +PlugInstall +qall
