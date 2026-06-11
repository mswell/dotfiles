#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"
source "${DOTFILES}/setup/lib/theme_orchestrator.sh"

# Hyprland packages
yay_packages="
    tmux
    qt5-wayland
    hyprland
    xdg-desktop-portal-hyprland
    xdg-desktop-portal-gtk
    xsettingsd
    mako
    waybar
    zoxide
    nwg-look
    qt5ct
    qt6ct
    kvantum
    qt6-wayland
    bat
    lsd
    wezterm
    cliphist
    wl-clipboard
    librewolf-bin
    obsidian
    proton-pass-bin
    pavucontrol
    git-delta
    vlc
    wget
    curl
    bash-completion
    ctags
    lazygit
    ncurses
    zsh
    autojump
    google-chrome
    meld
    discord
    openfortivpn
    fzf
    ghostty
    nautilus
    file-roller
    tumbler
    gvfs
    sushi
    papirus-icon-theme
    waypaper
    ffmpegthumbnailer
    poppler-glib
    gvfs-mtp
    gvfs-nfs
    gvfs-smb
    unrar
    zip
    p7zip
    ntfs-3g
    unzip
    python
    python-setuptools
    neovim
    ripgrep
    ast-grep
    docker
    docker-compose
    tree
    tofi
    hyprpicker
    hyprlock
    hypridle
    hyprswitch
    hyprpolkitagent
    wlogout
    grimblast
    jpegoptim
    optipng
    swappy
    brightnessctl
    pamixer
    wpaperd
    bibata-cursor-theme-bin
    rofi
    walker
    elephant
    elephant-desktopapplications
    elephant-providerlist
    elephant-websearch
    elephant-files
    elephant-calc
    elephant-clipboard
    libqalculate
    jq
"

echo "Installing Hyprland packages..."
install_yay $yay_packages

# File copies, chmod and initial theme apply now live in the shared manifest
# (setup/lib/dotfiles_manifest.sh) and run from setup/copy_dots.sh later in
# this same install flow. Re-running copy_dots.sh is the canonical "sync".

# Mask dunst so it doesn't compete with mako on D-Bus
systemctl --user mask dunst.service 2>/dev/null || true

setup_bat_theme
setup_nvim_dir

echo "Apps installation and configuration completed."
