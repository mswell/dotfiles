#!/bin/sh

# Instrui o shell a sair se houver erro
set -e

#--- Constantes
export DOTFILES="$PWD"
CONFIG_DIR="$HOME/.config"

#--- Cores
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

# Função para copiar arquivos
copy_file() {
  local source="$1"
  local destination="$2"
  echo "${green}[+] Copiando $source => $destination${reset}"
  cp -f "$source" "$destination"
}

# Função para criar diretórios
create_dir() {
  local dir="$1"
  echo "${yellow}[+] Criando diretório $dir${reset}"
  [ ! -d "$dir" ] && mkdir -p "$dir"
}

#---- inicio script

# zsh
echo "${yellow}[+] Copiando dotfiles zsh${reset}"
sleep 1
create_dir "$CONFIG_DIR/zsh"

copy_file "$DOTFILES/config/zsh/.zshrc" "$HOME/.zshrc"
copy_file "$DOTFILES/config/zsh/custom.zsh" "$CONFIG_DIR/zsh/"
copy_file "$DOTFILES/config/zsh/alias.zsh" "$CONFIG_DIR/zsh/"
copy_file "$DOTFILES/config/zsh/functions.zsh" "$CONFIG_DIR/zsh/"
copy_file "$DOTFILES/config/zsh/.zprofile" "$HOME/.zprofile"

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

# alacritty
echo "${yellow}[+] Copiando dotfiles alacritty${reset}"
sleep 1
create_dir "$CONFIG_DIR/alacritty"
copy_file "$DOTFILES/config/alacritty.toml" "$CONFIG_DIR/alacritty/"

# wezterm
echo "${yellow}[+] Copiando dotfiles Wezterm${reset}"
sleep 1
create_dir "$CONFIG_DIR/wezterm"
copy_file "$DOTFILES/config/wezterm/wezterm.lua" "$CONFIG_DIR/wezterm/"
copy_file "$DOTFILES/config/wezterm/cyberdream.lua" "$CONFIG_DIR/wezterm/"

# Startship
echo "${yellow}[+] Copy starship config${reset}"
sleep 1
copy_file "$DOTFILES/config/starship.toml" "$CONFIG_DIR/"

# Redshift
echo "${yellow}[+] Copy Redshift config ${reset}"
create_dir "$CONFIG_DIR/redshift"
copy_file "$DOTFILES/config/redshift/redshift.conf" "$CONFIG_DIR/redshift/"

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
