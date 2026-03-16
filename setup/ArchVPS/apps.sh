#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

echo "Installing VPS essential packages..."

# CLI tools
install_yay zoxide tmux bat lsd git-delta bash-completion jq \
    ctags lazygit ncurses zsh autojump fzf \
    ripgrep the_silver_searcher tree exa

# Dev libraries
install_yay openssl libffi libxml2 libxslt zlib cmake \
    python python-setuptools python-pipx \
    bind htop

# Compression
install_yay unzip zip p7zip unrar

# Docker
install_yay docker docker-compose

setup_nvim_dir
setup_bat_theme

echo "VPS essential packages installation completed."
