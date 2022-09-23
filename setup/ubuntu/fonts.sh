#!/bin/sh

#--- Cores
red=`tput setaf 1`
green=`tput setaf 2`
yellow=`tput setaf 3`
reset=`tput sgr0`

#---- script

echo "${yellow}[+] Clonando repositorio de fontes${reset}"
sleep 1
git clone https://github.com/powerline/fonts.git


echo "${yellow}[+] Instalando fontes${reset}"
sleep 1
./fonts/install.sh
sudo rm -r fonts/

echo "${yellow}[+] Instalando font Nerd${reset}"
sleep 1
mkdir -p ~/.local/share/fonts
cd ~/.local/share/fonts
curl -fLo "Droid Sans Mono for Powerline Nerd Font Complete.otf" https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/DroidSansMono/complete/Droid%20Sans%20Mono%20Nerd%20Font%20Complete.otf
curl -fLo "Fura Mono for Powerline Nerd Font Complete.otf" https://github.com/bjartek/dotfiles/blob/master/Library/Fonts/Fura%20Mono%20Bold%20for%20Powerline%20Nerd%20Font%20Complete.otf
curl -fLo "Knack Regular Nerd Font Complete Mono.ttf" https://raw.githubusercontent.com/ryanoasis/nerd-fonts/master/patched-fonts/Hack/Regular/complete/Knack%20Regular%20Nerd%20Font%20Complete%20Mono.ttf
curl -fLo "Mononoki Regular Nerd Font Complete.ttf" https://github.com/ryanoasis/nerd-fonts/blob/master/patched-fonts/Mononoki/Regular/complete/mononoki-Regular%20Nerd%20Font%20Complete%20Mono.ttf
curl -fLo "Mononoki Bold Nerd Font Complete.ttf" https://github.com/ryanoasis/nerd-fonts/blob/master/patched-fonts/Mononoki/Bold/complete/mononoki%20Bold%20Nerd%20Font%20Complete%20Mono.ttf
curl -fLo "Mononoki Italic Nerd Font Complete.ttf" https://github.com/ryanoasis/nerd-fonts/blob/master/patched-fonts/Mononoki/Italic/complete/mononoki%20Italic%20Nerd%20Font%20Complete%20Mono.ttf

cd -
fc-cache -v
echo "Now, go to \"terminal preferences\" and change your font."
sleep 3

echo "${yellow}[*] Feito.${reset}"
