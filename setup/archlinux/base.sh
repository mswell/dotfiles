#!/bin/sh

sudo pacman -S --needed base-devel

echo "Installing base-dev libs"
yay -Syu --noconfirm git vim python-pip
