#!/bin/sh
set -e

echo "Installing base development libraries"

# Update the system and install essential packages
sudo pacman -Syyu --noconfirm
sudo pacman -S --noconfirm --needed git base-devel

# Install yay (AUR helper)
if [ ! -d "yay" ]; then
  git clone https://aur.archlinux.org/yay.git
  cd yay
  makepkg --noconfirm -si
  cd ..
  rm -rf yay
fi

# Install additional packages
sudo pacman -S --noconfirm pipewire wireplumber pamixer brightnessctl
sudo pacman -S --noconfirm sddm && sudo systemctl enable sddm.service

# Install AUR packages
yay -S --sudoloop --noconfirm brave-bin kitty neovim tar
yay -Syu --noconfirm git lsb-release vim python-pip

echo "Base development libraries installation completed"
