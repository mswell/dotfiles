#!/bin/sh
set -e

echo "Copy dotfiles"
# zsh

# install oh-my-zsh and overwrite zsh file
cp $DOTFILES/config/zsh/.zshrc $HOME/.zshrccp 
cp $DOTFILES/config/zsh/functions.zsh $HOME/.config/zsh/
# tmux
cp $DOTFILES/config/tmux/.tmux.conf $HOME/.tmux.conf

# git
cp $DOTFILES/config/git/.gitconfig $HOME/.gitconfig