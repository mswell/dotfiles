#!/bin/sh
set -e


echo "Installing useful Apps"

# software from 'normal' repositories
yay -S --noconfirm --needed tmux htop
yay -S --noconfirm --needed git bat zsh lsd
yay -S --noconfirm --needed git-delta wget unclutter curl

echo "Install applications"
yay -S --noconfirm --needed ctags npm lazygit ncurses zsh xclip autojump fzf starship
  
sudo npm install -g neovim tree-sitter-cli --force

# installation of zippers and unzippers
yay -S --noconfirm --needed unace unrar zip unzip sharutils uudeview arj cabextract

# Bat config
mkdir -p "$(bat --config-dir)/themes"
wget -P "$(bat --config-dir)/themes" https://github.com/catppuccin/bat/raw/main/themes/Catppuccin%20Mocha.tmTheme
bat cache --build
