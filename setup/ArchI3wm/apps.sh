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

# i3wm configuration
echo "Install Hyprland"
install_pacman hyprland
mkdir -p $HOME/.config/i3 && cp -r $DOTFILES/config/i3 $HOME/.config/

install_pacman polkit-gnome npm dunst
cp -r $DOTFILES/config/dunst $HOME/.config/

echo "Installing useful Apps"

# Software from 'normal' repositories
install_yay picom mousepad arandr xdg-users-dirs rofi libnotify tmux appimagelauncher-bin
install_yay bat lsd wezterm librewolf-bin obsidian pavucontrol
install_yay git-delta vlc unclutter bash-completion
install_yay ctags lazygit ncurses zsh xclip autojump google-chrome
install_yay meld discord openfortivpn fzf
install_yay thunar thunar-volman thunar-archive-plugin tumbler dosfstools lxappearance
install_yay gvfs xarchiver ffmpegthumbnailer poppler-glib gvfs-mtp gvfs-nfs gvfs-smb unrar zip p7zip ntfs-3g

# Installation of zippers and unzippers
install_yay unace unrar zip unzip sharutils uudeview arj cabextract

# Install Python and Neovim dependencies
install_yay python python-setuptools neovim

# Create Neovim configuration directory, if it doesn't exist
mkdir -p "$HOME/.config/nvim"

# Instala pacotes base para desenvolvimento
install_yay ripgrep fzf curl unzip neovim docker docker-compose the_silver_searcher tree exa

# Bat config
mkdir -p "$(bat --config-dir)/themes"
wget -P "$(bat --config-dir)/themes" https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/sublime/tokyonight_night.tmTheme
bat cache --build

# Instalação de temas
echo "Installing themes"
install_yay kvantum-theme-catppuccin-git
install_pacman lxappearance qt5ct qt6ct kvantum nitrogen rofi

sudo tar -xvf $DOTFILES/config/themes/Catppuccin-Mocha.tar.xz -C /usr/share/themes/
sudo tar -xvf $DOTFILES/config/icons/Tela-circle-dracula.tar.xz -C /usr/share/icons/
