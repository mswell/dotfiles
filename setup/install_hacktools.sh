#!/usr/bin/env bash

DEBUG_STD="&>/dev/null"
DEBUG_ERROR="2>/dev/null"

# TERM COLORS
bblue='\033[1;34m'
yellow='\033[1;33m'
red='\033[1;31m'
reset='\033[0m'

dir="$HOME/Tools"

printf "${bblue} Running: Installing Golang tools ${reset}\n\n"

# Configura o ambiente Go
go env -w GO111MODULE=auto

# Função para instalar ferramentas Go
install_tool() {
    local tool="$1"
    local repo="$2"
    echo "Installing $tool"
    go install "$repo@latest"
}

# Lista de ferramentas Go para instalar
declare -A go_tools=(
    ["fff"]="github.com/tomnomnom/fff"
    ["hakrawler"]="github.com/hakluke/hakrawler"
    ["tojson"]="github.com/tomnomnom/hacks/tojson"
    ["gowitness"]="github.com/sensepost/gowitness"
    ["Rush"]="github.com/shenwei356/rush"
    ["Gf-Patterns"]="1ndianl33t/Gf-Patterns"
    ["LinkFinder"]="dark-warlord14/LinkFinder"
    ["Naabu"]="github.com/projectdiscovery/naabu/v2/cmd/naabu"
    ["hakcheckurl"]="github.com/hakluke/hakcheckurl"
    ["shuffledns"]="github.com/projectdiscovery/shuffledns/cmd/shuffledns"
    ["gron"]="github.com/tomnomnom/gron"
    ["html-tool"]="github.com/tomnomnom/hacks/html-tool"
    ["Chaos"]="github.com/projectdiscovery/chaos-client/cmd/chaos"
    ["gf"]="github.com/tomnomnom/gf"
    ["qsreplace"]="github.com/tomnomnom/qsreplace"
    ["Amass"]="github.com/owasp-amass/amass/v4/..."
    ["ffuf"]="github.com/ffuf/ffuf"
    ["assetfinder"]="github.com/tomnomnom/assetfinder"
    ["github-subdomains"]="github.com/gwen001/github-subdomains"
    ["waybackurls"]="github.com/tomnomnom/hacks/waybackurls"
    ["nuclei"]="github.com/projectdiscovery/nuclei/v2/cmd/nuclei"
    ["anew"]="github.com/tomnomnom/anew"
    ["notify"]="github.com/projectdiscovery/notify/cmd/notify"
    ["mildew"]="github.com/daehee/mildew/cmd/mildew"
    ["dirdar"]="github.com/m4dm0e/dirdar"
    ["unfurl"]="github.com/tomnomnom/unfurl"
    ["httpx"]="github.com/projectdiscovery/httpx/cmd/httpx"
    ["dnsx"]="github.com/projectdiscovery/dnsx/cmd/dnsx"
    ["subfinder"]="github.com/projectdiscovery/subfinder/v2/cmd/subfinder"
    ["gauplus"]="github.com/bp0lr/gauplus"
    ["subjs"]="github.com/lc/subjs"
    ["Gxss"]="github.com/KathanP19/Gxss"
    ["gospider"]="github.com/jaeles-project/gospider"
    ["dalfox"]="github.com/hahwul/dalfox/v2"
    ["puredns"]="github.com/d3mondev/puredns/v2"
    ["interactsh-client"]="github.com/projectdiscovery/interactsh/cmd/interactsh-client"
    ["gotator"]="github.com/Josue87/gotator"
    ["kxss"]="github.com/tomnomnom/hacks/kxss"
    ["GetJs"]="github.com/003random/getJS"
    ["Goop"]="github.com/deletescape/goop"
    ["Meg"]="github.com/tomnomnom/meg"
    ["Freq"]="github.com/takshal/freq"
    ["Sdlookup"]="github.com/j3ssie/sdlookup"
    ["Airixss"]="github.com/ferreiraklet/airixss"
    ["Nilo"]="github.com/ferreiraklet/nilo"
    ["haip2host"]="github.com/hakluke/haip2host"
    ["scopein"]="github.com/ferreiraklet/scopein"
    ["metabigor"]="github.com/j3ssie/metabigor"
    ["hakrevdns"]="github.com/hakluke/hakrevdns"
    ["alterx"]="github.com/projectdiscovery/alterx/cmd/alterx"
    ["katana"]="github.com/projectdiscovery/katana/cmd/katana"
    ["sourcemapper"]="https://github.com/denandz/sourcemapper"
)

# Instala todas as ferramentas Go
for tool in "${!go_tools[@]}"; do
    install_tool "$tool" "${go_tools[$tool]}"
done

# Lista de repositórios para clonar
declare -A repos=(
    ["gf"]="tomnomnom/gf"
    ["Gf-Patterns"]="1ndianl33t/Gf-Patterns"
    ["LinkFinder"]="dark-warlord14/LinkFinder"
    ["Interlace"]="codingo/Interlace"
    ["JSScanner"]="0x240x23elu/JSScanner"
    ["GitTools"]="internetwache/GitTools"
    ["SecretFinder"]="m4ll0k/SecretFinder"
    ["M4ll0k"]="m4ll0k/BBTz"
    ["Git-Dumper"]="arthaud/git-dumper"
    ["CORStest"]="RUB-NDS/CORStest"
    ["Knock"]="guelfoweb/knock"
    ["Photon"]="s0md3v/Photon"
    ["Sudomy"]="screetsec/Sudomy"
    ["DNSvalidator"]="vortexau/dnsvalidator"
    ["Massdns"]="blechschmidt/massdns"
    ["Dirsearch"]="maurosoria/dirsearch"
    ["Knoxnl"]="xnl-h4ck3r/knoxnl"
    ["xnLinkFinder"]="xnl-h4ck3r/xnLinkFinder"
    ["MSwellDOTS"]="mswell/dotfiles"
    ["Waymore"]="xnl-h4ck3r/waymore"
    ["altdns"]="infosec-au/altdns"
    ["XSStrike-Reborn"]="ItsIgnacioPortal/XSStrike-Reborn"
)

# Cria diretórios necessários
mkdir -p ~/.gf ~/Tools/ ~/Lists/ ~/.config/notify/ ~/.config/amass/ ~/.config/nuclei/

# Instala pacotes Python
pip3 install uro bhedak

# Baixa listas de wordlists
declare -A wordlists=(
    ["XSS-OFJAAAH.txt"]="https://raw.githubusercontent.com/danielmiessler/SecLists/master/Fuzzing/XSS/XSS-OFJAAAH.txt"
    ["params.txt"]="https://raw.githubusercontent.com/s0md3v/Arjun/master/arjun/db/params.txt"
    ["raft-large-directories-lowercase.txt"]="https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-directories-lowercase.txt"
    ["potential.json"]="https://raw.githubusercontent.com/devanshbatham/ParamSpider/master/gf_profiles/potential.json"
    ["httparchive_apiroutes_2022_03_28.txt"]="https://wordlists-cdn.assetnote.io/data/automated/httparchive_apiroutes_2022_03_28.txt"
    ["raft-large-files.txt"]="https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/raft-large-files.txt"
    ["raft-large-words-lowercase.txt"]="https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/raft-large-words-lowercase.txt"
    ["namelist.txt"]="https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/namelist.txt"
    ["directory-list-2.3-small.txt"]="https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/directory-list-2.3-small.txt"
    ["web-extensions.txt"]="https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/web-extensions.txt"
    ["subdomains-top1million-5000.txt"]="https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt"
    ["burp-parameter-names.txt"]="https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/burp-parameter-names.txt"
    ["xato-net-10-million-usernames.txt"]="https://raw.githubusercontent.com/danielmiessler/SecLists/master/Usernames/xato-net-10-million-usernames.txt"
    ["subdomains-top1million-110000.txt"]="https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-110000.txt"
    ["raft-large-words.txt"]="https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-words.txt"
    ["all.txt"]="https://gist.githubusercontent.com/jhaddix/86a06c5dc309d08580a018c66354a056/raw/96f4e51d96b2203f19f6381c8c545b278eaa0837/all.txt"
)

for list in "${!wordlists[@]}"; do
    wget -nc -O "$HOME/Lists/$list" "${wordlists[$list]}"
done

printf "${bblue}\n Running: Installing repositories (${#repos[@]})${reset}\n\n"

cd "$dir" || {
    echo "Failed to cd to $dir in ${FUNCNAME[0]} @ line ${LINENO}"
    exit 1
}

# Função para instalar repositórios
install_repo() {
    local repo="$1"
    local url="$2"
    echo "Cloning $repo"
    git clone "https://github.com/$url" "$dir/$repo" $DEBUG_STD
    cd "$dir/$repo" || return
    git pull $DEBUG_STD
    if [ -s "requirements.txt" ]; then
        pip3 install -r requirements.txt $DEBUG_STD
    fi
    if [ -s "setup.py" ]; then
        python3 setup.py install $DEBUG_STD
    fi
    if [ -s "Makefile" ]; then
        make $DEBUG_STD
        make install $DEBUG_STD
    fi
    if [ "$repo" = "gf" ]; then
        cp -r examples/*.json ~/.gf $DEBUG_ERROR
    elif [ "$repo" = "Gf-Patterns" ]; then
        mv *.json ~/.gf $DEBUG_ERROR
    fi
    cd "$dir" || return
}

# Instala todos os repositórios
for repo in "${!repos[@]}"; do
    install_repo "$repo" "${repos[$repo]}"
done

# Adiciona templates personalizados do gf
echo "Add my gf templates"
cp -r "$HOME/Tools/MSwellDOTS/config/home/.gf/"*.json "$HOME/.gf/"
