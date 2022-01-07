#!/bin/sh
sudo apt install -y zsh git autojump tree ttf-ancient-fonts tmux alacritty

# Install tmux TPM

git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

# Install Starship

sh -c "$(curl -fsSL https://starship.rs/install.sh)"
# zsh

sh -c "$(wget https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O -)"
echo "Now type \`chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
chsh -s $(which zsh)

git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

sudo chsh -s /usr/bin/zsh
