#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/common.sh"

# Guard: prevent re-sourcing
[ "${_HOMEBREW_SH_LOADED:-}" = "1" ] && return 0
_HOMEBREW_SH_LOADED=1

install_brew() { brew install --quiet "$@"; }

install_cask() {
    local cask
    for cask in "$@"; do
        if brew list --cask "$cask" &>/dev/null 2>&1; then
            echo "${yellow}[*] Already installed (cask): $cask${reset}"
        else
            # --adopt handles apps already present at /Applications but not managed by brew
            brew install --cask --quiet --adopt "$cask" \
                || echo "${yellow}[*] Skipping $cask — already exists, install manually if needed${reset}"
        fi
    done
}

ensure_xcode_clt() {
    if xcode-select -p &>/dev/null; then
        echo "${green}✓ Xcode Command Line Tools already installed${reset}"
        return 0
    fi
    echo "${yellow}[+] Installing Xcode Command Line Tools...${reset}"
    echo "${yellow}[*] A dialog may appear — click Install and wait for it to finish.${reset}"
    xcode-select --install 2>/dev/null || true
    until xcode-select -p &>/dev/null; do
        sleep 5
    done
    echo "${green}✓ Xcode Command Line Tools installed${reset}"
}

ensure_homebrew() {
    if command -v brew &>/dev/null; then
        echo "${green}✓ Homebrew already installed${reset}"
        return 0
    fi
    echo "${yellow}[+] Installing Homebrew...${reset}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Activate brew for the current session (handles Apple Silicon and Intel)
    if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -f /usr/local/bin/brew ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    echo "${green}✓ Homebrew installed${reset}"
}

brew_base_setup() {
    ensure_xcode_clt
    ensure_homebrew
    echo "${yellow}[+] Updating Homebrew...${reset}"
    brew update --quiet
    echo "${green}✓ Homebrew up to date${reset}"
}
