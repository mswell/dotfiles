#!/bin/sh

sudo pacman -S --needed base-devel
git clone https://aur.archlinux.org/paru.git
cd paru
makepkg -si

cd -
rm -rf paru

echo "Installing base-dev libs"
paru -Syu --noconfirm git vim python-pip
paru -Syu --noconfirm base devel
