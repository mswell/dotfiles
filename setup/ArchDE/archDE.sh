#!/bin/sh
set -e

echo "Installing base development libraries"

# Update the system and install essential packages
sudo pacman -Syyu --noconfirm
sudo pacman -S --noconfirm --needed curl wget git base-devel go

# Install yay (AUR helper)
if [ ! -d "yay" ]; then
    git clone https://aur.archlinux.org/yay.git
    cd yay
    makepkg --noconfirm -si
    cd ..
    rm -rf yay
fi

# Install AUR packages
yay -S --sudoloop --noconfirm npm wezterm ghostty neovim tar
yay -Syu --noconfirm lsb-release vim python-pip neovim

echo "Base development libraries installation completed"

export DOTFILES="$PWD"

# Function to install packages with pacman
install_pacman() {
    sudo pacman -S --noconfirm "$@"
}

# Function to install packages with yay
install_yay() {
    yay -S --noconfirm --needed "$@"
}

# Software from 'normal' repositories
install_yay mousepad zoxide tmux bat lsd librewolf-bin obsidian
install_yay git-delta vlc unclutter bash-completion
install_yay ctags lazygit ncurses zsh xclip autojump google-chrome
install_yay meld discord openfortivpn fzf

# Installation of zippers and unzippers
install_yay unace unrar zip unzip sharutils uudeview arj cabextract p7zip

# Install Python and Neovim dependencies
install_yay python python-setuptools neovim

# Create Neovim configuration directory, if it doesn't exist
mkdir -p "$HOME/.config/nvim"

# Instala pacotes base para desenvolvimento
install_yay ripgrep docker docker-compose the_silver_searcher tree exa

# Bat config
mkdir -p "$(bat --config-dir)/themes"
wget -P "$(bat --config-dir)/themes" https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/sublime/tokyonight_night.tmTheme
bat cache --build

# Instalação de temas
echo "Installing themes"
install_yay kvantum-theme-catppuccin-git
install_pacman qt5ct qt6ct kvantum
