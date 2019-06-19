#!/bin/sh
set -e

echo "Installing useful Apps"

# install useful desktop apps
pacaur -S --noconfirm --noedit --needed termite inkscape 


# software from 'normal' repositories
pacaur -S --noconfirm --needed darktable dconf-editor tmux htop
pacaur -S --noconfirm --needed evince evolution evolution-ews pidgin pidgin-sipe
pacaur -S --noconfirm --needed gimp git
pacaur -S --noconfirm --needed gparted
pacaur -S --noconfirm --needed transmission-cli transmission-gtk
pacaur -S --noconfirm --needed vlc wget unclutter curl
echo "Install applications"
pacaur -S --noconfirm --needed ctags ncurses python-pip zsh xclip autojump docker-compose docker tlp tlp-rdw gvim

sudo pip install virtualenvwrapper jedi ipython pylint pydocstyle pipenv

mkdir -p $HOME/.config/termite

# installation of zippers and unzippers
pacaur -S --noconfirm --needed unace unrar zip unzip sharutils  uudeview  arj cabextract file-roller