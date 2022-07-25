#!/bin/sh

echo "Installing base-dev libs"
sudo apt install -y build-essential git vim xclip curl wget
sudo apt install python3 python3-pip build-essential gcc cmake ruby git curl libpcap-dev wget zip python3-dev pv dnsutils libssl-dev libffi-dev libxml2-dev libxslt1-dev zlib1g-dev jq apt-transport-https xvfb prips -y $DEBUG_STD
