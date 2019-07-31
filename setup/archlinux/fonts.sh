#!/bin/sh

echo "Installing fonts"

yay -S $(pacman -Ss ttf | grep -v ^" " | awk '{print $1}') --noconfirm --needed && fc-cache
yay -S noto-fonts nerd-fonts-complete --noconfirm --needed
yay -S ttf-droid --noconfirm --noconfirm --needed
yay -S ttf-inconsolata --noconfirm --needed

fc-cache -v