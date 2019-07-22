#!/bin/sh
# Antergos base config

# in case pure Arch read about how install yay: https://www.ostechnix.com/install-yay-arch-linux/
# install yay

echo "Installing base-dev libs"
sudo pacman -Syu --noconfirm git gvim
sudo pacman -Syu --noconfirm base-devel