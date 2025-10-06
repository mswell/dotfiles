#!/usr/bin/env bash
set -euo pipefail

export EDITOR='vim'
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
export DOTFILES=$SCRIPT_DIR

# Set TERM if not defined (for Docker/minimal environments)
export TERM="${TERM:-xterm}"

# Colors with fallback if tput fails
export red=$(tput setaf 1 2>/dev/null || echo "")
export green=$(tput setaf 2 2>/dev/null || echo "")
export yellow=$(tput setaf 3 2>/dev/null || echo "")
export blue=$(tput setaf 4 2>/dev/null || echo "")
export reset=$(tput sgr0 2>/dev/null || echo "")

# Source logging and validation libraries
source "$DOTFILES/setup/lib/logging.sh"
source "$DOTFILES/setup/lib/preflight.sh"

# Enable error trapping for better logging
trap_errors

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
    local script_name=$(basename "$script_path")

    log_step "Starting setup: $script_name"
    log_info "Script path: $script_path"

    # Check if script exists
    if [[ ! -f "$DOTFILES/$script_path" ]]; then
        log_error "Setup script not found: $script_path"
        log_summary "FAILED" "Script not found: $script_path"
        exit 1
    fi

    # Execute setup script
    if source "$DOTFILES/$script_path"; then
        log_info "Setup completed: $script_name"
        log_summary "COMPLETED" "$script_name"
    else
        log_error "Setup failed: $script_name"
        log_summary "FAILED" "$script_name"
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

log_info "========================================="
log_info "  Dotfiles Installation System Started"
log_info "========================================="
log_info "Installation log: $LOG_FILE"
echo ""

# Run pre-flight checks before showing menu
log_step "System Validation"
if ! run_preflight_checks; then
    echo ""
    log_error "Pre-flight checks failed!"
    log_summary "FAILED" "System validation checks did not pass"
    exit 1
fi

Menu
