#!/bin/sh
set -e

#--- seta cores
red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

# Função para verificar se um comando existe
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Verifica se wget e curl estão instalados
if ! command_exists wget; then
  echo "${red}Erro: wget não está instalado.${reset}" >&2
  exit 1
fi

if ! command_exists curl; then
  echo "${red}Erro: curl não está instalado.${reset}" >&2
  exit 1
fi

#---- inicia script
echo "${yellow}[+] Instalando ambiente de desenvolvimento em Go${reset}"

# Instala Go se ainda não está instalado
echo "${yellow}[+] Instalando Go${reset}"
sleep 1
GOversion=$(curl -L -s "https://golang.org/VERSION?m=text" | head -n 1)
wget https://go.dev/dl/${GOversion}.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf ${GOversion}.linux-amd64.tar.gz
rm -f ${GOversion}.linux-amd64.tar.gz

# Adiciona Go ao PATH
if ! grep -q 'export PATH=$PATH:/usr/local/go/bin' "$HOME/.profile"; then
  echo 'export PATH=$PATH:/usr/local/go/bin' >>"$HOME/.profile"
  source "$HOME/.profile"
fi

echo "${yellow}[*] Feito.${reset}"
