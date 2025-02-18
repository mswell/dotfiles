#!/bin/sh
set -e

echo "Installing base development libraries"

# Update the system and install essential packages
sudo pacman -Syyu --noconfirm
sudo pacman -S --noconfirm --needed curl wget git base-devel

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
