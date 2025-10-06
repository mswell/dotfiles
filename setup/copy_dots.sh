#!/bin/sh

set -e

export DOTFILES="$PWD"
CONFIG_DIR="$HOME/.config"

green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

copy_file() {
    local source="$1"
    local destination="$2"
    echo "${green}[+] Copiando $source => $destination${reset}"
    cp -f "$source" "$destination"
}

create_dir() {
    local dir="$1"
    echo "${yellow}[+] Criando diretório $dir${reset}"
    [ ! -d "$dir" ] && mkdir -p "$dir"
}

# zsh
echo "${yellow}[+] Copiando dotfiles zsh${reset}"
sleep 1
create_dir "$CONFIG_DIR/zsh"

copy_file "$DOTFILES/config/zsh/.zshrc" "$HOME/.zshrc"
copy_file "$DOTFILES/config/zsh/env.zsh" "$CONFIG_DIR/zsh/"
copy_file "$DOTFILES/config/zsh/custom.zsh" "$CONFIG_DIR/zsh/"
copy_file "$DOTFILES/config/zsh/alias.zsh" "$CONFIG_DIR/zsh/"
copy_file "$DOTFILES/config/zsh/functions.zsh" "$CONFIG_DIR/zsh/"

# Copy modular functions directory
echo "${green}[+] Copiando funções modulares${reset}"
create_dir "$CONFIG_DIR/zsh/functions"
cp -rf "$DOTFILES/config/zsh/functions/"* "$CONFIG_DIR/zsh/functions/"

copy_file "$DOTFILES/config/zsh/.zprofile" "$HOME/.zprofile"
copy_file "$DOTFILES/config/zsh/.p10k.zsh" "$HOME/.p10k.zsh"

# git
echo "${yellow}[+] Copiando dotfiles git${reset}"
sleep 1
copy_file "$DOTFILES/config/git/.gitconfig" "$HOME/.gitconfig"
copy_file "$DOTFILES/config/git/.catppuccin.gitconfig" "$HOME/.catppuccin.gitconfig"

# bat
echo "${yellow}[+] Copiando dotfiles bat${reset}"
sleep 1
create_dir "$CONFIG_DIR/bat"
copy_file "$DOTFILES/config/bat/config" "$CONFIG_DIR/bat/config"

# Ghostty
echo "${yellow}[+] Copiando dotfiles Ghostty${reset}"
sleep 1
create_dir "$CONFIG_DIR/ghostty"
copy_file "$DOTFILES/config/Ghostty/config" "$CONFIG_DIR/ghostty/"

# wezterm
echo "${yellow}[+] Copiando dotfiles Wezterm${reset}"
sleep 1
create_dir "$CONFIG_DIR/wezterm"
copy_file "$DOTFILES/config/wezterm/wezterm.lua" "$CONFIG_DIR/wezterm/"
copy_file "$DOTFILES/config/wezterm/cyberdream.lua" "$CONFIG_DIR/wezterm/"

# flameshot
echo "${yellow}[+] Copiando dotfiles ${reset}"
sleep 1
create_dir "$CONFIG_DIR/flameshot"
copy_file "$DOTFILES/config/flameshot/flameshot.ini" "$CONFIG_DIR/flameshot/"

# tmux
echo "${yellow}[+] Copiando tmux${reset}"
sleep 1
create_dir "$HOME/.local/bin"
copy_file "$DOTFILES/config/tmux/.tmux.conf" "$HOME/.tmux.conf"
copy_file "$DOTFILES/config/tmux/.tmux-cht-command" "$HOME/.tmux-cht-command"
copy_file "$DOTFILES/config/tmux/.tmux-cht-languages" "$HOME/.tmux-cht-languages"
copy_file "$DOTFILES/config/tmux/tmux-sessionizer" "$HOME/.local/bin"
copy_file "$DOTFILES/config/tmux/tmux-cht.sh" "$HOME/.local/bin"

echo "${yellow}[+] Done.${reset}"
