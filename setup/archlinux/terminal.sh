#!/bin/sh

git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

echo "Now type \`chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
chsh -s $(which zsh)

# Install Starship
echo "${yellow}[+] Instalando starship${reset}"
sleep 1
sh -c "$(curl -fsSL https://starship.rs/install.sh)"

# zsh
echo "${yellow}[+] Instalando oh-my-zsh${reset}"
sleep 1
sh -c "$(wget https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O -)"

echo "${yellow}[+] Instalando syntax highlighting e autosuggestions , para o zsh${reset}"
sleep 1
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

echo "----------- ZSH -----------"
echo "Now type \`sudo chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
