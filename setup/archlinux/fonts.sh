#!/bin/sh

echo "Installing fonts"

paru -S $(pacman -Ss ttf | grep -v ^" " | awk '{print $1}') --noconfirm --needed && fc-cache
paru -S noto-fonts-emoji --noconfirm --needed
paru -S noto-fonts otf-font-awesome nerd-fonts-mononoki ttf-ubuntu-font-family --noconfirm --needed
paru -S ttf-droid --noconfirm --noconfirm --needed
paru -S ttf-inconsolata --noconfirm --needed
paru -S ttf-hack --needed --noconfirm
curl -fLo "JetBrains Mono Regular Nerd Font Complete.otf" https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/JetBrainsMono/Ligatures/Regular/complete/JetBrains%20Mono%20Regular%20Nerd%20Font%20Complete%20Mono.ttf
curl -fLo "JetBrains Mono Bold Nerd Font Complete.otf" https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/JetBrainsMono/Ligatures/Bold/complete/JetBrains%20Mono%20Regular%20Nerd%20Font%20Complete%20Mono.ttf
curl -fLo "JetBrains Mono Italic Nerd Font Complete.otf" https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/JetBrainsMono/Ligatures/Italic/complete/JetBrains%20Mono%20Regular%20Nerd%20Font%20Complete%20Mono.ttf
fc-cache -v
