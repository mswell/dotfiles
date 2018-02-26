#!/bin/sh

echo "Installing base-dev libs"
sudo apt install -y build-essential git vim gimp tlp tlp-rdw vlc xclip curl wget
sudo tlp start