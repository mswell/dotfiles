#!/bin/sh

# instrui o shell a sair se houver erro
set -e

#--- Constantes
export DOTFILES=$PWD

#--- Cores
red=`tput setaf 1`
green=`tput setaf 2`
yellow=`tput setaf 3`
reset=`tput sgr0`

#---- inicio script
# zsh
echo "${yellow}[+] Copiando dotfiles zsh${reset}"
sleep 1
[ ! -d "$HOME/.config/zsh" ] && mkdir -p "$HOME/.config/zsh"

# install oh-my-zsh and overwrite zsh file
echo "${yellow}[+] Copiando dotfiles zsh${reset}"
sleep 1
if [ ! -z "$HOME/.zshrc" ]; then
   # arquivo ja existe
   echo -n "${yellow}[?] Arquivo .zshrc já existe, quer sobrescre-lo ? (Sim/Nao) ${reset}"
   read option
   case $option in
        Sim) 
           echo "${green}[+] Sobrescrevendo $DOTFILES/config/zsh/.zshrc => $HOME/.zshrc${reset}"
           cp -f "$DOTFILES/config/zsh/.zshrc" "$HOME/.zshrc"
           sleep 2
	   ;;
        *) 
           echo "${green}[*] Mantendo o arquivo atual...${reset}"
	   sleep 2
	   ;;
    esac
else
   # arquivo nao existe
   echo "${green}[+] Copiando $DOTFILES/config/zsh/.zshrc => $HOME/.zshrc${reset}"
   cp "$DOTFILES/config/zsh/.zshrc" "$HOME/.zshrc"
fi

echo "${green}[+] Copiando $DOTFILES/config/zsh/functions.zsh => $HOME/.config/zsh/${reset}"
cp "$DOTFILES/config/zsh/functions.zsh" "$HOME/.config/zsh/"
echo "${green}[+] Copiando $DOTFILES/config/zsh/.zprofile => $HOME/.zprofile${reset}"
cp "$DOTFILES/config/zsh/.zprofile" "$HOME/.zprofile"

# git
echo "${yellow}[+] Copiando dotfiles git${reset}"
sleep 1
echo "${green}[+] Copiando $DOTFILES/config/git/.gitconfig => $HOME/.gitconfig${reset}"
cp "$DOTFILES/config/git/.gitconfig" "$HOME/.gitconfig"

# alacritty
echo "${yellow}[+] Copiando dotfiles alacritty${reset}"
sleep 1
# cria diretorio se nao existir
[ ! -d "$HOME/.config/alacritty" ] && mkdir -p "$HOME/.config/alacritty"
echo "${green}[+] Copiando $DOTFILES/config/alacritty.yml => $HOME/.config/alacritty/${reset}"
cp "$DOTFILES/config/alacritty.yml" "$HOME/.config/alacritty/"

# neovim 
echo "${yellow}[+] Copiando neovim${reset}"
sleep 1
# remove diretorio se existir
[ -d ~/.config/nvim ] && rm -rf ~/.config/nvim
git clone https://github.com/mswell/nvim.git ~/.config/nvim

# tmux
echo "${yellow}[+] Copiando tmux${reset}"
sleep 1
# cria diretorio se nao existir
[ ! -d "$HOME/.local/bin" ] && mkdir $HOME/.local/bin
cp "$DOTFILES/config/tmux/.tmux.conf" "$HOME/.tmux.conf"
cp "$DOTFILES/config/tmux/tmux-sessionizer" "$HOME/.local/bin"

# Custom nuclei templates
echo "${yellow}[+] Copiando nuclei templates${reset}"
sleep 1
cp -R "$DOTFILES/custom_nuclei_templates/" "$HOME/"

echo "${yellow}[+] Done.${reset}"
