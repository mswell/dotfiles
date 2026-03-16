#!/bin/bash
set -euo pipefail
source "${DOTFILES}/setup/lib/common.sh"

echo "${yellow}[+] Installing Docker dependencies${reset}"
sudo apt install -y ca-certificates curl gnupg lsb-release

echo "${yellow}[+] Creating keyrings directory${reset}"
[ ! -d "/etc/apt/keyrings" ] && sudo mkdir -p /etc/apt/keyrings

echo "${yellow}[+] Adding GPG signature${reset}"
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
  ${CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "${yellow}[+] Installing Docker packages${reset}"
sudo apt update
sudo apt install -y docker-ce zsh ripgrep npm docker-ce-cli containerd.io docker-compose-plugin zoxide

echo "${yellow}[+] Exporting PATH for Rust packages${reset}"
export PATH="$HOME/.cargo/bin:$PATH"

echo "${yellow}[+] Installing packages via cargo${reset}"
cargo install lsd
cargo install git-delta

echo "${yellow}[*] Done.${reset}"
