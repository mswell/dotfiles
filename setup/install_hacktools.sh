#!/usr/bin/env bash

DEBUG_STD="&>/dev/null"
DEBUG_ERROR="2>/dev/null"

# TERM COLORS
bred='\033[1;31m'
bblue='\033[1;34m'
yellow='\033[0;33m'
red='\033[0;31m'
reset='\033[0m'

declare -A gotools
gotools["fff"]="go install github.com/tomnomnom/fff@latest"
gotools["hakrawler"]="go install github.com/hakluke/hakrawler@latest"
gotools["tojson"]="go install github.com/tomnomnom/hacks/tojson@latest"
gotools["gowitness"]="go install github.com/sensepost/gowitness@latest"
gotools["rush"]="go install github.com/shenwei356/rush@latest"
gotools["naabu"]="go install github.com/projectdiscovery/naabu/cmd/naabu@latest"
gotools["hakcheckurl"]="go install github.com/hakluke/hakcheckurl@latest"
gotools["shuffledns"]="go install github.com/projectdiscovery/shuffledns/cmd/shuffledns@latest"
gotools["rescope"]="go install github.com/root4loot/rescope@latest"
gotools["gron"]="go install github.com/tomnomnom/gron@latest"
gotools["html-tool"]="go install github.com/tomnomnom/hacks/html-tool@latest"
gotools["Chaos"]="go install github.com/projectdiscovery/chaos-client/cmd/chaos@latest"
gotools["gf"]="go install github.com/tomnomnom/gf@latest"
gotools["qsreplace"]="go install github.com/tomnomnom/qsreplace@latest"
gotools["Amass"]="go install github.com/OWASP/Amass/v3/...@latest"
gotools["ffuf"]="go install github.com/ffuf/ffuf@latest"
gotools["assetfinder"]="go install github.com/tomnomnom/assetfinder@latest"
gotools["github-subdomains"]="go install github.com/gwen001/github-subdomains@latest"
gotools["cf-check"]="go install github.com/dwisiswant0/cf-check@latest"
gotools["waybackurls"]="go install github.com/tomnomnom/hacks/waybackurls@latest"
gotools["nuclei"]="go install github.com/projectdiscovery/nuclei/v2/cmd/nuclei@latest"
gotools["anew"]="go install github.com/tomnomnom/anew@latest"
gotools["notify"]="go install github.com/projectdiscovery/notify/cmd/notify@latest"
gotools["mildew"]="go install github.com/daehee/mildew/cmd/mildew@latest"
gotools["dirdar"]="go install github.com/m4dm0e/dirdar@latest"
gotools["unfurl"]="go install github.com/tomnomnom/unfurl@latest"
gotools["httpx"]="go install github.com/projectdiscovery/httpx/cmd/httpx@latest"
gotools["github-endpoints"]="go install github.com/gwen001/github-endpoints@latest"
gotools["dnsx"]="go install github.com/projectdiscovery/dnsx/cmd/dnsx@latest"
gotools["subfinder"]="go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest"
gotools["gauplus"]="go install github.com/bp0lr/gauplus@latest"
gotools["subjs"]="go install github.com/lc/subjs@latest"
gotools["Gxss"]="go install github.com/KathanP19/Gxss@latest"
gotools["gospider"]="go install github.com/jaeles-project/gospider@latest"
gotools["crobat"]="go install github.com/cgboal/sonarsearch/crobat@latest"
gotools["crlfuzz"]="go install github.com/dwisiswant0/crlfuzz/cmd/crlfuzz@latest"
gotools["dalfox"]="go install github.com/hahwul/dalfox/v2@latest"
gotools["puredns"]="go install github.com/d3mondev/puredns/v2@latest"
gotools["resolveDomains"]="go install github.com/Josue87/resolveDomains@latest"
gotools["interactsh-client"]="go install github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest"
gotools["gotator"]="go install github.com/Josue87/gotator@latest"
gotools["kxss"]="go install github.com/tomnomnom/hacks/kxss@latest"
gotools["GetJs"]="go install gi# TERM COLORS
bred='\033[1;31m'
bblue='\033[1;34m'
bgreen='\033[1;32m'
yellow='\033[0;33m'
red='\033[0;31m'
blue='\033[0;34m'
green='\033[0;32m'
reset='\033[0m'thub.com/003random/getJS@latest"

declare -A repos
repos["degoogle_hunter"]="six2dez/degoogle_hunter"
repos["pwndb"]="davidtavarez/pwndb"
repos["dnsvalidator"]="vortexau/dnsv# TERM COLORS
bred='\033[1;31m'
bblue='\033[1;34m'
bgreen='\033[1;32m'
yellow='\033[0;33m'
red='\033[0;31m'
blue='\033[0;34m'
green='\033[0;32m'
reset='\033[0m'alidator"
repos["dnsrecon"]="darkoperator/dnsrecon"
repos["theHarvester"]="laramies/theHarvester"
repos["brutespray"]="x90skysn3k/brutespray"
repos["wafw00f"]="EnableSecurity/wafw00f"
repos["gf"]="tomnomnom/gf"
repos["Gf-Patterns"]="1ndianl33t/Gf-Patterns"
repos["github-search"]="gwen001/github-search"
repos["ctfr"]="UnaPibaGeek/ctfr"
repos["LinkFinder"]="dark-warlord14/LinkFinder"
repos["Corsy"]="s0md3v/Corsy"
repos["CMSeeK"]="Tuhinshubhra/CMSeeK"
repos["fav-up"]="pielco11/fav-up"
repos["Interlace"]="codingo/Interlace"
repos["massdns"]="blechschmidt/massdns"
repos["OpenRedireX"]="devanshbatham/OpenRedireX"
repos["GitDorker"]="obheda12/GitDorker"
repos["testssl"]="drwetter/testssl.sh"
repos["ip2provider"]="oldrho/ip2provider"
repos["commix"]="commixproject/commix"
repos["JSA"]="six2dez/JSA"
repos["urldedupe"]="ameenmaali/urldedupe"
repos["cloud_enum"]="initstring/cloud_enum"
repos["JSScanner"]="0x240x23elu/JSScanner"
repos["GitTools"]="internetwache/GitTools"
repos["SecretFinder"]="m4ll0k/SecretFinder"
repos["M4ll0k"]="m4ll0k/BBTz"
repos["Git-Dumper"]="arthaud/git-dumper"
repos["CORStest"]="RUB-NDS/CORStest"

if [[ $(id -u | grep -o '^0$') == "0" ]]; then
    SUDO=" "
else
    if sudo -n false 2>/dev/null; then
        printf "${bred} Is strongly recommended to add your user to sudoers${reset}\n"
    fi
    SUDO="sudo"
fi

dir="$HOME/Tools"

mkdir -p ~/.gf
mkdir -p ~/Tools/
mkdir -p ~/.config/notify/
mkdir -p ~/.config/amass/
mkdir -p ~/.config/nuclei/
mkdir -p ~/Lists/

printf "${bblue} Running: Installing Golang tools (${#gotools[@]})${reset}\n\n"
go env -w GO111MODULE=auto
go_step=0
for gotool in "${!gotools[@]}"; do
    go_step=$((go_step + 1))
    eval ${gotools[$gotool]} $DEBUG_STD
    exit_status=$?
    if [ $exit_status -eq 0 ]; then
        printf "${yellow} $gotool installed (${go_step}/${#gotools[@]})${reset}\n"
    else
        printf "${red} Unable to install $gotool, try manually (${go_step}/${#gotools[@]})${reset}\n"
        double_check=true
    fi
done

eval wget -nc -O ~/Lists/XSS-OFJAAAH.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Fuzzing/XSS/XSS-OFJAAAH.txt
eval wget -nc -O ~/Lists/params.txt https://raw.githubusercontent.com/s0md3v/Arjun/master/arjun/db/params.txt

eval wget -N -c https://bootstrap.pypa.io/get-pip.py $DEBUG_STD && eval python3 get-pip.py $DEBUG_STD
eval rm -f get-pip.py $DEBUG_STD
eval ln -s /usr/local/bin/pip3 /usr/bin/pip3 $DEBUG_STD
eval pip3 install -I -r requirements.txt $DEBUG_STD

eval wget -nc -O ~/.gf/potential.json https://raw.githubusercontent.com/devanshbatham/ParamSpider/master/gf_profiles/potential.json $DEBUG_STD

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
    if [ -s "setup.py" ]; then
        eval $SUDO python3 setup.py install $DEBUG_STD
    fi
    if [ "massdns" = "$repo" ]; then
        eval make $DEBUG_STD && strip -s bin/massdns && eval $SUDO cp bin/massdns /usr/bin/ $DEBUG_ERROR
    elif [ "gf" = "$repo" ]; then
        eval cp -r examples ~/.gf $DEBUG_ERROR
    elif [ "Gf-Patterns" = "$repo" ]; then
        eval mv *.json ~/.gf $DEBUG_ERROR
    elif [ "urldedupe" = "$repo" ]; then
        eval cmake CMakeLists.txt $DEBUG_STD
        eval make $DEBUG_STD
        eval $SUDO cp ./urldedupe /usr/bin/ $DEBUG_STD
    fi
    cd "$dir" || {
        echo "Failed to cd to $dir in ${FUNCNAME[0]} @ line ${LINENO}"
        exit 1
    }
done
