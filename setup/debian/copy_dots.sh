#!/bin/sh
set -e

echo "Copy dotfiles"
# zsh

# install oh-my-zsh and overwrite zsh file
cp $DOTFILES/config/zsh/.zshrc $HOME/.zshrc

# neovim
# create .config folder and nvim folder
cp $DOTFILES/config/nvim/init.vim $HOME/.config/nvim/init.vim
cp $DOTFILES/config/nvim/local_init.vim $HOME/.config/nvim/local_init.vim
cp $DOTFILES/config/nvim/local_bundles.vim $HOME/.config/nvim/local_bundles.vim

# tmux
cp $DOTFILES/config/tmux/.tmux.conf $HOME/.tmux.conf

# vim
cp $DOTFILES/config/vim/.vimrc $HOME/.vimrc
cp $DOTFILES/config/vim/.vimrc.local $HOME/.vimrc.local
cp $DOTFILES/config/vim/.vimrc.local.bundles $HOME/.vimrc.local.bundles

# git
cp $DOTFILES/config/git/.gitconfig $HOME/.gitconfig
