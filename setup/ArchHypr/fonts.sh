#!/bin/sh

echo "Installing fonts"

yay -S noto-fonts-emoji --noconfirm --needed
yay -S noto-fonts otf-font-awesome ttf-ubuntu-font-family --noconfirm --needed
yay -S ttf-inconsolata otf-geist-mono --noconfirm --needed
yay -S ttf-hack ttf-iosevka-nerd --needed --noconfirm
yay -S ttf-fantasque-nerd ttf-jetbrains-mono-nerd --needed --noconfirm
fc-cache -v
