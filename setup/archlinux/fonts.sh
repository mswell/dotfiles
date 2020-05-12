#!/bin/sh

echo "Installing fonts"

yay -S $(pacman -Ss ttf | grep -v ^" " | awk '{print $1}') --noconfirm --needed && fc-cache
yay -s noto-fonts-emoji --noconfirm --needed
yay -S noto-fonts --noconfirm --needed
yay -S ttf-droid --noconfirm --noconfirm --needed
yay -S ttf-inconsolata --noconfirm --needed
yay -S nerd-fonts-jetbrains-mono
fc-cache -v