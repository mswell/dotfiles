#!/bin/sh
sudo apt install -y libappindicator1 libindicator7
wget https://downloads.slack-edge.com/linux_releases/slack-desktop-3.0.5-amd64.deb
sudo dpkg -i slack-desktop-3.0.5-amd64.deb
rm slack-desktop-3.0.5-amd64.deb