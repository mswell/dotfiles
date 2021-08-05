#!/bin/sh
# Docker

wget -qO- https://get.docker.com/ | sh
sudo gpasswd -a $USER docker

# Docker-compose

sudo curl -L "https://github.com/docker/compose/releases/download/1.14.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose