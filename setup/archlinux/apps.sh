#!/bin/sh
set -e


echo "Installing useful Apps"

# software from 'normal' repositories
paru -S --noconfirm --needed tmux htop
paru -S --noconfirm --needed git lsd alacritty
paru -S --noconfirm --needed shell-color-scripts
paru -S --noconfirm --needed git-delta vlc wget unclutter curl
echo "Install applications"
paru -S --noconfirm --needed ctags npm lazygit ncurses zsh xclip autojump 
  
sudo npm install -g neovim tree-sitter-cli --force
# sudo pip install virtualenvwrapper jedi ipython pylint pydocstyle pipenv

# installation of zippers and unzippers
paru -S --noconfirm --needed unace unrar zip unzip sharutils uudeview arj cabextract file-roller
