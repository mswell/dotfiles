#!/bin/sh

echo "Installing fonts"

pacaur -S noto-fonts powerline-fonts ttf-ancient-fonts --noconfirm --needed
pacaur -S ttf-droid --noconfirm --noconfirm --needed
pacaur -S ttf-inconsolata --noconfirm --needed
pacaur -S nerd-fonts-complete --noconfirm --needed

mkdir -p ~/.local/share/fonts
cd ~/.local/share/fonts && curl -fLo "Droid Sans Mono for Powerline Nerd Font Complete.otf" https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/DroidSansMono/complete/Droid%20Sans%20Mono%20Nerd%20Font%20Complete.otf


fc-cache -v