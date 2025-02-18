#!/bin/sh
set -e

# Function to install packages with pacman
install_pacman() {
  sudo pacman -S --noconfirm "$@"
}

# Function to install packages with yay
install_yay() {
  yay -S --noconfirm --needed "$@"
}

# Install fonts
echo "Installing fonts"
install_pacman ttf-cascadia-code-nerd ttf-cascadia-mono-nerd ttf-fira-code ttf-fira-mono ttf-fira-sans ttf-firacode-nerd ttf-iosevka-nerd ttf-iosevkaterm-nerd ttf-jetbrains-mono-nerd ttf-jetbrains-mono ttf-nerd-fonts-symbols ttf-nerd-fonts-symbols ttf-nerd-fonts-symbols-mono
install_yay noto-fonts-emoji
install_yay noto-fonts otf-font-awesome ttf-ubuntu-font-family
install_yay ttf-inconsolata otf-geist-mono
install_yay ttf-hack ttf-fantasque-nerd
fc-cache -v
