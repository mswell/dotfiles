#!/bin/sh

red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

# Clones the tmux plugin manager
echo "${yellow}[+] Installing tmux plugin manager${reset}"
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

# Changes the default shell to zsh
echo "${yellow}[+] Changing the default shell to zsh${reset}"
chsh -s $(which zsh)

# Prints instructions for the user
echo "${yellow}[+] Restart the system to apply the changes.${reset}"

# Installs Starship
echo "${yellow}[+] Installing Starship${reset}"
sh -c "$(curl -fsSL https://starship.rs/install.sh)"

# Installs Oh-My-Zsh without interaction
echo "${yellow}[+] Installing Oh-My-Zsh without interaction${reset}"
export ZSH="$HOME/.oh-my-zsh"
if [ ! -d "$ZSH" ]; then
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

# Clones zsh plugins
echo "${yellow}[+] Installing syntax highlighting and automatic suggestions for zsh${reset}"
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

echo "${green}[+] Terminal configuration completed!${reset}"
