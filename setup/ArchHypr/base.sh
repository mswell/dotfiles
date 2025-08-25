#!/bin/sh
set -e

echo "Installing base system and yay..."

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

echo "Base system installation completed."