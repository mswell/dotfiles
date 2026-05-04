#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/arch.sh"

# i3wm and display
echo "Installing i3wm..."
install_pacman i3-wm i3lock i3status i3blocks xss-lock xterm \
    lightdm lightdm-gtk-greeter dmenu polkit-gnome mako \
    lxappearance qt5ct qt6ct kvantum nitrogen rofi npm zoxide jq

mkdir -p "$HOME/.config/i3" && cp -r "$DOTFILES/config/i3" "$HOME/.config/"
cp "$DOTFILES/config/.Xresources" "$HOME/"
xrdb -merge "$HOME/.Xresources"

mkdir -p "$HOME/.config/mako" && cp "$DOTFILES/config/mako/config" "$HOME/.config/mako/"

echo "Installing apps..."

# GUI apps and CLI tools
install_yay picom mousepad arandr xdg-users-dirs libnotify tmux appimagelauncher-bin \
    bat lsd wezterm librewolf-bin obsidian pavucontrol git-delta vlc unclutter \
    bash-completion ctags lazygit ncurses zsh xclip autojump google-chrome \
    meld discord openfortivpn fzf ghostty

# File manager and media
install_yay nautilus file-roller tumbler dosfstools papirus-icon-theme \
    gvfs sushi ffmpegthumbnailer poppler-glib gvfs-mtp gvfs-nfs gvfs-smb

# Compression
install_yay unrar zip unzip p7zip ntfs-3g

# Development
install_yay python python-setuptools neovim ripgrep docker docker-compose tree

setup_nvim_dir
setup_bat_theme

# Themes
echo "Installing themes..."
install_yay kvantum-theme-catppuccin-git

sudo tar -xvf "$DOTFILES/config/themes/Catppuccin-Mocha.tar.xz" -C /usr/share/themes/
sudo tar -xvf "$DOTFILES/config/icons/Tela-circle-dracula.tar.xz" -C /usr/share/icons/
