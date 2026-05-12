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

# Configuration
echo "Copying configuration files..."
mkdir -p "$HOME/.config/hypr" && cp -r "$DOTFILES/config/hypr" "$HOME/.config/"
mkdir -p "$HOME/.config/kitty" && cp -r "$DOTFILES/config/kitty" "$HOME/.config/"
mkdir -p "$HOME/.config/mako" && cp "$DOTFILES/config/mako/config" "$HOME/.config/mako/"
mkdir -p "$HOME/.config/walker" && cp -r "$DOTFILES/config/walker/." "$HOME/.config/walker/"
cp -r "$DOTFILES/config/wpaperd" "$HOME/.config/"
cp -r "$DOTFILES/config/waybar" "$HOME/.config/"
cp -r "$DOTFILES/config/tofi" "$HOME/.config/"
mkdir -p "$HOME/.config/backgrounds" && cp -r "$DOTFILES/config/backgrounds/." "$HOME/.config/backgrounds/"
cp -r "$DOTFILES/config/hypr/backgrounds/vantablack" "$HOME/.config/backgrounds/"
cp -r "$DOTFILES/config/hypr/backgrounds/white" "$HOME/.config/backgrounds/"
cp -r "$DOTFILES/config/hypr/backgrounds/tokyonight" "$HOME/.config/backgrounds/"
mkdir -p "$HOME/Pictures/backgrounds" && cp -r "$DOTFILES/config/backgrounds/." "$HOME/Pictures/backgrounds/"
mkdir -p "$HOME/.config/waypaper" && cp "$DOTFILES/config/waypaper/config.ini" "$HOME/.config/waypaper/"

# Neovim — LazyVim base + Omarchy-style theme integration
mkdir -p "$HOME/.config/nvim" && cp -r "$DOTFILES/config/nvim/." "$HOME/.config/nvim/"

# Theme system — copy assets, then let the shared orchestrator create initial state.
mkdir -p "$HOME/.config/hypr/themes" "$HOME/.config/kitty/themes" "$HOME/.config/waybar/themes"
mkdir -p "$HOME/.config/rofi/colors" "$HOME/.config/rofi/launchers/type-2/shared" "$HOME/.config/rofi/launchers/type-3/shared"
cp -r "$DOTFILES/config/rofi/colors/"* "$HOME/.config/rofi/colors/"
cp -r "$DOTFILES/config/rofi/launchers/"* "$HOME/.config/rofi/launchers/"
mkdir -p "$HOME/.config/tmux/themes"
cp -r "$DOTFILES/config/tmux/themes/." "$HOME/.config/tmux/themes/"
mkdir -p "$HOME/.config/fzf/themes"
cp -r "$DOTFILES/config/fzf/themes/." "$HOME/.config/fzf/themes/"
mkdir -p "$HOME/.config/zsh/themes"
cp -r "$DOTFILES/config/zsh/themes/." "$HOME/.config/zsh/themes/"
mkdir -p "$HOME/.config/Kvantum/themes"
cp -r "$DOTFILES/config/Kvantum/." "$HOME/.config/Kvantum/"
chmod +x "$HOME/.config/hypr/scripts/theme-switch.sh"
chmod +x "$HOME/.config/hypr/scripts/bg-set.sh"
chmod +x "$HOME/.config/hypr/scripts/wpaperd-set.sh"
chmod +x "$HOME/.config/hypr/scripts/power-menu.sh"
chmod +x "$HOME/.config/hypr/scripts/screenshot-area.sh"

theme_apply "${DOTFILES_DEFAULT_THEME:-vantablack}"

# Mask dunst so it doesn't compete with mako on D-Bus
systemctl --user mask dunst.service 2>/dev/null || true

setup_bat_theme
setup_nvim_dir

echo "Apps installation and configuration completed."
