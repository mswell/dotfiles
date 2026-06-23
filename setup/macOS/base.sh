#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/homebrew.sh"

brew_base_setup

echo "${yellow}[+] Installing base packages...${reset}"
install_brew git wget curl cmake go jq openssl@3
echo "${green}✓ Base packages installed${reset}"
