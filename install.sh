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

run_setup() {
    local script_path="$1"
    echo "Initializing setup :)"
    # Adicione uma verificação se o arquivo existe antes de tentar executá-lo
    if [[ -f "$DOTFILES/$script_path" ]]; then
        source "$DOTFILES/$script_path"
    else
        echo "${red}Error: Setup script not found at '$script_path'${reset}"
        exit 1
    fi
}

Menu() {
    while true; do
        echo "[1] - Ubuntu/Debian VPS"
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
            1) run_setup "setup/ubuntu/setup.sh"; break ;;
            2) run_setup "setup/ArchHypr/setup.sh"; break ;;
            3) run_setup "setup/install_hacktools.sh"; break ;;
            4) run_setup "setup/pyenv_install.sh"; break ;;
            5) run_setup "setup/ArchI3wm/setup.sh"; break ;;
            6) run_setup "setup/ArchWSL/setup.sh"; break ;;
            7) run_setup "setup/ArchDE/setup.sh"; break ;;
            0) exit 0 ;;
            *) echo "${red}Unknown option. Please try again.${reset}";;
        esac
    done
}

clear
Banner
Menu
