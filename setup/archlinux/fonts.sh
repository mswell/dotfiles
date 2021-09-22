#!/bin/sh

echo "Installing fonts"

paru -S $(pacman -Ss ttf | grep -v ^" " | awk '{print $1}') --noconfirm --needed && fc-cache
paru -S noto-fonts-emoji --noconfirm --needed
paru -S noto-fonts otf-font-awesome ttf-mononoki ttf-ubuntu-font-family--noconfirm --needed
paru -S ttf-droid --noconfirm --noconfirm --needed
paru -S ttf-inconsolata --noconfirm --needed
paru -S nerd-fonts-complete --needed
fc-cache -v
