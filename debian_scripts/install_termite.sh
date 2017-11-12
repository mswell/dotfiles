#!/bin/sh
echo "Install termite..."
curl https://raw.githubusercontent.com/mswell/termite-install/master/termite-install.sh -o termite.sh
chmod +x termite.sh
./termite.sh
sleep 1
echo "Change config to dracula theme :)"
mkdir $HOME/.config/termite
cp ../termite_config $HOME/.config/termite/config
rm -rf termite
rm -rf vte-ng
rm termite.sh