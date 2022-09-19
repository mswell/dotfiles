#!/usr/bin/env bash

export EDITOR='vim'
export DOTFILES=$PWD

clear

Banner(){
echo "███▄ ▄███▓  ██████  █     █░▓█████  ██▓     ██▓              "
echo "▓██▒▀█▀ ██▒▒██    ▒ ▓█░ █ ░█░▓█   ▀ ▓██▒    ▓██▒             " 
echo "▓██    ▓██░░ ▓██▄   ▒█░ █ ░█ ▒███   ▒██░    ▒██░             "
echo "▒██    ▒██   ▒   ██▒░█░ █ ░█ ▒▓█  ▄ ▒██░    ▒██░             "
echo "▒██▒   ░██▒▒██████▒▒░░██▒██▓ ░▒████▒░██████▒░██████▒         "
echo "░ ▒░   ░  ░▒ ▒▓▒ ▒ ░░ ▓░▒ ▒  ░░ ▒░ ░░ ▒░▓  ░░ ▒░▓  ░         "
echo "░  ░      ░░ ░▒  ░ ░  ▒ ░ ░   ░ ░  ░░ ░ ▒  ░░ ░ ▒  ░         "
echo "░      ░   ░  ░  ░    ░   ░     ░     ░ ░     ░ ░            "
echo "       ░         ░      ░       ░  ░    ░  ░    ░  ░         "
echo " "
echo "▓█████▄  ▒█████  ▄▄▄█████▓  █████▒██▓ ██▓    ▓█████   ██████ "
echo "▒██▀ ██▌▒██▒  ██▒▓  ██▒ ▓▒▓██   ▒▓██▒▓██▒    ▓█   ▀ ▒██    ▒ "
echo "░██   █▌▒██░  ██▒▒ ▓██░ ▒░▒████ ░▒██▒▒██░    ▒███   ░ ▓██▄   "
echo "░▓█▄   ▌▒██   ██░░ ▓██▓ ░ ░▓█▒  ░░██░▒██░    ▒▓█  ▄   ▒   ██▒"
echo "░▒████▓ ░ ████▓▒░  ▒██▒ ░ ░▒█░   ░██░░██████▒░▒████▒▒██████▒▒"
echo " ▒▒▓  ▒ ░ ▒░▒░▒░   ▒ ░░    ▒ ░   ░▓  ░ ▒░▓  ░░░ ▒░ ░▒ ▒▓▒ ▒ ░"
echo " ░ ▒  ▒   ░ ▒ ▒░     ░     ░      ▒ ░░ ░ ▒  ░ ░ ░  ░░ ░▒  ░ ░"
echo " ░ ░  ░ ░ ░ ░ ▒    ░       ░ ░    ▒ ░  ░ ░      ░   ░  ░  ░  "
echo "   ░        ░ ░                   ░      ░  ░   ░  ░      ░  "
echo " ░                                                           "
echo " "
}

Menu(){
    #echo "#################################"
    #echo "#                               #"
    #echo "#        Mswell DotFiles        #"
    #echo "#                               #"
    #echo "#################################"
    #echo
    echo "[1] - Ubuntu like"
    echo "[2] - ArchLinux like"
    echo "[3] - OSX"
    echo "[0] - Exit"
    echo
    echo -n "Choose your distro: "
    read option
    case $option in
        1) Ubuntu ;;
        2) Archlinux ;;
        3) OSX ;;
        0) exit ;;
        *) "Unknown option" ; echo ; Menu ;;
    esac
}

Ubuntu(){
    echo "Initializing setup :)"
    source setup/ubuntu/setup.sh
}

Archlinux(){
    echo "Initializing setup :)"
    source setup/archlinux/setup.sh
}

OSX(){
    echo "Initializing setup :)"
    source setup/osx/setup.sh
}
Banner
Menu
