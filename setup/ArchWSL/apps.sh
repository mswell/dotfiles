#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

echo "Installing WSL packages..."

# CLI tools
install_yay zoxide tmux bat lsd git-delta unclutter bash-completion jq \
    ctags lazygit ncurses zsh xclip autojump fzf

# File system tools
install_yay unrar zip p7zip ntfs-3g dosfstools \
    unace unzip sharutils uudeview arj cabextract

# Development
install_yay python python-setuptools ripgrep neovim docker docker-compose \
    the_silver_searcher tree exa

setup_nvim_dir
setup_bat_theme
