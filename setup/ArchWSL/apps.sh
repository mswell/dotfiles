#!/bin/sh
set -e

export DOTFILES="$PWD"

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
yay -S --sudoloop --noconfirm npm tar
yay -Syu --noconfirm lsb-release vim python-pip neovim

echo "Base development libraries installation completed"

# Function to install packages with pacman
install_pacman() {
    sudo pacman -S --noconfirm "$@"
}

# Function to install packages with yay
install_yay() {
    yay -S --noconfirm --needed "$@"
}

install_pacman 

echo "Installing useful Apps"

# Software from 'normal' repositories
install_yay zoxide tmux bat lsd git-delta unclutter bash-completion
install_yay ctags lazygit ncurses zsh xclip autojump fzf
install_yay unrar zip p7zip ntfs-3g dosfstools

# Installation of zippers and unzippers
install_yay unace unrar zip unzip sharutils uudeview arj cabextract

# Install Python and Neovim dependencies
install_yay python python-setuptools

# Create Neovim configuration directory, if it doesn't exist
mkdir -p "$HOME/.config/nvim"

# Instala pacotes base para desenvolvimento
install_yay ripgrep unzip neovim docker docker-compose the_silver_searcher tree exa

# Bat config
mkdir -p "$(bat --config-dir)/themes"
wget -P "$(bat --config-dir)/themes" https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/sublime/tokyonight_night.tmTheme
bat cache --build

