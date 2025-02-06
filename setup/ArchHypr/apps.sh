#!/bin/sh
set -e


echo "Installing useful Apps"

# software from 'normal' repositories
yay -S --noconfirm --needed tmux htop redshift
yay -S --noconfirm --needed git bat lsd wezterm
yay -S --noconfirm --needed git-delta vlc wget unclutter curl
echo "Install applications"
yay -S --noconfirm --needed ctags lazygit ncurses zsh xclip autojump 
yay -S --noconfirm --needed meld discord openfortivpn fzf dunst
  
# installation of zippers and unzippers
yay -S --noconfirm --needed unace unrar zip unzip sharutils uudeview arj cabextract

# Bat config
mkdir -p "$(bat --config-dir)/themes"
wget -P "$(bat --config-dir)/themes" https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/sublime/tokyonight_night.tmTheme
bat cache --build
