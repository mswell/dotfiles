#!/usr/bin/env bash
set -euo pipefail

export EDITOR='vim'
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
export DOTFILES=$SCRIPT_DIR

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
    while true; do
        echo "[1] - Ubuntu VPS"
        echo "[2] - Archlinux with Hyprland"
        echo "[3] - Install Hacktools"
        echo "[4] - Install Pyenv"
        echo "[5] - Archlinux with i3wm"
        echo "[6] - Archlinux WSL"
        echo "[7] - Archlinux DE"
        echo "[0] - Exit"
        echo
        echo -n "Choose your distro: "
        read -r option
        
        case $option in
            1) Ubuntu; break ;;
            2) ArchHypr; break ;;
            3) HackTools; break ;;
            4) Pyenv; break ;;
            5) ArchI3wm; break ;;
            6) ArchWSL; break ;;
            7) ArchDE; break ;;
            0) exit 0 ;;
            *) echo "${red}Unknown option. Please try again.${reset}";;
        esac
    done
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

ArchI3wm() {
    echo "Initializing setup :)"
    source setup/ArchI3wm/setup.sh
}

ArchWSL() {
    echo "Initializing setup :)"
    source setup/ArchWSL/setup.sh
}

HackTools() {
    echo "Initializing setup :)"
    source setup/install_hacktools.sh
}

ArchDE() {
    echo "Initializing setup :)"
    source setup/ArchDE/setup.sh
}

clear
Banner
Menu
