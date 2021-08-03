#!/bin/sh
set -e

echo "Installing useful Apps"

# install useful desktop apps
paru -S --noconfirm --needed termite inkscape 


# software from 'normal' repositories
paru -S --noconfirm --needed dconf-editor tmux htop
paru -S --noconfirm --needed evince evolution evolution-ews pidgin
paru -S --noconfirm --needed gimp git lsd
paru -S --noconfirm --needed gparted
paru -S --noconfirm --needed transmission-cli transmission-gtk
paru -S --noconfirm --needed vlc wget unclutter curl
echo "Install applications"
paru -S --noconfirm --needed ctags ncurses zsh xclip autojump docker-compose docker tlp gvim

sudo pip install virtualenvwrapper jedi ipython pylint pydocstyle pipenv

mkdir -p $HOME/.config/alacritty

# installation of zippers and unzippers
paru -S --noconfirm --needed unace unrar zip unzip sharutils uudeview arj cabextract file-roller