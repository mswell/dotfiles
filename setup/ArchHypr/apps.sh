#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

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
    gruvbox-material-gtk-theme-git
    bibata-cursor-gruvbox-git
    kvantum-theme-gruvbox-git
    rofi
    walker
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
mkdir -p "$HOME/Pictures/backgrounds" && cp -r "$DOTFILES/config/backgrounds/." "$HOME/Pictures/backgrounds/"
mkdir -p "$HOME/.config/wlogout/themes"
cp "$DOTFILES/config/wlogout/layout" "$HOME/.config/wlogout/"
cp "$DOTFILES/config/wlogout/vantablack.css" "$HOME/.config/wlogout/themes/"
cp "$DOTFILES/config/wlogout/white.css" "$HOME/.config/wlogout/themes/"
mkdir -p "$HOME/.config/waypaper" && cp "$DOTFILES/config/waypaper/config.ini" "$HOME/.config/waypaper/"

# Theme system — create initial symlinks (default: vantablack)
mkdir -p "$HOME/.config/hypr/themes" "$HOME/.config/kitty/themes" "$HOME/.config/waybar/themes"
ln -sf "$HOME/.config/hypr/themes/vantablack.conf" "$HOME/.config/hypr/colors.conf"
ln -sf "$HOME/.config/kitty/themes/vantablack.conf" "$HOME/.config/kitty/current-theme.conf"
ln -sf "$HOME/.config/waybar/themes/vantablack.css" "$HOME/.config/waybar/themes/current.css"
ln -sf "$HOME/.config/rofi/colors/vantablack.rasi" "$HOME/.config/rofi/colors/current.rasi"
ln -sf "$HOME/.config/wlogout/themes/vantablack.css" "$HOME/.config/wlogout/style.css"
mkdir -p "$HOME/.config/tmux/themes"
cp -r "$DOTFILES/config/tmux/themes/." "$HOME/.config/tmux/themes/"
ln -sf "$HOME/.config/tmux/themes/vantablack.conf" "$HOME/.config/tmux/current-theme.conf"
mkdir -p "$HOME/.config/fzf/themes"
cp -r "$DOTFILES/config/fzf/themes/." "$HOME/.config/fzf/themes/"
ln -sf "$HOME/.config/fzf/themes/vantablack.sh" "$HOME/.config/fzf/current-theme.sh"
echo "vantablack" > "$HOME/.config/hypr/current-theme"
chmod +x "$HOME/.config/hypr/scripts/theme-switch.sh"
chmod +x "$HOME/.config/hypr/scripts/bg-set.sh"

mkdir -p "$HOME/.config/rofi/colors"
mkdir -p "$HOME/.config/rofi/launchers/type-2/shared"
mkdir -p "$HOME/.config/rofi/launchers/type-3/shared"
cp -r "$DOTFILES/config/rofi/colors/"* "$HOME/.config/rofi/colors/"
cp -r "$DOTFILES/config/rofi/launchers/"* "$HOME/.config/rofi/launchers/"

mkdir -p "$HOME/.config/gtk-3.0"
mkdir -p "$HOME/.config/gtk-4.0"
mkdir -p "$HOME/.config/Kvantum"
cp "$DOTFILES/config/gtk-3.0/settings.ini" "$HOME/.config/gtk-3.0/"
cp "$DOTFILES/config/gtk-4.0/settings.ini" "$HOME/.config/gtk-4.0/"
cp "$DOTFILES/config/Kvantum/kvantum.kvconfig" "$HOME/.config/Kvantum/"
cp "$DOTFILES/config/.gtkrc-2.0" "$HOME/.gtkrc-2.0"

# Default cursor
mkdir -p "$HOME/.icons/default"
cp "$DOTFILES/config/icons/default/index.theme" "$HOME/.icons/default/"

# Apply initial theme via gsettings (vantablack default)
gsettings set org.gnome.desktop.interface gtk-theme "Gruvbox-Material-Dark"
gsettings set org.gnome.desktop.interface icon-theme "Papirus-Dark"
gsettings set org.gnome.desktop.interface cursor-theme "Bibata-Modern-Classic-Gruvbox"
gsettings set org.gnome.desktop.interface color-scheme "prefer-dark"

# Mask dunst so it doesn't compete with mako on D-Bus
systemctl --user mask dunst.service 2>/dev/null || true

setup_nvim_dir

echo "Apps installation and configuration completed."
