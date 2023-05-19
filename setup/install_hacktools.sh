#!/usr/bin/env bash

DEBUG_STD="&>/dev/null"
DEBUG_ERROR="2>/dev/null"

# TERM COLORS
bblue='\033[1;34m'
reset='\033[0m'

dir="$HOME/Tools"

printf "${bblue} Running: Installing Golang tools ${reset}\n\n"

go env -w GO111MODULE=auto


install_tool() {
  local tool="$1"
  local repo="$2"
  echo "Installing $tool"
  go install $repo@latest
}

install_tools "fff" "github.com/tomnomnom/fff"
install_tools "hakrawler" "github.com/hakluke/hakrawler"
install_tools "tojson" "github.com/tomnomnom/hacks/tojson"
install_tools "gowitness" "github.com/sensepost/gowitness"
install_tools "Rush" "github.com/shenwei356/rush"
install_tools "Gf-Patterns" "1ndianl33t/Gf-Patterns"
install_tools "LinkFinder" "dark-warlord14/LinkFinder"
install_tools "Naabu" "github.com/projectdiscovery/naabu/v2/cmd/naabu"
install_tools "hakcheckurl" "github.com/hakluke/hakcheckurl"
install_tools "shuffledns" "github.com/projectdiscovery/shuffledns/cmd/shuffledns"
install_tools "gron" "github.com/tomnomnom/gron"
install_tools "html-tool" "github.com/tomnomnom/hacks/html-tool"
install_tools "Chaos" "github.com/projectdiscovery/chaos-client/cmd/chaos"
install_tools "gf" "github.com/tomnomnom/gf"
install_tools "qsreplace" "github.com/tomnomnom/qsreplace"
install_tools "Amass" "github.com/owasp-amass/amass/v3/...@"
install_tools "ffuf" "github.com/ffuf/ffuf"
install_tools "assetfinder" "github.com/tomnomnom/assetfinder"
install_tools "github-subdomains" "github.com/gwen001/github-subdomains"
install_tools "waybackurls" "github.com/tomnomnom/hacks/waybackurls"
install_tools "nuclei" "github.com/projectdiscovery/nuclei/v2/cmd/nuclei"
install_tools "anew" "github.com/tomnomnom/anew"
install_tools "notify" "github.com/projectdiscovery/notify/cmd/notify"
install_tools "mildew" "github.com/daehee/mildew/cmd/mildew"
install_tools "dirdar" "github.com/m4dm0e/dirdar"
install_tools "unfurl" "github.com/tomnomnom/unfurl"
install_tools "httpx" "github.com/projectdiscovery/httpx/cmd/httpx"
install_tools "dnsx" "github.com/projectdiscovery/dnsx/cmd/dnsx"
install_tools "subfinder" "github.com/projectdiscovery/subfinder/v2/cmd/subfinder"
install_tools "gauplus" "github.com/bp0lr/gauplus"
install_tools "subjs" "github.com/lc/subjs"
install_tools "Gxss" "github.com/KathanP19/Gxss"
install_tools "gospider" "github.com/jaeles-project/gospider"
install_tools "dalfox" "github.com/hahwul/dalfox/v2"
install_tools "puredns" "github.com/d3mondev/puredns/v2"
install_tools "interactsh-client" "github.com/projectdiscovery/interactsh/cmd/interactsh-client"
install_tools "gotator" "github.com/Josue87/gotator"
install_tools "kxss" "github.com/tomnomnom/hacks/kxss"
install_tools "GetJs" "github.com/003random/getJS"
install_tools "Goop" "github.com/deletescape/goop"
install_tools "Meg" "github.com/tomnomnom/meg"
install_tools "Freq" "github.com/takshal/freq"
install_tools "Sdlookup" "github.com/j3ssie/sdlookup"
install_tools "Airixss" "github.com/ferreiraklet/airixss"
install_tools "Nilo" "github.com/ferreiraklet/nilo"
install_tools "haip2host" "github.com/hakluke/haip2host"
install_tools "scopein" "github.com/ferreiraklet/scopein"
install_tools "metabigor" "github.com/j3ssie/metabigor"
install_tools "hakrevdns" "github.com/hakluke/hakrevdns"
install_tools "alterx" "github.com/projectdiscovery/alterx/cmd/alterx"
install_tools "katana" "github.com/projectdiscovery/katana/cmd/katana"

declare -A repos
repos["gf"]="tomnomnom/gf"
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
repos["MSwellDOTS"]="mswell/dotfiles"
repos["Waymore"]="xnl-h4ck3r/waymore"
repos["altdns"]="infosec-au/altdns"
repos["XSStrike-Reborn"]="ItsIgnacioPortal/XSStrike-Reborn"


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
eval wget -nc -O ~/.gf/potential.json https://raw.githubusercontent.com/devanshbatham/ParamSpider/master/gf_profiles/potential.json
eval wget -nc -O ~/Lists/httparchive_apiroutes_2022_03_28.txt https://wordlists-cdn.assetnote.io/data/automated/httparchive_apiroutes_2022_03_28.txt
eval wget -nc -O ~/Lists/raft-large-files.txt https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/raft-large-files.txt
eval wget -nc -O ~/Lists/raft-large-words-lowercase.txt https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/raft-large-words-lowercase.txt
eval wget -nc -O $HOME/Lists/namelist.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/namelist.txt
eval wget -nc -O $HOME/Lists/directory-list-2.3-small.txt ehttps://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/directory-list-2.3-small.txt
eval wget -nc -O $HOME/Lists/web-extensions.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/web-extensions.txt
eval wget -nc -O $HOME/Lists/subdomains-top1million-5000.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt
eval wget -nc -O $HOME/Lists/burp-parameter-names.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/burp-parameter-names.txt
eval wget -nc -O $HOME/Lists/xato-net-10-million-usernames.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Usernames/xato-net-10-million-usernames.txt
eval wget -nc -O $HOME/Lists/subdomains-top1million-110000.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-110000.txt
eval wget -nc -O $HOME/Lists/raft-large-words.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-words.txt
eval wget -nc -O $HOME/Lists/all.txt https://gist.githubusercontent.com/jhaddix/86a06c5dc309d08580a018c66354a056/raw/96f4e51d96b2203f19f6381c8c545b278eaa0837/all.txt


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
    if [ "gf" = "$repo" ]; then
        eval cp -r examples/*.json ~/.gf $DEBUG_ERROR
    elif [ "Gf-Patterns" = "$repo" ]; then
        eval mv *.json ~/.gf $DEBUG_ERROR
    fi
    cd "$dir" || {
        echo "Failed to cd to $dir in ${FUNCNAME[0]} @ line ${LINENO}"
        exit 1
    }
done

echo "Add my gf templates"
cp -r $HOME/Tools/MSwellDOTS/config/home/.gf/*.json $HOME/.gf/

