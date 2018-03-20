#!/bin/sh
echo "Cloning fonts repository..."
git clone https://github.com/powerline/fonts.git
echo "Installing fonts..."
./fonts/install.sh
sudo rm -r fonts/
sudo dnf install -y curl
echo "Install Nerd Font"
mkdir -p ~/.local/share/fonts
cd ~/.local/share/fonts && curl -fLo "Droid Sans Mono for Powerline Nerd Font Complete.otf" https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/DroidSansMono/complete/Droid%20Sans%20Mono%20Nerd%20Font%20Complete.otf 
curl -fLo "Fura Mono for Powerline Nerd Font Complete.otf" https://github.com/bjartek/dotfiles/blob/master/Library/Fonts/Fura%20Mono%20Bold%20for%20Powerline%20Nerd%20Font%20Complete.otf 
curl -fLo "Knack Regular Nerd Font Complete Mono.ttf" https://raw.githubusercontent.com/ryanoasis/nerd-fonts/master/patched-fonts/Hack/Regular/complete/Knack%20Regular%20Nerd%20Font%20Complete%20Mono.ttf
cd -
fc-cache -v
echo "Now, go to \"terminal preferences\" and change your font."