#!/bin/sh
set -e

export DOTFILES="$PWD"

# Function to install packages with pacman
install_pacman() {
    sudo pacman -S --noconfirm "$@"
}

# Function to install packages with yay
install_yay() {
    yay -S --noconfirm --needed "$@"
}

# Hyprland installation and configuration
echo "Install Hyprland"
install_pacman hyprland
mkdir -p $HOME/.config/hypr/ && cp -r $DOTFILES/config/hypr $HOME/.config/
mkdir -p $HOME/.config/kitty/ && cp -r $DOTFILES/config/kitty $HOME/.config/

install_pacman xdg-desktop-portal-hyprland dunst
cp -r $DOTFILES/config/dunst $HOME/.config/

echo "Installing useful Apps"

# Software from 'normal' repositories
install_yay tmux qt5-wayland qt6-wayland appimagelauncher-bin
install_yay bat lsd wezterm cliphist librewolf-bin obsidian pavucontrol
install_yay git-delta vlc flameshot-git wget unclutter curl bash-completion
install_yay ctags lazygit ncurses zsh xclip autojump google-chrome
install_yay meld discord openfortivpn fzf
install_yay thunar thunar-volman thunar-archive-plugin tumbler
install_yay gvfs xarchiver ffmpegthumbnailer poppler-glib gvfs-mtp gvfs-nfs gvfs-smb unrar zip p7zip ntfs-3g

# Installation of zippers and unzippers
install_yay unace unrar zip unzip sharutils uudeview arj cabextract

# Install Python and Neovim dependencies
install_yay python python-setuptools neovim

# Create Neovim configuration directory, if it doesn't exist
mkdir -p "$HOME/.config/nvim"

# Instala pacotes base para desenvolvimento
install_yay ripgrep fzf curl unzip neovim docker docker-compose tmux the_silver_searcher tree exa nwg-look

# Bat config
mkdir -p "$(bat --config-dir)/themes"
wget -P "$(bat --config-dir)/themes" https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/sublime/tokyonight_night.tmTheme
bat cache --build

# Instalação de Waybar e configuração
install_pacman waybar zoxide
cp -r $DOTFILES/config/waybar $HOME/.config/

# Instalação de Tofi e configuração
install_yay tofi
cp -r $DOTFILES/config/tofi $HOME/.config/

# Instalação de Hyprpicker, Hyprlock e Hypridle e configuração
install_yay hyprpicker hyprlock hypridle hyprpicker hyprswitch hyprpaper hyprpolkitagent

mkdir -p $HOME/.config/backgrounds/ && cp -r $DOTFILES/config/backgrounds $HOME/.config/

# Instalação de Wlogout e Grimblast e configuração
install_yay wlogout grimblast
cp -r $DOTFILES/config/wlogout $HOME/.config/

# Instalação de temas
echo "Installing themes"
install_yay kvantum-theme-catppuccin-git
install_pacman nwg-look qt5ct qt6ct kvantum waypaper

sudo tar -xvf $DOTFILES/config/themes/Catppuccin-Mocha.tar.xz -C /usr/share/themes/
sudo tar -xvf $DOTFILES/config/icons/Tela-circle-dracula.tar.xz -C /usr/share/icons/
