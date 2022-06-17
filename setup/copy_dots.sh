#!/bin/sh
set -e

echo "Copy dotfiles"
# zsh

mkdir -p "$HOME/.config/zsh"

# install oh-my-zsh and overwrite zsh file
cp "$DOTFILES/config/zsh/.zshrc" "$HOME/.zshrc"
cp "$DOTFILES/config/zsh/functions.zsh" "$HOME/.config/zsh/"
# tmux
cp "$DOTFILES/config/tmux/.tmux.conf" "$HOME/.tmux.conf"
cp "$DOTFILES/config/tmux/tmux-sessionizer" "$HOME/.local/bin/"

# git
cp "$DOTFILES/config/git/.gitconfig" "$HOME/.gitconfig"

# alacritty
mkdir -p "$HOME/.config/alacritty"
cp "$DOTFILES/config/alacritty.yml" "$HOME/.config/alacritty/"

cp -R "$DOTFILES/config/nvim" "$HOME/.config/"
