#!/bin/sh
set -e

echo "Installing useful Apps"

# install useful desktop apps
pacaur -S --noconfirm --noedit google-chrome dropbox slack-desktop ttf-vista-fonts wps-office inkscape gimp etcher


# software from 'normal' repositories
pacaur -S --noconfirm --needed darktable dconf-editor tmux htop
pacaur -S --noconfirm --needed evince evolution filezilla firefox
pacaur -S --noconfirm --needed galculator geary gimp git gksu glances gnome-disk-utility
pacaur -S --noconfirm --needed gparted gpick grsync
pacaur -S --noconfirm --needed inkscape
pacaur -S --noconfirm --needed simple-scan simplescreenrecorder smplayer sysstat
pacaur -S --noconfirm --needed transmission-cli transmission-gtk
pacaur -S --noconfirm --needed variety vlc vnstat wget unclutter curl
echo "Install applications"
pacaur -S --noconfirm --needed papirus-icon-theme-git ctags ncurses python-pip zsh xclip autojump docker-compose docker tlp tlp-rdw ttf-dejavu gvim

sudo pip install virtualenvwrapper jedi ipython pylint pydocstyle pipenv

echo "Start TLP"
sudo tlp start

# installation of zippers and unzippers
pacaur -S --noconfirm --needed unace unrar zip unzip sharutils  uudeview  arj cabextract file-roller

