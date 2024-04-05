#!/bin/sh

echo "Installing fonts"

yay -S $(pacman -Ss ttf | grep -v ^" " | awk '{print $1}') --noconfirm --needed && fc-cache
yay -S noto-fonts-emoji --noconfirm --needed
yay -S noto-fonts otf-font-awesome ttf-ubuntu-font-family --noconfirm --needed
yay -S ttf-inconsolata --noconfirm --needed
yay -S ttf-hack ttf-iosevka-nerd --needed --noconfirm
yay -S ttf-fantasque-nerd --needed --noconfirm
fc-cache -v
