#!/bin/sh

git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

echo "Now type \`chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
chsh -s $(which zsh)

echo "----------- ZSH -----------"
echo "Now type \`sudo chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
