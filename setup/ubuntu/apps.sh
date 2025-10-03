#!/bin/sh

red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

echo "${yellow}[+] Instalaando pacotes dependencias para Docker${reset}"
sudo apt install -y ca-certificates curl gnupg lsb-release

echo "${yellow}[+] Criando diretorio keyrings${reset}"
[ ! -d "/etc/apt/keyrings" ] && sudo mkdir -p /etc/apt/keyrings

echo "${yellow}[+] Adicionando assinatura GPG${reset}"
. /etc/os-release
if [ "$ID" = "ubuntu" ]; then
  DOCKER_BASE_URL="https://download.docker.com/linux/ubuntu"
  CODENAME="$(lsb_release -cs)"
else
  DOCKER_BASE_URL="https://download.docker.com/linux/debian"
  case "${VERSION_CODENAME:-}" in
    bookworm|bullseye|buster|trixie) CODENAME="${VERSION_CODENAME}" ;;
    *) CODENAME="bookworm" ;;
  esac
fi
curl -fsSL "${DOCKER_BASE_URL}/gpg" | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] ${DOCKER_BASE_URL} \
  ${CODENAME} stable" | sudo tee  >/dev/null

echo "${yellow}[+] Instalando pacotes do Docker${reset}"
sudo apt update
sudo apt install -y docker-ce zsh ripgrep npm docker-ce-cli containerd.io docker-compose-plugin zoxide

echo "${yellow}[+] Exportando PATH para pacotes Rust${reset}"
export PATH="$HOME/.cargo/bin:$PATH"

echo "${yellow}[+] Instalando pacotes via gerenciador cargo${reset}"
cargo install lsd
cargo install git-delta

echo "${yellow}[*] Feito. ${reset}"
