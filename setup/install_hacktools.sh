#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
DOTFILES=${DOTFILES:-$(cd -- "$SCRIPT_DIR/.." &>/dev/null && pwd)}
export DOTFILES

# Source central environment configuration from the repository, regardless of invocation path.
source "$DOTFILES/config/zsh/env.zsh"
source "$DOTFILES/setup/lib/hacktools_inventory.sh"

# TERM COLORS
bblue='\033[1;34m'
green='\033[0;32m'
reset='\033[0m'
red='\033[0;31m'
yellow='\033[1;33m'

if [[ "${DOTFILES_DRY_RUN:-0}" == "1" ]]; then
    hacktools_inventory_plan
    return 0 2>/dev/null || exit 0
fi

# Check for sudo privileges
if [[ $EUID -ne 0 ]]; then
    SUDO='sudo'
else
    SUDO=''
fi

printf "${bblue} Sourcing environment variables ${reset}\n"
printf "${yellow} TOOLS_PATH is set to: %s ${reset}\n" "$TOOLS_PATH"
printf "${yellow} LISTS_PATH is set to: %s ${reset}\n\n" "$LISTS_PATH"

require_cmd() {
    local cmd="$1"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        printf "${red}[!] Required command not found: %s${reset}\n" "$cmd"
        exit 1
    fi
}

require_cmd git
require_cmd wget
require_cmd python3

printf "${bblue} Running: Installing Golang tools ${reset}\n\n"

# Detect Go installation
if command -v go >/dev/null 2>&1; then
    printf "${green}[+] Go found in PATH: %s${reset}\n" "$(command -v go)"
elif [[ -f "/usr/local/go/bin/go" ]]; then
    printf "${yellow}[*] Go found in /usr/local/go, adding to PATH${reset}\n"
    export PATH="$PATH:/usr/local/go/bin"
elif [[ -f "/usr/bin/go" ]]; then
    printf "${green}[+] Go found in /usr/bin${reset}\n"
    export PATH="$PATH:/usr/bin"
else
    printf "${red}[!] Go is not installed. Installing manually...${reset}\n"
    source "$DOTFILES/setup/install_golang.sh"
fi

go env -w GO111MODULE=auto

printf "${bblue} Installing ProjectDiscovery tools via go install ${reset}\n"
for _pd_item in "${PROJECTDISCOVERY_PACKAGES[@]}"; do
    IFS='|' read -r _pd_tool _pd_pkg <<< "$_pd_item"
    if command -v "$_pd_tool" >/dev/null 2>&1; then
        printf "${yellow}[*] %s already installed, skipping${reset}\n" "$_pd_tool"
    else
        printf "${bblue}[+] Installing %s${reset}\n" "$_pd_tool"
        go install "${_pd_pkg}@latest"
    fi
done
unset _pd_item _pd_tool _pd_pkg

install_go_tool() {
    local tool="$1"
    local repo="$2"
    local tool_lower
    tool_lower=$(echo "$tool" | tr '[:upper:]' '[:lower:]')
    if command -v "$tool" >/dev/null 2>&1 || command -v "$tool_lower" >/dev/null 2>&1; then
        printf "${yellow}Tool %s is already installed, skipping.${reset}\n" "$tool"
        return 0
    fi
    printf "Installing %s\n" "$tool"
    go install "$repo@latest"
}

for item in "${GO_TOOLS[@]}"; do
    IFS='|' read -r tool repo <<< "$item"
    install_go_tool "$tool" "$repo"
done

mkdir -p ~/.gf "$TOOLS_PATH" "$LISTS_PATH" ~/.config/notify/ ~/.config/amass/ ~/.config/nuclei/

# Install uro in user site-packages (PEP 668 compliant)
python3 -m pip install --user uro

hacktools_download_wordlists

printf "${bblue}\n Running: Installing repositories (%s)${reset}\n\n" "${#REPOSITORY_TOOLS[@]}"
cd "$TOOLS_PATH" || {
    echo "Failed to cd to $TOOLS_PATH in ${FUNCNAME[0]} @ line ${LINENO}"
    exit 1
}

repos_step=0
for item in "${REPOSITORY_TOOLS[@]}"; do
    IFS='|' read -r repo github_repo <<< "$item"
    repos_step=$((repos_step + 1))
    repo_path="$TOOLS_PATH/$repo"

    if [[ -d "$repo_path/.git" ]]; then
        printf "${yellow}Repository %s already exists. Pulling for updates... (%s/%s)${reset}\n" "$repo" "$repos_step" "${#REPOSITORY_TOOLS[@]}"
        cd "$repo_path"
        git pull >/dev/null 2>&1 || exit_status=$?
        exit_status=${exit_status:-0}
    else
        printf "${yellow}Cloning %s... (%s/%s)${reset}\n" "$repo" "$repos_step" "${#REPOSITORY_TOOLS[@]}"
        git clone "https://github.com/$github_repo" "$repo_path" >/dev/null 2>&1 || exit_status=$?
        exit_status=${exit_status:-0}
    fi

    if [[ $exit_status -ne 0 ]]; then
        printf "${red}Could not clone or pull %s. Skipping dependencies.${reset}\n" "$repo"
    else
        cd "$repo_path" || continue

        if [[ -s "requirements.txt" ]]; then
            python3 -m pip install --user -r requirements.txt >/dev/null 2>&1
        fi
        if [[ -s "setup.py" ]]; then
            python3 -m pip install --user . >/dev/null 2>&1
        fi
        if [[ -s "Makefile" ]]; then
            $SUDO make >/dev/null 2>&1 || printf "${yellow}[*] make failed for %s — skipping build${reset}\n" "$repo"
            $SUDO make install >/dev/null 2>&1 || true
        fi
        if [[ "gf" == "$repo" ]]; then
            cp -r examples/*.json ~/.gf 2>/dev/null || true
        elif [[ "Gf-Patterns" == "$repo" ]]; then
            mv ./*.json ~/.gf 2>/dev/null || true
        fi
    fi

    unset exit_status
    cd "$TOOLS_PATH" || {
        echo "Failed to cd back to $TOOLS_PATH in ${FUNCNAME[0]} @ line ${LINENO}"
        exit 1
    }
done

printf "${bblue} Adding my gf templates ${reset}\n"
if compgen -G "$DOTFILES/config/home/.gf/*.json" >/dev/null; then
    cp -r "$DOTFILES"/config/home/.gf/*.json "$HOME"/.gf/
else
    printf "${yellow} No custom gf templates found in DOTFILES repo.${reset}\n"
fi

# Generate recursive.txt for ffuf recursive fuzzing (dirsearch + raft-large combined)
RECURSIVE_LIST="$LISTS_PATH/recursive.txt"
if [[ -f "$LISTS_PATH/dirsearch-dicc.txt" && -f "$LISTS_PATH/raft-large-directories-lowercase.txt" ]]; then
    printf "${bblue} Generating recursive.txt wordlist ${reset}\n"
    cat "$LISTS_PATH/dirsearch-dicc.txt" "$LISTS_PATH/raft-large-directories-lowercase.txt" | sort -u > "$RECURSIVE_LIST"
    printf "${green} recursive.txt generated: %s entries${reset}\n" "$(wc -l < "$RECURSIVE_LIST")"
else
    printf "${yellow} Could not generate recursive.txt — missing dirsearch or raft-large wordlist${reset}\n"
fi
