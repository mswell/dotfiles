#!/bin/sh
wget https://downloads.slack-edge.com/linux_releases/slack-2.8.2-0.1.fc21.x86_64.rpm
sudo dnf install slack-2.8.2-0.1.fc21.x86_64.rpm
rm slack-2.8.2-0.1.fc21.x86_64.rpm