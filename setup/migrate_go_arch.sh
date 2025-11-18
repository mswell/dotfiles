#!/bin/sh
set -e

red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

echo "${yellow}========================================${reset}"
echo "${yellow}Go Migration Script for Arch Linux${reset}"
echo "${yellow}========================================${reset}"
echo ""
echo "This script will:"
echo "  1. Remove manual Go installation from /usr/local/go"
echo "  2. Install Go via pacman"
echo "  3. Clean up Go cache and modules"
echo "  4. Reinstall Go tools"
echo ""
echo "${red}WARNING: This will remove /usr/local/go and reinstall all Go tools${reset}"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "${yellow}[*] Migration cancelled${reset}"
    exit 0
fi

# Check if running on Arch Linux
if [ ! -f /etc/arch-release ]; then
    echo "${red}[!] This script is only for Arch Linux${reset}"
    exit 1
fi

echo ""
echo "${yellow}[1/5] Backing up Go environment info${reset}"
if command -v go &> /dev/null; then
    echo "Current Go version: $(go version)"
    echo "Current GOPATH: ${GOPATH:-$HOME/go}"

    # List installed Go tools
    if [ -d "$HOME/go/bin" ]; then
        echo ""
        echo "Installed Go tools in $HOME/go/bin:"
        ls -1 "$HOME/go/bin" | head -20
    fi
fi

echo ""
echo "${yellow}[2/5] Removing manual Go installation${reset}"
if [ -d "/usr/local/go" ]; then
    echo "Removing /usr/local/go..."
    sudo rm -rf /usr/local/go
    echo "${green}[+] Removed /usr/local/go${reset}"
else
    echo "${green}[+] No manual installation found in /usr/local/go${reset}"
fi

# Remove Go PATH from .profile if it exists
if [ -f "$HOME/.profile" ]; then
    if grep -q "/usr/local/go/bin" "$HOME/.profile"; then
        echo "Cleaning up $HOME/.profile..."
        sed -i '/\/usr\/local\/go\/bin/d' "$HOME/.profile"
        echo "${green}[+] Cleaned up .profile${reset}"
    fi
fi

echo ""
echo "${yellow}[3/5] Installing Go via pacman${reset}"
if pacman -Qi go &> /dev/null; then
    echo "${green}[+] Go is already installed via pacman${reset}"
else
    sudo pacman -S --noconfirm go
    echo "${green}[+] Installed Go via pacman${reset}"
fi

echo ""
echo "${yellow}[4/5] Verifying Go installation${reset}"
sleep 1
if command -v go &> /dev/null; then
    echo "${green}[+] Go is now available: $(which go)${reset}"
    echo "${green}[+] Go version: $(go version)${reset}"
else
    echo "${red}[!] Go installation failed. Please check manually.${reset}"
    exit 1
fi

echo ""
echo "${yellow}[5/5] Cleaning Go cache${reset}"
if [ -d "$HOME/go" ]; then
    # Backup go/bin if it exists
    if [ -d "$HOME/go/bin" ]; then
        echo "Backing up $HOME/go/bin to $HOME/go/bin.backup..."
        cp -r "$HOME/go/bin" "$HOME/go/bin.backup"
    fi

    echo "Cleaning Go module cache..."
    go clean -modcache 2>/dev/null || true
    echo "${green}[+] Go cache cleaned${reset}"
fi

echo ""
echo "${green}========================================${reset}"
echo "${green}Migration completed successfully!${reset}"
echo "${green}========================================${reset}"
echo ""
echo "Next steps:"
echo "  1. Close and reopen your terminal (or run: source ~/.zshrc)"
echo "  2. Verify Go works: ${yellow}go version${reset}"
echo "  3. Reinstall your Go tools:"
echo "     ${yellow}cd ~/Projects/dotfiles && ./install.sh${reset}"
echo "     Select option [3] to reinstall hacktools"
echo ""
echo "Your old Go tools were backed up to: ${yellow}$HOME/go/bin.backup${reset}"
echo ""
