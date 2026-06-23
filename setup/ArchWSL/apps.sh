#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

echo "Installing WSL packages..."

# CLI tools - official repositories only for WSL installs.
install_pacman zoxide tmux bat lsd git-delta unclutter bash-completion jq \
    ctags lazygit ncurses zsh xclip fzf ffmpeg yt-dlp

# File system tools
install_pacman unrar zip 7zip ntfs-3g dosfstools \
    unace unzip sharutils uudeview arj cabextract

# Development
install_pacman python python-setuptools ripgrep neovim docker docker-compose \
    eza tree

setup_nvim_dir
setup_bat_theme
