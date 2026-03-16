#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/common.sh"

# Guard: prevent re-sourcing
[ "${_ARCH_SH_LOADED:-}" = "1" ] && return 0
_ARCH_SH_LOADED=1

install_pacman() { sudo pacman -S --noconfirm --needed "$@"; }
install_yay() { yay -S --noconfirm --needed "$@"; }

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

setup_bat_theme() {
    echo "${yellow}[+] Configuring bat Tokyo Night theme...${reset}"
    mkdir -p "$(bat --config-dir)/themes"
    wget -P "$(bat --config-dir)/themes" \
        https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/sublime/tokyonight_night.tmTheme
    bat cache --build
}

setup_nvim_dir() { mkdir -p "$HOME/.config/nvim"; }

# Shared fonts (Hypr and I3wm use identical lists)
OFFICIAL_FONTS=(
    ttf-cascadia-code-nerd ttf-cascadia-mono-nerd ttf-fira-code
    ttf-fira-mono ttf-fira-sans ttf-firacode-nerd ttf-iosevka-nerd
    ttf-iosevkaterm-nerd ttf-jetbrains-mono-nerd ttf-jetbrains-mono
    ttf-nerd-fonts-symbols ttf-nerd-fonts-symbols-mono
)
AUR_FONTS=(
    noto-fonts-emoji noto-fonts otf-font-awesome ttf-ubuntu-font-family
    ttf-inconsolata otf-geist-mono ttf-hack ttf-fantasque-nerd
)

install_fonts() {
    echo "${yellow}[+] Installing fonts...${reset}"
    install_pacman "${OFFICIAL_FONTS[@]}"
    install_yay "${AUR_FONTS[@]}"
    fc-cache -v
}
