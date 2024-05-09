#!/bin/sh
set -e


echo "Installing useful Apps"

# software from 'normal' repositories
yay -S --noconfirm --needed tmux htop
yay -S --noconfirm --needed git lsd alacritty wezterm
yay -S --noconfirm --needed shell-color-scripts
yay -S --noconfirm --needed git-delta vlc wget unclutter curl
echo "Install applications"
yay -S --noconfirm --needed ctags npm lazygit ncurses zsh xclip autojump 
  
sudo npm install -g neovim tree-sitter-cli --force

# installation of zippers and unzippers
yay -S --noconfirm --needed unace unrar zip unzip sharutils uudeview arj cabextract file-roller
