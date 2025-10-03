#!/usr/bin/env bash

# Source the central environment configuration to ensure consistency
source "$(dirname "$0")/config/zsh/env.zsh"

DEBUG_STD="&>/dev/null"
DEBUG_ERROR="2>/dev/null"

# TERM COLORS
bblue='\033[1;34m'
reset='\033[0m'
red='\033[0;31m'
yellow='\033[1;33m'

# Check for sudo privileges
if [[ $EUID -ne 0 ]]; then
    SUDO='sudo'
else
    SUDO=''
fi

printf "${bblue} Sourcing environment variables ${reset}\n"

printf "${yellow} TOOLS_PATH is set to: $TOOLS_PATH ${reset}\n"
printf "${yellow} LISTS_PATH is set to: $LISTS_PATH ${reset}\n\n"

printf "${bblue} Running: Installing Golang tools ${reset}\n\n"

if ! command -v go >/dev/null 2>&1; then
  printf "${red}[!] Go is not installed or not present in PATH.${reset}\n"
  source "$(dirname "$0")/install_golang.sh"
fi

go env -w GO111MODULE=auto

# Install ProjectDiscovery Tool Manager (pdtm)
printf "${bblue} Installing ProjectDiscovery Tool Manager (pdtm) ${reset}\n"
go install github.com/projectdiscovery/pdtm/cmd/pdtm@latest

# Install ProjectDiscovery tools using pdtm
printf "${bblue} Installing ProjectDiscovery tools via pdtm ${reset}\n"
pdtm -install "naabu,shuffledns,chaos,nuclei,notify,httpx,dnsx,subfinder,interactsh-client,alterx,katana"

install_tool() {
    local tool="$1"
    local repo="$2"
    local tool_lower=$(echo "$tool" | tr '[:upper:]' '[:lower:]')
    if command -v "$tool" &>/dev/null || command -v "$tool_lower" &>/dev/null; then
        printf "${yellow}Tool $tool is already installed, skipping.${reset}\n"
        return
    fi
    echo "Installing $tool"
    go install $repo@latest
}

install_tool "fff" "github.com/tomnomnom/fff"
install_tool "tojson" "github.com/tomnomnom/hacks/tojson"
install_tool "Rush" "github.com/shenwei356/rush"
install_tool "gron" "github.com/tomnomnom/gron"
install_tool "html-tool" "github.com/tomnomnom/hacks/html-tool"
install_tool "gf" "github.com/tomnomnom/gf"
install_tool "qsreplace" "github.com/tomnomnom/qsreplace"
install_tool "Amass" "github.com/owasp-amass/amass/v4/..."
install_tool "ffuf" "github.com/ffuf/ffuf"
install_tool "assetfinder" "github.com/tomnomnom/assetfinder"
install_tool "github-subdomains" "github.com/gwen001/github-subdomains"
install_tool "waybackurls" "github.com/tomnomnom/hacks/waybackurls"
install_tool "anew" "github.com/tomnomnom/anew"
install_tool "dirdar" "github.com/m4dm0e/dirdar"
install_tool "unfurl" "github.com/tomnomnom/unfurl"
install_tool "gauplus" "github.com/bp0lr/gauplus"
install_tool "subjs" "github.com/lc/subjs"
install_tool "Gxss" "github.com/KathanP19/Gxss"
install_tool "gospider" "github.com/jaeles-project/gospider"
install_tool "puredns" "github.com/d3mondev/puredns/v2"
install_tool "kxss" "github.com/tomnomnom/hacks/kxss"
install_tool "GetJs" "github.com/003random/getJS"
install_tool "Meg" "github.com/tomnomnom/meg"
install_tool "Freq" "github.com/takshal/freq"
install_tool "Sdlookup" "github.com/j3ssie/sdlookup"
install_tool "Airixss" "github.com/ferreiraklet/airixss"
install_tool "Nilo" "github.com/ferreiraklet/nilo"
install_tool "metabigor" "github.com/j3ssie/metabigor"
install_tool "sourcemapper" "github.com/denandz/sourcemapper"

declare -A repos
repos["gf"]="tomnomnom/gf"
repos["Gf-Patterns"]="1ndianl33t/Gf-Patterns"
repos["Interlace"]="codingo/Interlace"
repos["JSScanner"]="0x240x23elu/JSScanner"
repos["GitTools"]="internetwache/GitTools"
repos["SecretFinder"]="m4ll0k/SecretFinder"
repos["M4ll0k"]="m4ll0k/BBTz"
repos["Git-Dumper"]="arthaud/git-dumper"
repos["Knock"]="guelfoweb/knock"
repos["Massdns"]="blechschmidt/massdns"
repos["Dirsearch"]="maurosoria/dirsearch"
repos["xnLinkFinder"]="xnl-h4ck3r/xnLinkFinder"
repos["MSwellDOTS"]="mswell/dotfiles"
repos["Waymore"]="xnl-h4ck3r/waymore"
repos["altdns"]="infosec-au/altdns"

mkdir -p ~/.gf
mkdir -p "$TOOLS_PATH"
mkdir -p "$LISTS_PATH"
mkdir -p ~/.config/notify/
mkdir -p ~/.config/amass/
mkdir -p ~/.config/nuclei/

pip3 install uro --break-system-packages

if [ ! -f "$LISTS_PATH/raft-large-directories-lowercase.txt" ]; then
    wget -nc -O "$LISTS_PATH/raft-large-directories-lowercase.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-directories-lowercase.txt
fi
if [ ! -f "$LISTS_PATH/raft-large-files.txt" ]; then
    wget -nc -O "$LISTS_PATH/raft-large-files.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-files.txt
fi
if [ ! -f "$LISTS_PATH/raft-large-words-lowercase.txt" ]; then
    wget -nc -O "$LISTS_PATH/raft-large-words-lowercase.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-words-lowercase.txt
fi
if [ ! -f "$NAMELIST_TXT" ]; then
    wget -nc -O "$NAMELIST_TXT" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/namelist.txt
fi
if [ ! -f "$LISTS_PATH/directory-list-2.3-small.txt" ]; then
    wget -nc -O "$LISTS_PATH/directory-list-2.3-small.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/refs/heads/master/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-small.txt
fi
if [ ! -f "$LISTS_PATH/web-extensions.txt" ]; then
    wget -nc -O "$LISTS_PATH/web-extensions.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/web-extensions.txt
fi
if [ ! -f "$LISTS_PATH/subdomains-top1million-5000.txt" ]; then
    wget -nc -O "$LISTS_PATH/subdomains-top1million-5000.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt
fi
if [ ! -f "$LISTS_PATH/burp-parameter-names.txt" ]; then
    wget -nc -O "$LISTS_PATH/burp-parameter-names.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/burp-parameter-names.txt
fi
if [ ! -f "$LISTS_PATH/xato-net-10-million-usernames.txt" ]; then
    wget -nc -O "$LISTS_PATH/xato-net-10-million-usernames.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Usernames/xato-net-10-million-usernames.txt
fi
if [ ! -f "$TOP_1M_110K_LIST" ]; then
    wget -nc -O "$TOP_1M_110K_LIST" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-110000.txt
fi
if [ ! -f "$LISTS_PATH/raft-large-words.txt" ]; then
    wget -nc -O "$LISTS_PATH/raft-large-words.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-words.txt
fi
if [ ! -f "$ALL_TXT_LIST" ]; then
    wget -nc -O "$ALL_TXT_LIST" https://gist.githubusercontent.com/jhaddix/86a06c5dc309d08580a018c66354a056/raw/96f4e51d96b2203f19f6381c8c545b278eaa0837/all.txt
fi

printf "${bblue}\n Running: Installing repositories (${#repos[@]})${reset}\n\n"

cd "$TOOLS_PATH" || {
    echo "Failed to cd to $TOOLS_PATH in ${FUNCNAME[0]} @ line ${LINENO}"
    exit 1
}

# Standard repos installation
repos_step=0
for repo in "${!repos[@]}"; do
    repos_step=$((repos_step + 1))
    repo_path="$TOOLS_PATH/$repo"

    if [ -d "$repo_path/.git" ]; then
        printf "${yellow}Repository $repo already exists. Pulling for updates... (${repos_step}/${#repos[@]})${reset}\n"
        cd "$repo_path"
        git pull &>/dev/null
        exit_status=$?
    else
        printf "${yellow}Cloning $repo... (${repos_step}/${#repos[@]})${reset}\n"
        git clone https://github.com/${repos[$repo]} "$repo_path" &>/dev/null
        exit_status=$?
    fi

    if [ $exit_status -ne 0 ]; then
        printf "${red}Could not clone or pull $repo. Skipping dependencies.${reset}\n"
    else
        # Install dependencies if clone/pull was successful
        cd "$repo_path" || continue

        if [ -s "requirements.txt" ]; then
            $SUDO pip3 install -r requirements.txt --break-system-packages --ignore-installed &>/dev/null
        fi
        if [ -s "setup.py" ]; then
            $SUDO pip3 install . --break-system-packages &>/dev/null
        fi
        if [ -s "Makefile" ]; then
            $SUDO make &>/dev/null
            $SUDO make install &>/dev/null
        fi
        if [ "gf" = "$repo" ]; then
            cp -r examples/*.json ~/.gf 2>/dev/null
        elif [ "Gf-Patterns" = "$repo" ]; then
            mv *.json ~/.gf 2>/dev/null
        fi
    fi

    cd "$TOOLS_PATH" || {
        echo "Failed to cd back to $TOOLS_PATH in ${FUNCNAME[0]} @ line ${LINENO}"
        exit 1
    }
done

printf "${bblue} Adding my gf templates ${reset}\n"
cp -r "$TOOLS_PATH"/MSwellDOTS/config/home/.gf/*.json "$HOME"/.gf/
