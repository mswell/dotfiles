#!/bin/sh
set -e

red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

echo "${yellow}[+] Instalando ambiente de desenvolvimento em Go${reset}"

echo "${yellow}[+] Instalando Go${reset}"
sleep 1
GOversion=$(curl -L -s "https://golang.org/VERSION?m=text" | head -n 1)
wget https://go.dev/dl/${GOversion}.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf ${GOversion}.linux-amd64.tar.gz
rm -f ${GOversion}.linux-amd64.tar.gz

if ! grep -q 'export PATH=$PATH:/usr/local/go/bin' "$HOME/.profile"; then
  echo 'export PATH=$PATH:/usr/local/go/bin' >>"$HOME/.profile"
  source "$HOME/.profile"
fi

echo "${yellow}[*] Done.${reset}"
