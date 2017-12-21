#!/bin/sh
pacaur -S tree tmux
curl -L http://install.ohmyz.sh | sh
echo "Now type \`chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
chsh -s $(which zsh)

echo "Change shell"

chsh -s $(which zsh)
cp ../.zshrc $HOME/.zshrc