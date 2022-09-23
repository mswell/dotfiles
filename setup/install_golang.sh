#!/bin/sh

#--- seta cores
red=`tput setaf 1`
green=`tput setaf 2`
yellow=`tput setaf 3`
reset=`tput sgr0`

#---- inicia script

echo "${yellow}[+] Instalando ambiente de desenvolvimento em Go${reset}"

# Instala Go se ainda nao tem instalado
# by https://github.com/nahamsec/bbht/blob/master/install.sh
if [[ -z "$GOPATH" ]];then
   echo "${yellow}[+] Instalando Go${reset}"
   sleep 1
   GOversion=$(curl -L -s https://golang.org/VERSION?m=text)
   wget https://dl.google.com/go/${GOversion}.linux-amd64.tar.gz $DEBUG_STD
   sudo tar -C /usr/local -xzf ${GOversion}.linux-amd64.tar.gz $DEBUG_STD
   rm -rf $GOversion*
else
    echo "${red}[-] Go já se encontra instalado, nao iremos instalar${reset}"
    sleep 2
fi

echo "${yellow}[*] Feito.${reset}"
