#!/bin/bash
set -e

# --- Font Lists ---

official_fonts=(
    ttf-cascadia-code-nerd
    ttf-cascadia-mono-nerd
    ttf-fira-code
    ttf-fira-mono
    ttf-fira-sans
    ttf-firacode-nerd
    ttf-iosevka-nerd
    ttf-iosevkaterm-nerd
    ttf-jetbrains-mono-nerd
    ttf-jetbrains-mono
    ttf-nerd-fonts-symbols
    ttf-nerd-fonts-symbols-mono
)

aur_fonts=(
    noto-fonts-emoji
    noto-fonts
    otf-font-awesome
    ttf-ubuntu-font-family
    ttf-inconsolata
    otf-geist-mono
    ttf-hack
    ttf-fantasque-nerd
)

# --- Installation ---

echo "Installing fonts from official repositories..."
sudo pacman -S --noconfirm --needed "${official_fonts[@]}"

echo "Installing fonts from AUR..."
yay -S --noconfirm --needed "${aur_fonts[@]}"

# Update font cache
echo "Updating font cache..."
fc-cache -v