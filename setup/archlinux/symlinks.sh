#!/bin/sh
set -e

echo "Symlinking dotfiles"

# zsh
# install oh-my-zsh and overwrite zsh file
ln -s $DOTFILES/config/zsh/zshrc $HOME/.zshrc

# neovim
# create .config folder and nvim folder
ln -s $DOTFILES/config/neovim/init.vim $HOME/.config/nvim/init.vim
ln -s $DOTFILES/config/neovim/local_init.vim $HOME/.config/nvim/local_init.vim
ln -s $DOTFILES/config/neovim/local_bundles.vim $HOME/.config/nvim/local_bundles.vim

# tmux
ln -s $DOTFILES/config/tmux/tmux.conf $HOME/.tmux.conf
tmux source $HOME/.tmux.conf
echo "Tmux is ok! "

# vim
ln -s $DOTFILES/config/vim/.vimrc $HOME/.vimrc
ln -s $DOTFILES/config/vim/.vimrc.local $HOME/.vimrc.local
ln -s $DOTFILES/config/vim/.vimrc.local.bundles $HOME/.vimrc.local.bundlesdebian

# git
ln -s $DOTFILES/config/git/.gitconfig $HOME/.gitconfig

# termite
ln -s $DOTFILES/termite/termite_config $HOME/.config/termite/config

# neovim
ln -s $DOTFILES/config/nvim/init.vim $HOME/.config/nvim/init.vim
ln -s $DOTFILES/config/nvim/local_init.vim $HOME/.config/nvim/local_init.vim
ln -s $DOTFILES/config/nvim/local_bundles.vim $HOME/.config/nvim/local_bundles.vim
