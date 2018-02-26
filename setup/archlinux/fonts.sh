#!/bin/sh

echo "Installing fonts"

pacaur -S noto-fonts powerline-fonts ttf-ancient-fonts --noconfirm --needed
pacaur -S ttf-ubuntu-font-family --noconfirm --needed
pacaur -S ttf-droid --noconfirm --noconfirm --needed
pacaur -S ttf-inconsolata --noconfirm --needed

mkdir -p ~/.local/share/fonts
cd ~/.local/share/fonts && curl -fLo "Droid Sans Mono for Powerline Nerd Font Complete.otf" https://raw.githubusercontent.com/ryanoasis/nerd-fonts/master/patched-fonts/DroidSansMono/complete/Droid%20Sans%20Mono%20for%20Powerline%20Nerd%20Font%20Complete.otf

cd ~/.local/share/fonts && curl -fLo "Knack Regular Nerd Font Complete Mono.ttf" https://raw.githubusercontent.com/ryanoasis/nerd-fonts/master/patched-fonts/Hack/Regular/complete/Knack%20Regular%20Nerd%20Font%20Complete%20Mono.ttf

fc-cache -v