#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/common.sh"

# Guard: prevent re-sourcing
[ "${_ARCH_SH_LOADED:-}" = "1" ] && return 0
_ARCH_SH_LOADED=1

install_pacman() { sudo pacman -S --noconfirm --needed "$@"; }
# AUR installs stay interactive so PKGBUILD/diff prompts are not skipped.
install_yay() { yay -S --needed "$@"; }

ensure_yay() {
    command -v yay &>/dev/null && return 0
    echo "${yellow}[+] Installing yay...${reset}"
    local tmp_dir=$(mktemp -d)
    git clone https://aur.archlinux.org/yay.git "$tmp_dir/yay"
    (cd "$tmp_dir/yay" && makepkg --noconfirm -si)
    rm -rf "$tmp_dir"
}

arch_base_setup() {
    echo "${yellow}[+] Updating system and installing base packages...${reset}"
    sudo pacman -Syyu --noconfirm
    install_pacman curl wget git base-devel go
    ensure_yay
}


# Shared fonts (Hypr and I3wm use identical lists)
OFFICIAL_FONTS=(
    noto-fonts noto-fonts-emoji otf-font-awesome
    ttf-cascadia-code-nerd ttf-cascadia-mono-nerd ttf-fantasque-nerd
    ttf-fira-code ttf-fira-mono ttf-fira-sans ttf-firacode-nerd
    ttf-hack ttf-inconsolata ttf-iosevka-nerd ttf-iosevkaterm-nerd
    ttf-jetbrains-mono ttf-jetbrains-mono-nerd
    ttf-nerd-fonts-symbols ttf-nerd-fonts-symbols-mono
    ttf-ubuntu-font-family
)
AUR_FONTS=(
    otf-geist-mono
)

install_fonts() {
    echo "${yellow}[+] Installing fonts...${reset}"
    install_pacman "${OFFICIAL_FONTS[@]}"
    install_yay "${AUR_FONTS[@]}"
    fc-cache -v
}
