#!/bin/sh
echo "Install BREW"
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
mkdir -p ~/.config/tmux
mkdir ~/.config/zsh
mkdir ~/.config/alacritty