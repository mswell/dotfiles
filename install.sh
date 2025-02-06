#!/usr/bin/env bash

#-- constantes
export EDITOR='vim'
export DOTFILES=$PWD
#-- cores
export red=`tput setaf 1`
export green=`tput setaf 2`
export yellow=`tput setaf 3`
export reset=`tput sgr0`

#--- Funcoes
Banner(){
echo "🛸         🌎  °    🌓  •    .°•      🚀 ✯   "
echo "${green} __   __  _______  _     _  _______  ___      ___                   "
echo "|  |_|  ||       || | _ | ||       ||   |    |   |                  " 
echo "|       ||  _____|| || || ||    ___||   |    |   |                  "
echo "|       || |_____ |       ||   |___ |   |    |   |                  "
echo "|       ||_____  ||       ||    ___||   |___ |   |___              "
echo "| ||_|| | _____| ||   _   ||   |___ |       ||       |            "
echo "|_|   |_||_______||__| |__||_______||_______||_______|           "
echo " ______   _______  _______  _______  ___   ___      _______  _______ "
echo "|      | |       ||       ||       ||   | |   |    |       ||       |"
echo "|  _    ||   _   ||_     _||    ___||   | |   |    |    ___||  _____|"
echo "| | |   ||  | |  |  |   |  |   |___ |   | |   |    |   |___ | |_____"
echo "| |_|   ||  |_|  |  |   |  |    ___||   | |   |___ |    ___||_____  |"
echo "|       ||       |  |   |  |   |    |   | |       ||   |___  _____| |"
echo "|______| |_______|  |___|  |___|    |___| |_______||_______||_______|"
echo "      ★  *          °        🛰   °·      🪐    "
echo ".      •  ° ★  •  ☄                                             ${reset}"
echo "  "
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
    echo "[4] - Archlinux WSL"
    echo "[5] - Archlinux with Hyprland"
    echo "[0] - Exit"
    echo
    echo -n "Choose your distro: "
    read option
    case $option in
        1) Ubuntu ;;
        2) Archlinux ;;
        3) OSX ;;
        4) ArchWSL ;;
        5) ArchHypr ;;
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

ArchWSL(){
    echo "Initializing setup :)"
    source setup/archWSL/setup.sh
}

ArchHypr(){
    echo "Initializing setup :)"
    source setup/ArchHypr/setup.sh
}

OSX(){
    echo "Initializing setup :)"
    source setup/osx/setup.sh
}

#----- Inicio
clear
Banner
Menu
