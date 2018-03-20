#!/bin/sh

# Install Slack

sudo apt install -y libappindicator1 libindicator7
wget https://downloads.slack-edge.com/linux_releases/slack-3.1.0-0.1.fc21.x86_64.rpm
sudo dnf install -y slack-3.1.0-0.1.fc21.x86_64.rpm
rm slack-3.1.0-0.1.fc21.x86_64.rpm

# Docker

wget -qO- https://get.docker.com/ | sh
sudo gpasswd -a $USER docker

# Docker-compose
sudo dnf install -y curl
sudo  curl -L "https://github.com/docker/compose/releases/download/1.14.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose