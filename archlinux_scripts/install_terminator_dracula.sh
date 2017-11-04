#!/bin/sh
echo "Install terminator..."
pacaur -S terminator
sleep 1
echo "Change config to dracula theme :)"
mkdir $HOME/.config/terminator
touch $HOME/.config/terminator/config
curl "https://gist.githubusercontent.com/mswell/c0f05d418f87a9f4c1733186642ea767/raw/403bbdaf8f6b07c9b13349075ecfa524c1f4c85d/config" > $HOME/.config/terminator/config