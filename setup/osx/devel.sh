#!/bin/sh

echo "Installing tools for developers"
brew install tmux
brew install autojump
brew install neovim
brew install ripgrep
brew install ranger
brew install jq

git clone https://github.com/tmux-plugins/tpm $HOME/.tmux/plugins/tpm
tmux source $HOME/.tmux.conf

echo "Install Nvim MACH"
bash <(curl -s https://raw.githubusercontent.com/ChristianChiarulli/nvim/master/utils/install.sh)