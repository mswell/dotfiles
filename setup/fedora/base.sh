#!/bin/sh

echo "Installing base-dev libs"
sudo dnf install -y @development-tools git vim gimp tlp tlp-rdw vlc xclip curl wget
sudo tlp start