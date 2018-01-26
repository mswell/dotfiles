#!/bin/sh
wget https://storage.googleapis.com/golang/go1.8.3.linux-amd64.tar.gz
sudo tar -zxvf go1.8.3.linux-amd64.tar.gz -C /usr/local/
rm go1.8.3.linux-amd64.tar.gz
echo "Set your env!"
echo "echo 'export GOROOT=/usr/local/go' >> ~/.zshrc"
echo "echo 'export GOPATH=\$HOME/go' >> ~/.zshrc"
echo "echo 'export PATH=\$PATH:\$GOROOT/bin:\$GOPATH/bin' >> ~/.zshrc"