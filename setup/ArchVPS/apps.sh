#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

echo "Installing VPS essential packages..."

# CLI tools - official repositories only for server installs.
install_pacman zoxide tmux bat lsd git-delta bash-completion jq \
    ctags lazygit ncurses zsh fzf \
    ripgrep eza tree

# Dev libraries
install_pacman openssl libffi libxml2 libxslt zlib cmake \
    python python-setuptools python-pipx \
    bind htop

# Compression
install_pacman unzip zip 7zip unrar

# Docker
install_pacman docker docker-compose

setup_nvim_dir
setup_bat_theme

echo "VPS essential packages installation completed."
