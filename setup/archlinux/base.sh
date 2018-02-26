#!/bin/sh
# Antergos base config

# in case pure Arch read about how install pacaur: https://www.ostechnix.com/install-pacaur-arch-linux/
# install pacaur

echo "Using Pacaur as Arch package manager"
sudo pacman -Syu --noconfirm pacaur

echo "Installing base-dev libs"
sudo pacman -Syu --noconfirm git vim
sudo pacman -Syu --noconfirm base-devel