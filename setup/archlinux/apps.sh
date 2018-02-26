#!/bin/sh
set -e

echo "Installing useful Apps"

# install useful desktop apps
pacaur -S --noconfirm --noedit google-chrome dropbox slack-desktop spotify skypeforlinux-bin insomnia franz-bin wine ttf-vista-fonts wps-office steam-native-runtime inkscape gimp etcher

# Thanks to : Erik Dubois at http://www.erikdubois.be
# https://github.com/erikdubois/Antergosi3

# software from 'normal' repositories
pacaur -S --noconfirm --needed archey3 baobab bleachbit catfish clementine conky curl termite
pacaur -S --noconfirm --needed darktable dconf-editor tmux
pacaur -S --noconfirm --needed dmidecode
pacaur -S --noconfirm --needed evince evolution filezilla firefox
pacaur -S --noconfirm --needed galculator geary gimp git gksu glances gnome-disk-utility
pacaur -S --noconfirm --needed gparted gpick grsync
pacaur -S --noconfirm --needed hardinfo hddtemp hexchat htop
pacaur -S --noconfirm --needed inkscape inxi lm_sensors lsb-release meld mlocate mpv
pacaur -S --noconfirm --needed nemo net-tools notify-osd numlockx openshot pinta plank polkit-gnome
pacaur -S --noconfirm --needed redshift sane screenfetch scrot shotwell
pacaur -S --noconfirm --needed simple-scan simplescreenrecorder smplayer sysstat
pacaur -S --noconfirm --needed thunar transmission-cli transmission-gtk tumbler
pacaur -S --noconfirm --needed variety vlc vnstat wget unclutter
echo "Install applications"
pacaur -S --noconfirm --needed papirus-icon-theme-git ctags ncurses python-pip zsh xclip autojump docker-compose docker tlp tlp-rdw ttf-dejavu gvim xfce4-clipman-plugin

sudo pip install virtualenvwrapper flake8-bugbear jedi ipython  bandit pylint pydocstyle pipenv radon

sudo systemctl enable vnstat
sudo systemctl start vnstat

echo "Start TLP"
sudo tlp start

echo "Start and enable docker"
systemctl start docker
systemctl enable docker
sudo usermod -aG docker $USER

# installation of zippers and unzippers
pacaur -S --noconfirm --needed unace unrar zip unzip sharutils  uudeview  arj cabextract file-roller

