#!/bin/sh
sudo apt install tmux
sleep 1
git clone https://github.com/tmux-plugins/tpm $HOME/.tmux/plugins/tpm
cp ../.tmux.conf $HOME/
cd ~
tmux source $HOME/.tmux.conf
echo "Tmux is ok! "
