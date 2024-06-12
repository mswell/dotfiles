#!/bin/sh

git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

echo "Now type \`chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
chsh -s $(which zsh)

# Install Starship
echo "${yellow}[+] Instalando starship${reset}"
sleep 1
sh -c "$(curl -fsSL https://starship.rs/install.sh)"

echo "${yellow}[+] Instalando syntax highlighting e autosuggestions , para o zsh${reset}"
sleep 1
git clone https://github.com/zsh-users/zsh-autosuggestions ~/.zsh/z sh-autosuggestions
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ~/.zsh/zsh-syntax-highlighting

echo "----------- ZSH -----------"
echo "Now type \`sudo chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
