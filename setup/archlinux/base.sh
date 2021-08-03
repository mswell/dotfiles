#!/bin/sh
# Antergos base config

# in case pure Arch read about how install yay: https://www.ostechnix.com/install-yay-arch-linux/
# install yay

echo "Installing base-dev libs"
paru -Syu --noconfirm git gvim python-pip
paru -Syu --noconfirm base-devel