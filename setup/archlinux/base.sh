#!/bin/sh

sudo pacman -S --needed base-devel

git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si
cd -
rm -rf yay

echo "Installing base-dev libs"
yay -Syu --noconfirm git vim python-pip
