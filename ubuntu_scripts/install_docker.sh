#!/bin/sh

wget -qO- https://get.docker.com/ | sh
sudo gpasswd -a $USER docker
su - $USER