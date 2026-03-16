#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

echo "Installing desktop environment packages..."

# Desktop apps
install_yay mousepad zoxide tmux bat lsd librewolf-bin obsidian jq \
    git-delta vlc unclutter bash-completion ctags lazygit ncurses \
    zsh xclip autojump google-chrome meld discord openfortivpn fzf

# Compression
install_yay unace unrar zip unzip sharutils uudeview arj cabextract p7zip

# Development
install_yay python python-setuptools neovim ripgrep docker docker-compose \
    the_silver_searcher tree exa

setup_nvim_dir
setup_bat_theme

# Themes
echo "Installing themes..."
install_yay kvantum-theme-catppuccin-git
install_pacman qt5ct qt6ct kvantum
