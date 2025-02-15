#!/usr/bin/env bash

export EDITOR='vim'
export DOTFILES=$PWD

export red=$(tput setaf 1)
export green=$(tput setaf 2)
export yellow=$(tput setaf 3)
export reset=$(tput sgr0)

#--- Funcoes
Banner() {
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

Menu() {
    echo "[1] - Ubuntu VPS"
    echo "[2] - Archlinux with Hyprland"
    echo "[3] - Install Hacktools"
    echo "[4] - Install Pyenv"
    echo "[0] - Exit"
    echo
    echo -n "Choose your distro: "
    read -r option
    case $option in
    1) Ubuntu ;;
    2) ArchHypr ;;
    3) HackTools ;;
    4) Pyenv ;;
    0) exit ;;
    *)
        echo "Unknown option"
        echo
        Menu
        ;;
    esac
}

Ubuntu() {
    echo "Initializing setup :)"
    source setup/ubuntu/setup.sh
}

Pyenv() {
    echo "Initializing setup :)"
    source setup/pyenv_install.sh
}

ArchHypr() {
    echo "Initializing setup :)"
    source setup/ArchHypr/setup.sh
}

HackTools() {
    echo "Initializing setup :)"
    source setup/install_hacktools.sh
}

clear
Banner
Menu
