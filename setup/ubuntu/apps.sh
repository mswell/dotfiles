#!/bin/sh

red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

echo "${yellow}[+] Instalaando pacotes dependencias para Docker${reset}"
sudo apt install ca-certificates curl gnupg lsb-release

echo "${yellow}[+] Criando diretorio keyrings${reset}"
[ ! -d "/etc/apt/keyrings" ] && sudo mkdir -p /etc/apt/keyrings

echo "${yellow}[+] Adicionando assinatura GPG${reset}"
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
	"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

echo "${yellow}[+] Instalando pacotes do Docker${reset}"
sudo apt update
sudo apt install -y docker-ce zsh ripgrep npm docker-ce-cli containerd.io docker-compose-plugin

echo "${yellow}[+] Exportando PATH para pacotes Rust${reset}"
export PATH="$HOME/.cargo/bin:$PATH"

echo "${yellow}[+] Instalando pacotes via gerenciador cargo${reset}"
cargo install lsd
cargo install git-delta

echo "${yellow}[*] Feito. ${reset}"
