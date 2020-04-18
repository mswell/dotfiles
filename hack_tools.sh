#!/usr/bin/env bash
echo "Install assetfinder"
go get -u github.com/tomnomnom/assetfinder

echo "Install HTTPROBE"
sleep 2
go get -u github.com/tomnomnom/httprobe

echo "Install Meg"
sleep 2
go get -u github.com/tomnomnom/meg

echo "Install ffuf"
sleep 2
go get -u github.com/tomnomnom/meg
