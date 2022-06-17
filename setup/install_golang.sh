#!/bin/sh

echo "Setting Go dev environment"

GOversion=$(curl -L -s https://golang.org/VERSION?m=text)
wget https://dl.google.com/go/${GOversion}.linux-amd64.tar.gz $DEBUG_STD
sudo tar -C /usr/local -xzf ${GOversion}.linux-amd64.tar.gz $DEBUG_STD
rm -rf $GOversion*
