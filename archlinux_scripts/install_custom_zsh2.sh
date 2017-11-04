#!/bin/sh
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/dracula/zsh.git
mv zsh/dracula.zsh-theme ${ZSH_CUSTOM:-~/.oh-my-zsh/themes}
rm -fr zsh
cp ../.zshrc $HOME/.zshrc