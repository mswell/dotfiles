#!/usr/bin/env bash

# Source the central environment configuration to ensure consistency
source "$(dirname "$0")/config/zsh/env.zsh"

DEBUG_STD="&>/dev/null"
DEBUG_ERROR="2>/dev/null"

# TERM COLORS
bblue='\033[1;34m'
reset='\033[0m'
red='\033[0;31m'

printf "${bblue} Sourcing environment variables ${reset}\n"
printf "${yellow} TOOLS_PATH is set to: $TOOLS_PATH ${reset}\n"
printf "${yellow} LISTS_PATH is set to: $LISTS_PATH ${reset}\n\n"

printf "${bblue} Running: Installing Golang tools ${reset}\n\n"

go env -w GO111MODULE=auto

install_tool() {
    local tool="$1"
    local repo="$2"
    local tool_lower=$(echo "$tool" | tr '[:upper:]' '[:lower:]')
    if command -v "$tool" &> /dev/null || command -v "$tool_lower" &> /dev/null;
 then
        printf "${yellow}Tool $tool is already installed, skipping.${reset}\n"
        return
    fi
    echo "Installing $tool"
    go install $repo@latest
}

install_tool "fff" "github.com/tomnomnom/fff"
install_tool "tojson" "github.com/tomnomnom/hacks/tojson"
install_tool "Rush" "github.com/shenwei356/rush"
install_tool "Naabu" "github.com/projectdiscovery/naabu/v2/cmd/naabu"
install_tool "shuffledns" "github.com/projectdiscovery/shuffledns/cmd/shuffledns"
install_tool "gron" "github.com/tomnomnom/gron"
install_tool "html-tool" "github.com/tomnomnom/hacks/html-tool"
install_tool "Chaos" "github.com/projectdiscovery/chaos-client/cmd/chaos"
install_tool "gf" "github.com/tomnomnom/gf"
install_tool "qsreplace" "github.com/tomnomnom/qsreplace"
install_tool "Amass" "github.com/owasp-amass/amass/v4/..."
install_tool "ffuf" "github.com/ffuf/ffuf"
install_tool "assetfinder" "github.com/tomnomnom/assetfinder"
install_tool "github-subdomains" "github.com/gwen001/github-subdomains"
install_tool "waybackurls" "github.com/tomnomnom/hacks/waybackurls"
install_tool "nuclei" "github.com/projectdiscovery/nuclei/v2/cmd/nuclei"
install_tool "anew" "github.com/tomnomnom/anew"
install_tool "notify" "github.com/projectdiscovery/notify/cmd/notify"
install_tool "dirdar" "github.com/m4dm0e/dirdar"
install_tool "unfurl" "github.com/tomnomnom/unfurl"
install_tool "httpx" "github.com/projectdiscovery/httpx/cmd/httpx"
install_tool "dnsx" "github.com/projectdiscovery/dnsx/cmd/dnsx"
install_tool "subfinder" "github.com/projectdiscovery/subfinder/v2/cmd/subfinder"
install_tool "gauplus" "github.com/bp0lr/gauplus"
install_tool "subjs" "github.com/lc/subjs"
install_tool "Gxss" "github.com/KathanP19/Gxss"
install_tool "gospider" "github.com/jaeles-project/gospider"
install_tool "puredns" "github.com/d3mondev/puredns/v2"
install_tool "interactsh-client" "github.com/projectdiscovery/interactsh/cmd/interactsh-client"
install_tool "kxss" "github.com/tomnomnom/hacks/kxss"
install_tool "GetJs" "github.com/003random/getJS"
install_tool "Meg" "github.com/tomnomnom/meg"
install_tool "Freq" "github.com/takshal/freq"
install_tool "Sdlookup" "github.com/j3ssie/sdlookup"
install_tool "Airixss" "github.com/ferreiraklet/airixss"
install_tool "Nilo" "github.com/ferreiraklet/nilo"
install_tool "metabigor" "github.com/j3ssie/metabigor"
install_tool "alterx" "github.com/projectdiscovery/alterx/cmd/alterx"
install_tool "katana" "github.com/projectdiscovery/katana/cmd/katana"
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

if [ ! -f "$LISTS_PATH/params.txt" ]; then
    wget -nc -O "$LISTS_PATH/params.txt" https://raw.githubusercontent.com/s0md3v/Arjun/master/arjun/db/params.txt
fi
if [ ! -f "$LISTS_PATH/raft-large-directories-lowercase.txt" ]; then
    wget -nc -O "$LISTS_PATH/raft-large-directories-lowercase.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-directories-lowercase.txt
fi
if [ ! -f "$HOME/.gf/potential.json" ]; then
    wget -nc -O "$HOME/.gf/potential.json" https://raw.githubusercontent.com/devanshbatham/ParamSpider/master/gf_profiles/potential.json
fi
if [ ! -f "$LISTS_PATH/httparchive_apiroutes_2022_03_28.txt" ]; then
    wget -nc -O "$LISTS_PATH/httparchive_apiroutes_2022_03_28.txt" https://wordlists-cdn.assetnote.io/data/automated/httparchive_apiroutes_2022_03_28.txt
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
    wget -nc -O "$LISTS_PATH/directory-list-2.3-small.txt" https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/directory-list-2.3-small.txt
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
        git pull $DEBUG_STD
        exit_status=$?
    else
        printf "${yellow}Cloning $repo... (${repos_step}/${#repos[@]})${reset}\n"
        git clone https://github.com/${repos[$repo]} "$repo_path" $DEBUG_STD
        exit_status=$?
    fi

    if [ $exit_status -ne 0 ]; then
        printf "${red}Could not clone or pull $repo. Skipping dependencies.${reset}\n"
    else
        # Install dependencies if clone/pull was successful
        cd "$repo_path" || continue

        if [ -s "requirements.txt" ]; then
            $SUDO pip3 install -r requirements.txt --break-system-packages $DEBUG_STD
        fi
        if [ -s "setup.py" ]; then
            $SUDO pip3 install . --break-system-packages $DEBUG_STD
        fi
        if [ -s "Makefile" ]; then
            $SUDO make $DEBUG_STD
            $SUDO make install $DEBUG_STD
        fi
        if [ "gf" = "$repo" ]; then
            cp -r examples/*.json ~/.gf $DEBUG_ERROR
        elif [ "Gf-Patterns" = "$repo" ]; then
            mv *.json ~/.gf $DEBUG_ERROR
        fi
    fi

    cd "$TOOLS_PATH" || {
        echo "Failed to cd back to $TOOLS_PATH in ${FUNCNAME[0]} @ line ${LINENO}"
        exit 1
    }
done


echo "Add my gf templates"
cp -r "$TOOLS_PATH"/MSwellDOTS/config/home/.gf/*.json "$HOME"/.gf/
