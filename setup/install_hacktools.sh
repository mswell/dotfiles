#!/usr/bin/env bash

DEBUG_STD="&>/dev/null"
DEBUG_ERROR="2>/dev/null"

# TERM COLORS
bblue='\033[1;34m'

printf "${bblue} Running: Installing Golang tools (${#gotools[@]})${reset}\n\n"

go env -w GO111MODULE=auto

echo "Install fff"
go install github.com/tomnomnom/fff@latest
echo "Install hakrawler"
go install github.com/hakluke/hakrawler@latest
echo "Install tojson"
go install github.com/tomnomnom/hacks/tojson@latest
echo "Install gowitness"
go install github.com/sensepost/gowitness@latest
echo "Install rush"
go install github.com/shenwei356/rush@latest
echo "Install naabu"
go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest
echo "Install hakcheckurl"
go install github.com/hakluke/hakcheckurl@latest
echo "Install shuffledns"
go install github.com/projectdiscovery/shuffledns/cmd/shuffledns@latest
echo "Install rescope"
go install github.com/root4loot/rescope@latest
echo "Install gron"
go install github.com/tomnomnom/gron@latest
echo "Install html-tool"
go install github.com/tomnomnom/hacks/html-tool@latest
echo "Install Chaos"
go install github.com/projectdiscovery/chaos-client/cmd/chaos@latest
echo "Install gf"
go install github.com/tomnomnom/gf@latest
echo "Install qsreplace"
go install github.com/tomnomnom/qsreplace@latest
echo "Install Amass"
go install github.com/OWASP/Amass/v3/...@latest
echo "Install ffuf"
go install github.com/ffuf/ffuf@latest
echo "Install assetfinder"
go install github.com/tomnomnom/assetfinder@latest
echo "Install github-subdomains"
go install github.com/gwen001/github-subdomains@latest
echo "Install cf-check"
go install github.com/dwisiswant0/cf-check@latest
echo "Install waybackurls"
go install github.com/tomnomnom/hacks/waybackurls@latest
echo "Install nuclei"
go install -v github.com/projectdiscovery/nuclei/v2/cmd/nuclei@latest
echo "Install anew"
go install github.com/tomnomnom/anew@latest
echo "Install notify"
go install github.com/projectdiscovery/notify/cmd/notify@latest
echo "Install mildew"
go install github.com/daehee/mildew/cmd/mildew@latest
echo "Install dirdar"
go install github.com/m4dm0e/dirdar@latest
echo "Install unfurl"
go install github.com/tomnomnom/unfurl@latest
echo "Install httpx"
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
echo "Install github-endpoints"
go install github.com/gwen001/github-endpoints@latest
echo "Install dnsx"
go install github.com/projectdiscovery/dnsx/cmd/dnsx@latest
echo "Install subfinder"
go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
echo "Install gauplus"
go install github.com/bp0lr/gauplus@latest
echo "Install subjs"
go install github.com/lc/subjs@latest
echo "Install Gxss"
go install github.com/KathanP19/Gxss@latest
echo "Install gospider"
go install github.com/jaeles-project/gospider@latest
echo "Install crobat"
go install github.com/cgboal/sonarsearch/crobat@latest
echo "Install crlfuzz"
go install github.com/dwisiswant0/crlfuzz/cmd/crlfuzz@latest
echo "Install dalfox"
go install github.com/hahwul/dalfox/v2@latest
echo "Install puredns"
go install github.com/d3mondev/puredns/v2@latest
echo "Install resolveDomains"
go install github.com/Josue87/resolveDomains@latest
echo "Install interactsh-client"
go install github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest
echo "Install gotator"
go install github.com/Josue87/gotator@latest
echo "Install kxss"
go install github.com/tomnomnom/hacks/kxss@latest
echo "Install GetJs"
go install github.com/003random/getJS@latest
echo "Install Goop"
go install github.com/deletescape/goop@latest
echo "Install Meg"
go install github.com/tomnomnom/meg@latest
echo "Install Freq"
go install github.com/takshal/freq@latest
echo "Install Sdlookup"
go install github.com/j3ssie/sdlookup@latest
echo "Install Sigurlfinder"
go install -v github.com/signedsecurity/sigurlfind3r/cmd/sigurlfind3r@latest
echo "Install Chromedp"
go install github.com/chromedp/chromedp@latest
echo "Install Airixss"
go install github.com/ferreiraklet/airixss@latest
echo "Install Nilo"
go install github.com/ferreiraklet/nilo@latest
echo "Install haip2host"
go install github.com/hakluke/hakip2host@latest
echo "Install scopein"
go install -v github.com/ferreiraklet/scopein@latest

declare -A repos
repos["MSwellDOTS"]="mswell/dotfiles"
repos["Gf-Patterns"]="1ndianl33t/Gf-Patterns"
repos["LinkFinder"]="dark-warlord14/LinkFinder"
repos["Interlace"]="codingo/Interlace"
repos["JSScanner"]="0x240x23elu/JSScanner"
repos["GitTools"]="internetwache/GitTools"
repos["SecretFinder"]="m4ll0k/SecretFinder"
repos["M4ll0k"]="m4ll0k/BBTz"
repos["Git-Dumper"]="arthaud/git-dumper"
repos["CORStest"]="RUB-NDS/CORStest"
repos["Knock"]="guelfoweb/knock"
repos["Photon"]="s0md3v/Photon"
repos["Sudomy"]="screetsec/Sudomy"
repos["DNSvalidator"]="vortexau/dnsvalidator"
repos["Massdns"]="blechschmidt/massdns"
repos["Dirsearch"]="maurosoria/dirsearch"
repos["Knoxnl"]="xnl-h4ck3r/knoxnl"
repos["xnLinkFinder"]="xnl-h4ck3r/xnLinkFinder"

dir="$HOME/Tools"

mkdir -p ~/.gf
mkdir -p ~/Tools/
mkdir -p ~/Lists/
mkdir -p ~/.config/notify/
mkdir -p ~/.config/amass/
mkdir -p ~/.config/nuclei/

pip3 install uro
pip3 install bhedak

eval wget -nc -O ~/Lists/XSS-OFJAAAH.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Fuzzing/XSS/XSS-OFJAAAH.txt
eval wget -nc -O ~/Lists/params.txt https://raw.githubusercontent.com/s0md3v/Arjun/master/arjun/db/params.txt
eval wget -nc -O ~/Lists/raft-large-directories-lowercase.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-directories-lowercase.txt
eval wget -nc -O ~/.gf/potential.json https://raw.githubusercontent.com/devanshbatham/ParamSpider/master/gf_profiles/potential.json $DEBUG_STD
eval wget -nc -O ~/Lists/httparchive_apiroutes_2022_03_28.txt https://wordlists-cdn.assetnote.io/data/automated/httparchive_apiroutes_2022_03_28.txt
eval wget -nc -O ~/Lists/raft-large-files.txt https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/raft-large-files.txt
eval wget -nc -O ~/Lists/raft-large-words-lowercase.txt https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/raft-large-words-lowercase.txt
printf "${bblue}\n Running: Installing repositories (${#repos[@]})${reset}\n\n"

cd "$dir" || {
    echo "Failed to cd to $dir in ${FUNCNAME[0]} @ line ${LINENO}"
    exit 1
}

# Standard repos installation
repos_step=0
for repo in "${!repos[@]}"; do
    repos_step=$((repos_step + 1))
    eval git clone https://github.com/${repos[$repo]} $dir/$repo $DEBUG_STD
    eval cd $dir/$repo $DEBUG_STD
    eval git pull $DEBUG_STD
    exit_status=$?
    if [ $exit_status -eq 0 ]; then
        printf "${yellow} $repo installed (${repos_step}/${#repos[@]})${reset}\n"
    else
        printf "${red} Unable to install $repo, try manually (${repos_step}/${#repos[@]})${reset}\n"
    fi
    if [ -s "requirements.txt" ]; then
        eval $SUDO pip3 install -r requirements.txt $DEBUG_STD
    fi
    if [ -s "setup.py" ]; then
        eval $SUDO python3 setup.py install $DEBUG_STD
    fi
    if [ -s "Makefile" ]; then
        eval $SUDO make $DEBUG_STD
        eval $SUDO make install $DEBUG_STD
    fi
    if [ "MSwellDOTS" = "$repo" ]; then
        eval cp -r config/home/.gf/*.json ~/.gf $DEBUG_ERROR
    elif [ "Gf-Patterns" = "$repo" ]; then
        eval mv *.json ~/.gf $DEBUG_ERROR
    fi
    cd "$dir" || {
        echo "Failed to cd to $dir in ${FUNCNAME[0]} @ line ${LINENO}"
        exit 1
    }
done
