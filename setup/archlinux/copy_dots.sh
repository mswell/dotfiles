#!/bin/sh
set -e

echo "Copy dotfiles"
# zsh

# install oh-my-zsh and overwrite zsh file
cp "$DOTFILES/config/zsh/.zshrc" "$HOME/.zshrc"

# neovim
# create .config folder and nvim folder
mkdir -p "$HOME/.config/nvim"
cp "$DOTFILES/config/nvim/init.vim" "$HOME/.config/nvim/init.vim"

# tmux
cp "$DOTFILES/config/tmux/.tmux.conf" "$HOME/.tmux.conf"

# git
cp "$DOTFILES/config/git/.gitconfig" "$HOME/.gitconfig"

# alacritty
cp "$DOTFILES/config/alacritty.yml" "$HOME/.config/alacritty/alacritty.yml"
