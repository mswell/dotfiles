#!/bin/sh
echo "Install termite..."
curl https://raw.githubusercontent.com/mswell/termite-install/master/termite-install.sh -o termite.sh
chmod +x termite.sh
./termite.sh
sleep 1
echo "Change config to nord theme :)"
mkdir $HOME/.config/termite
rm -rf termite
rm -rf vte-ng
rm termite.sh

# zsh

sudo dnf install -y zsh git autojump-zsh tree gdouros-symbola-fonts tmux
sh -c "$(wget https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O -)"
echo "Now type \`chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
chsh -s $(which zsh)

git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/dracula/zsh.git
mv zsh/dracula.zsh-theme ${ZSH_CUSTOM:-~/.oh-my-zsh/themes}
rm -fr zsh