#!/bin/sh
set -e

echo "Installing useful Apps"

# install useful desktop apps
yay -S --noconfirm --needed termite inkscape 


# software from 'normal' repositories
yay -S --noconfirm --needed darktable dconf-editor tmux htop
yay -S --noconfirm --needed evince evolution evolution-ews pidgin pidgin-sipe
yay -S --noconfirm --needed gimp git
yay -S --noconfirm --needed gparted
yay -S --noconfirm --needed transmission-cli transmission-gtk
yay -S --noconfirm --needed vlc wget unclutter curl
echo "Install applications"
yay -S --noconfirm --needed ctags ncurses zsh xclip autojump docker-compose docker tlp gvim

sudo pip install virtualenvwrapper jedi ipython pylint pydocstyle pipenv

mkdir -p $HOME/.config/termite

# installation of zippers and unzippers
yay -S --noconfirm --needed unace unrar zip unzip sharutils uudeview arj cabextract file-roller