#!/bin/sh
set -e

export DOTFILES="$PWD"

# Function to install packages with yay
install_yay() {
    yay -S --noconfirm --needed "$@"
}

# AUR and other packages (yay)
yay_packages="
    tmux
    qt5-wayland
    hyprland
    xdg-desktop-portal-hyprland
    dunst
    waybar
    zoxide
    nwg-look
    qt5ct
    qt6ct
    kvantum
    waypaper
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
    unclutter
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
    thunar
    thunar-volman
    thunar-archive-plugin
    tumbler
    gvfs
    xarchiver
    ffmpegthumbnailer
    poppler-glib
    gvfs-mtp
    gvfs-nfs
    gvfs-smb
    unrar
    zip
    p7zip
    ntfs-3g
    unace
    unzip
    sharutils
    uudeview
    arj
    cabextract
    python
    python-setuptools
    neovim
    ripgrep
    docker
    docker-compose
    the_silver_searcher
    tree
    exa
    tofi
    hyprpicker
    hyprlock
    hypridle
    hyprswitch
    hyprpaper
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
    pop-gtk-theme
    gruvbox-plus-icon-theme-git
    pop-icon-theme
    bibata-cursor-gruvbox-git
    kvantum-theme-gruvbox-git
    rofi
"

# --- Installation ---

echo "Installing packages from AUR and other sources..."
install_yay $yay_packages

# --- Configuration ---

echo "Copying configuration files..."
mkdir -p "$HOME/.config/hypr" && cp -r "$DOTFILES/config/hypr" "$HOME/.config/"
mkdir -p "$HOME/.config/kitty" && cp -r "$DOTFILES/config/kitty" "$HOME/.config/"
cp -r "$DOTFILES/config/dunst" "$HOME/.config/"
cp -r "$DOTFILES/config/wpaperd" "$HOME/.config/"
cp -r "$DOTFILES/config/waybar" "$HOME/.config/"
cp -r "$DOTFILES/config/tofi" "$HOME/.config/"
mkdir -p "$HOME/.config/backgrounds" && cp -r "$DOTFILES/config/backgrounds" "$HOME/.config/"
mkdir -p "$HOME/Pictures/" && cp -r "$DOTFILES/config/backgrounds" "$HOME/Pictures/"
cp -r "$DOTFILES/config/wlogout" "$HOME/.config/"

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

# Cursor default
mkdir -p "$HOME/.icons/default"
cp "$DOTFILES/config/icons/default/index.theme" "$HOME/.icons/default/"

# Aplicar tema via gsettings
gsettings set org.gnome.desktop.interface gtk-theme "Gruvbox-Material-Dark"
gsettings set org.gnome.desktop.interface icon-theme "Gruvbox-Plus-Dark"
gsettings set org.gnome.desktop.interface cursor-theme "Bibata-Modern-Classic-Gruvbox"
gsettings set org.gnome.desktop.interface color-scheme "prefer-dark"

mkdir -p "$HOME/.config/nvim"

echo "Configuring bat..."
mkdir -p "$HOME/.config/bat"
cp "$DOTFILES/config/bat/config" "$HOME/.config/bat/"

echo "Apps installation and configuration completed."
