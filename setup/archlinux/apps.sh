#!/bin/sh
set -e


echo "Installing useful Apps"

# software from 'normal' repositories
yay -S --noconfirm --needed tmux htop redshift
yay -S --noconfirm --needed git bat lsd alacritty wezterm
yay -S --noconfirm --needed shell-color-scripts
yay -S --noconfirm --needed git-delta vlc wget unclutter curl
echo "Install applications"
yay -S --noconfirm --needed ctags npm lazygit ncurses zsh xclip autojump 
yay -S --noconfirm --needed catppuccin-gtk-theme-mocha catppuccin-cursors-mocha 
yay -S --noconfirm --needed meld discord flameshot volumeicon ticktick openfortivpn polkit-gnome fzf rofi dunst
  
sudo npm install -g neovim tree-sitter-cli --force

# installation of zippers and unzippers
yay -S --noconfirm --needed unace unrar zip unzip sharutils uudeview arj cabextract

# Bat config
mkdir -p "$(bat --config-dir)/themes"
wget -P "$(bat --config-dir)/themes" https://raw.githubusercontent.com/scottmckendry/cyberdream.nvim/main/extras/textmate/cyberdream.tmTheme
bat cache --build
