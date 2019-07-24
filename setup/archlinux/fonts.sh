#!/bin/sh

echo "Installing fonts"

yay -S $(pacman -Ss ttf | grep -v ^" " | awk '{print $1}') --noconfirm --needed && fc-cache
yay -S noto-fonts powerline-fonts --noconfirm --needed
yay -S ttf-droid --noconfirm --noconfirm --needed
yay -S ttf-inconsolata --noconfirm --needed

mkdir -p ~/.local/share/fonts
cd ~/.local/share/fonts && curl -fLo "Droid Sans Mono for Powerline Nerd Font Complete.otf" https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/DroidSansMono/complete/Droid%20Sans%20Mono%20Nerd%20Font%20Complete.otf


fc-cache -v