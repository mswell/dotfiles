#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"
source "${DOTFILES}/setup/lib/theme_orchestrator.sh"

# Prefer official repositories. Keep AUR packages explicit so they are easier to audit.
official_packages=(
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
    obsidian
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
    ffmpegthumbnailer
    poppler-glib
    gvfs-mtp
    gvfs-nfs
    gvfs-smb
    unrar
    zip
    7zip
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
    hyprpicker
    hyprlock
    hypridle
    hyprpolkitagent
    jpegoptim
    optipng
    swappy
    brightnessctl
    pamixer
    wpaperd
    rofi
    libqalculate
    jq
)

aur_packages=(
    bibata-cursor-theme-bin
    elephant
    elephant-desktopapplications
    elephant-providerlist
    elephant-websearch
    elephant-files
    elephant-calc
    elephant-clipboard
    google-chrome
    grimblast-git
    hyprswitch
    librewolf-bin
    otf-geist-mono
    tofi
    walker
    waypaper
    wlogout
)

# proton-pass-bin is intentionally not installed automatically: it is a sensitive
# password-manager package and should be reviewed/installed manually if desired.

if ((${#official_packages[@]})); then
    echo "Installing Hyprland official packages..."
    install_pacman "${official_packages[@]}"
fi

if ((${#aur_packages[@]})); then
    echo "Installing Hyprland AUR packages..."
    install_yay "${aur_packages[@]}"
fi

# File copies, chmod and initial theme apply now live in the shared manifest
# (setup/lib/dotfiles_manifest.sh) and run from setup/copy_dots.sh later in
# this same install flow. Re-running copy_dots.sh is the canonical "sync".

# Mask dunst so it doesn't compete with mako on D-Bus
systemctl --user mask dunst.service 2>/dev/null || true

setup_bat_theme
setup_nvim_dir

echo "Apps installation and configuration completed."
