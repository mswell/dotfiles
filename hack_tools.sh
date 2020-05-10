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

echo "Install html-tool"
sleep 2
go get -u github.com/tomnomnom/hacks/html-tool

echo "Install gf"
sleep 2
go get -u github.com/tomnomnom/gf
cp -r $GOPATH/src/github.com/tomnomnom/gf/examples ~/.gf

echo "Install unurl"
sleep 2
go get -u github.com/tomnomnom/unfurl

echo "Install subfinder"
sleep 2
go get -v github.com/projectdiscovery/subfinder/cmd/subfinder

echo "Install nuclei"
sleep 2
GO111MODULE=on go get -u -v github.com/projectdiscovery/nuclei/cmd/nuclei

echo "Install amass"
sleep 2
go get -v github.com/OWASP/Amass/v3/...

