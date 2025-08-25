#!/bin/sh
set -e

export DOTFILES="$PWD"

# --- Package Lists ---

# Official repositories (pacman)
official_packages=(
    hyprland
    xdg-desktop-portal-hyprland
    dunst
    waybar
    zoxide
    tofi
    hyprpicker
    hyprlock
    hypridle
    hyprpaper
    swappy
    grimblast
    wlogout
    qt5-wayland
    qt6-wayland
    pavucontrol
    vlc
    wget
    unclutter
    curl
    bash-completion
    ctags
    ncurses
    zsh
    xclip
    autojump
    meld
    thunar
    thunar-volman
    thunar-archive-plugin
    tumbler
    gvfs
    xarchiver
    ffmpegthumbnailer
    poppler-glib
    unrar zip p7zip ntfs-3g
    python
    python-setuptools
    neovim
    ripgrep
    fzf
    docker
    docker-compose
    tmux
    the_silver_searcher
    tree
    exa
    nwg-look
    qt5ct
    qt6ct
    kvantum
    network-manager-applet
    kitty
    pipewire
    wireplumber
    pamixer
    brightnessctl
    sddm
    tar
    lsb-release
    vim
    python-pip
)

# AUR (yay)
aur_packages=(
    appimagelauncher-bin
    bat
    lsd
    wezterm
    cliphist
    librewolf-bin
    obsidian
    git-delta
    flameshot-git
    google-chrome
    openfortivpn
    ghostty
    hyprswitch
    hyprpolkitagent
    kvantum-theme-catppuccin-git
    jome
    waypaper
    brave-bin
)

# --- Installation ---

echo "Installing official packages..."
sudo pacman -S --noconfirm --needed "${official_packages[@]}"

echo "Installing AUR packages..."
yay -S --noconfirm --needed "${aur_packages[@]}"


# --- Configuration ---

# Function to copy config files if they don't exist
copy_config() {
    local config_path="$1"
    local dest_path="$HOME/.config/$config_path"
    if [ ! -d "$dest_path" ]; then
        echo "Copying $config_path configs..."
        mkdir -p "$(dirname "$dest_path")"
        cp -r "$DOTFILES/config/$config_path" "$(dirname "$dest_path")/"
    else
        echo "$config_path configs already exist. Skipping."
    fi
}

copy_config "hypr"
copy_config "kitty"
copy_config "dunst"
copy_config "waybar"
copy_config "tofi"
copy_config "wlogout"

# Create Neovim configuration directory, if it doesn't exist
if [ ! -d "$HOME/.config/nvim" ]; then
    mkdir -p "$HOME/.config/nvim"
fi

# Bat config
if [ ! -f "$(bat --config-dir)/themes/tokyonight_night.tmTheme" ]; then
    mkdir -p "$(bat --config-dir)/themes"
    wget -P "$(bat --config-dir)/themes" https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/sublime/tokyonight_night.tmTheme
    bat cache --build
fi

# Backgrounds
if [ ! -d "$HOME/.config/backgrounds" ]; then
    mkdir -p "$HOME/.config/backgrounds/"
    cp -r "$DOTFILES/config/backgrounds" "$HOME/.config/"
fi

# Themes
echo "Installing themes"
sudo tar -xvf $DOTFILES/config/themes/Catppuccin-Mocha.tar.xz -C /usr/share/themes/
sudo tar -xvf $DOTFILES/config/icons/Tela-circle-dracula.tar.xz -C /usr/share/icons/

echo "Enabling SDDM..."
sudo systemctl enable sddm.service