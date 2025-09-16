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
    flameshot-git
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
    kvantum-theme-catppuccin-git
"

# --- Installation ---

echo "Installing packages from AUR and other sources..."
install_yay $yay_packages

# --- Configuration ---

echo "Copying configuration files..."
mkdir -p "$HOME/.config/hypr" && cp -r "$DOTFILES/config/hypr" "$HOME/.config/"
mkdir -p "$HOME/.config/kitty" && cp -r "$DOTFILES/config/kitty" "$HOME/.config/"
cp -r "$DOTFILES/config/dunst" "$HOME/.config/"
cp -r "$DOTFILES/config/waybar" "$HOME/.config/"
cp -r "$DOTFILES/config/tofi" "$HOME/.config/"
mkdir -p "$HOME/.config/backgrounds" && cp -r "$DOTFILES/config/backgrounds" "$HOME/.config/"
cp -r "$DOTFILES/config/wlogout" "$HOME/.config/"

# Create Neovim configuration directory, if it doesn't exist
mkdir -p "$HOME/.config/nvim"

# Bat config
echo "Configuring bat..."
mkdir -p "$(bat --config-dir)/themes"
wget -P "$(bat --config-dir)/themes" https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/sublime/tokyonight_night.tmTheme
bat cache --build

# Installing themes
echo "Extracting themes..."
sudo tar -xvf "$DOTFILES/config/themes/Catppuccin-Mocha.tar.xz" -C /usr/share/themes/
sudo tar -xvf "$DOTFILES/config/icons/Tela-circle-dracula.tar.xz" -C /usr/share/icons/

echo "Apps installation and configuration completed."
