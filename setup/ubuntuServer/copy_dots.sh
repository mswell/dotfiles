#!/bin/sh
set -e

echo "Copy dotfiles"
# zsh

# install oh-my-zsh and overwrite zsh file
mkdir $HOME/.config/zsh
cp $DOTFILES/config/zsh/.zshrc $HOME/.zshrc
cp $DOTFILES/config/zsh/functions.zsh $HOME/.config/zsh/

# tmux
cp $DOTFILES/config/tmux/.tmux.conf $HOME/.tmux.conf

cp $DOTFILES/config/git/.gitconfig $HOME/.gitconfig
