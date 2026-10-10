#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/homebrew.sh"

echo "${yellow}[+] Installing CLI tools...${reset}"
install_brew zoxide tmux bat lsd git-delta fzf ripgrep eza tree lazygit ctags htop neovim ffmpeg yt-dlp herdr

echo "${yellow}[+] Installing shell tools...${reset}"
install_brew zsh

echo "${yellow}[+] Installing herdr (agent multiplexer)...${reset}"
install_brew herdr

echo "${yellow}[+] Installing compression utilities...${reset}"
install_brew unzip

echo "${yellow}[+] Installing GUI applications...${reset}"
install_cask ghostty docker

setup_nvim_dir
setup_bat_theme

echo "${green}✓ macOS applications installed${reset}"
