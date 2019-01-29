#!/bin/sh

# Spotify

wget http://ftp.us.debian.org/debian/pool/main/o/openssl/libssl1.0.0_1.0.1t-1+deb8u6_amd64.deb
sudo apt install gdebi dirmngr
sudo gdebi libssl1.0.0_1.0.1t-1+deb8u6_amd64.deb
rm libssl1.0.0_1.0.1t-1+deb8u6_amd64.deb

# 1. Add the Spotify repository signing keys to be able to verify downloaded packages
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 0DF731E45CE24F27EEEB1450EFDC8610341D9410

# 2. Add the Spotify repository
echo deb http://repository.spotify.com stable non-free | sudo tee /etc/apt/sources.list.d/spotify.list

# 3. Update list of available packages
sudo apt-get update

# 4. Install Spotify

sudo apt-get install spotify-client

# Docker

wget -qO- https://get.docker.com/ | sh
sudo gpasswd -a $USER docker

# Docker-compose

sudo curl -L "https://github.com/docker/compose/releases/download/1.14.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose