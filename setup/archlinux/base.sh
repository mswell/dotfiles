#!/bin/sh

sudo pacman -S --needed base-devel

echo "Installing base-dev libs"
yay -Syu --noconfirm git lsb-release vim python-pip
