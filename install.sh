#!/usr/bin/env bash

export EDITOR='vim'
export DOTFILES=$HOME/Projects/dotfiles

clear

Menu(){
    echo "#################################"
    echo "#                               #"
    echo "#        Mswell DotFiles        #"
    echo "#                               #"
    echo "#################################"
    echo
    echo "[1] - Debian like"
    echo "[2] - ArchLinux like"
    echo "[3] - OSX"
    echo "[4] - UbuntuServer"
    echo "[0] - Exit"
    echo
    echo -n "Choose your distro: "
    read option
    case $option in
        1) Debian ;;
        2) Archlinux ;;
        3) OSX ;;
        4) UbuntuServer ;;
        0) exit ;;
        *) "Unknown option :(" ; echo ; Menu ;;
    esac
}

Debian(){
    echo "Initializing setup :)"
    source setup/debian/setup.sh
}

Archlinux(){
    echo "Initializing setup :)"
    source setup/archlinux/setup.sh
}

OSX(){
    echo "Initializing setup :)"
    source setup/osx/setup.sh
}

UbuntuServer(){
    echo "Initializing setup :)"
    source setup/ubuntuServer/setup.sh
}
Menu
