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
go get -u github.com/ffuf/ffuf

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
GO111MODULE=on go get -u -v github.com/projectdiscovery/nuclei/v2/cmd/nuclei

echo "Install amass"
sleep 2
GO111MODULE=on
go get -u -v github.com/OWASP/Amass/v3/...

echo "Install gron"
sleep 2
go get -u github.com/tomnomnom/gron

echo "Install rescope"
sleep 2
go get -u github.com/root4loot/rescope

echo "Install shuffledns"
sleep 2
GO111MODULE=on go get -u -v github.com/projectdiscovery/shuffledns/cmd/shuffledns

echo "Install Hakcheckurl"
sleep 2
go get -u github.com/hakluke/hakcheckurl

echo "Install subjs"
sleep 2
GO111MODULE=on go get -u -v github.com/lc/subjs

echo "Install getJS"
sleep 2
go get -u github.com/003random/getJS

echo "Install gau"
sleep 2
GO111MODULE=on go get -u -v github.com/lc/gau

echo "Install CORS-scanner"
sleep 2
go get -u github.com/Tanmay-N/CORS-Scanner

echo "Install waybackurls"
go get -u github.com/tomnomnom/waybackurl

echo "Install Gospider"
go get -u github.com/jaeles-project/gospider

