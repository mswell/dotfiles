## VARIABLES
ResultsPath="$HOME/Recon"
ToolsPath="$HOME/tools"
ConfigFolder="$HOME/tools/config"

certspotter(){
  curl -s https://certspotter.com/api/v0/certs\?domain\=$1 | jq '.[].dns_names[]' | sed 's/\"//g' | sed 's/\*\.//g' | sort -u | grep $1
}

crtsh(){
  curl -s https://crt.sh/?q=%.$1  | sed 's/<\/\?[^>]\+>//g' | grep $1
}

certnmap(){
  curl https://certspotter.com/api/v0/certs\?domain\=$1 | jq '.[].dns_names[]' | sed 's/\"//g' | sed 's/\*\.//g' | sort -u | grep $1  | nmap -T5 -Pn -sS -i - -$
} 

ipinfo(){
  curl http://ipinfo.io/$1
}
workspaceRecon(){
  name=$(echo $1 | unfurl -u domains)
  mkdir -p $name/$(date +%F)/
}

# Use the output of this to make .scope files for checkscope
getscope(){
  mkdir scope
  rescope --burp -u $1 -o scope/burpscope.json
  rescope --zap --name inscope -u $1 -o scope/zapscope.context
}

getfreshresolvers(){
  dnsvalidator -tL https://public-dns.info/nameservers.txt -threads 20 -o ~/tools/lists/my-lists/resolvers
}

## findomain
subdomain-enum(){
  echo "[+] Recon subdomains..."
  Domain=$(cat domain)
  chaos -d $Domain -o chaos.subdomains -silent
  cat chaos.subdomains >> all.subdomains
  subfinder -nW -t 1000 -o subfinder.subdomains -dL domain -all -silent
  cat subfinder.subdomains >> all.subdomains
  rm -f subfinder.subdomains
  # amass enum -nf all.subdomains -v -ip -active -config $ConfigFolder/amass/config.ini -min-for-recursive 3 -df domains -o amass.subdomains
  amass enum -nf all.subdomains -v -passive -df domain -o amass.subdomains  
  awk '{print $1}' amass.subdomains >> all.subdomains
  awk '{print $2}' amass.subdomains | tr ',' '\n' | grep -E '\b((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\.)){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\b' | sort -u >> ipv4.ipaddresses
  awk '{print $2}' amass.subdomains | tr ',' '\n' | grep -E '(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))' >> ipv6.addresses
  cat domain | assetfinder --subs-only | tee -a all.subdomains
}

# subdomain-brute () {
#   Domains=$(cat domains)
#   shuffledns -d $Domains -w $ToolsPath/lists/all.txt -r $ToolsPath/lists/my-lists/resolvers | tee -a all.subdomains

#   sort -u all.subdomains -o sorted.all.subdomains
#   rm -f all.subdomains 
# }
#############
#Ex: of .scope file is need the formative is regular expression that will sort the file like so
# .*\.example\.com$
# ^example\.com$
# .*\.example\.net$
# !.*outofscope\.example\.net$
##########
checkscope(){
  cat sorted.all.subdomains | inscope | tee -a inscope.sorted.all.subdomains 
}

###################################
# Learn how amass gets both ipv4&6 
# use massdns instead
####################################
resolving(){
   shuffledns -d domains -list sorted.all.subdomains -r ~/tools/lists/my-lists/resolvers -o resolved.subdomains 
}

getalive() {
  # sperate http and https compare if http doest have or redirect to https put in seperate file
  # compare if you go to https if it automaticly redirects to https if not when does it in the page if never
  # cat resolved.subdomains | httprobe -c 10 -t 3000 | tee all.alive.subdomains
  cat all.subdomains | anew clean.subdomains
  httpx -l clean.subdomains -threads 1000 -status-code -mc 200 -silent | anew http200
  httpx -l clean.subdomains -threads 1000 -timeout 50 -status-code -silent | anew domains
  cat domains | awk '{print $1}' | anew hosts
  # cat all.alive.subdomains | sed 's/\http\:\/\///g' |  sed 's/\https\:\/\///g' | sort -u | tee cleaned.all.alive.subdomains
  # cat sorted.all.subdomains | httpx -silent | tee all.alive.subdomains
}

getdata () {
  # hosts is for meg
  httpx -l clean.subdomains -threads 1000 -sr -silent
}

##########################################################
# use massdns
# use dns history to check for possible domain takeover
##########################################################
dnsrecords() {
  mkdir dnshistory
  cat all.alive.subdomains | sed 's/\http\:\/\///g' |  sed 's/\https\:\/\///g' | dnsprobe -s ~/tools/lists/my-lists/resolvers -r A -silent -o dnshistory/A-records
  cat all.alive.subdomains | sed 's/\http\:\/\///g' |  sed 's/\https\:\/\///g' | dnsprobe -s ~/tools/lists/my-lists/resolvers -r NS -silent -o dnshistory/NS-records
  cat all.alive.subdomains | sed 's/\http\:\/\///g' |  sed 's/\https\:\/\///g' | dnsprobe -s ~/tools/lists/my-lists/resolvers -r CNAME -silent -o dnshistory/CNAME-records
  cat all.alive.subdomains | sed 's/\http\:\/\///g' |  sed 's/\https\:\/\///g' | dnsprobe -s ~/tools/lists/my-lists/resolvers -r SOA -silent -o dnshistory/SOA-records
  cat all.alive.subdomains | sed 's/\http\:\/\///g' |  sed 's/\https\:\/\///g' | dnsprobe -s ~/tools/lists/my-lists/resolvers -r PTR -silent -o dnshistory/PTR-records
  cat all.alive.subdomains | sed 's/\http\:\/\///g' |  sed 's/\https\:\/\///g' | dnsprobe -s ~/tools/lists/my-lists/resolvers -r MX -silent -o dnshistory/MX-records
  cat all.alive.subdomains | sed 's/\http\:\/\///g' |  sed 's/\https\:\/\///g' | dnsprobe -s ~/tools/lists/my-lists/resolvers -r TXT  -silent -o dnshistory/TXT-records
  cat all.alive.subdomains | sed 's/\http\:\/\///g' |  sed 's/\https\:\/\///g' | dnsprobe -s ~/tools/lists/my-lists/resolvers -r AAAA -silent -o dnshistory/AAAA-records
}

screenshot() { 
  #python3 EyeWitness.py --web -f cleaned.alive.all.subdomains --user-agent "$UA" --show-selenium --resolve -d eyewitness-report
  cat cleaned.all.alive.subdomains | aquatone -chrome-path /usr/bin/google-chrome -scan-timeout 900 -http-timeout 6000 -out aqua_out
}

scanner() {
  # do udp scan as well
  # can't decide weither to put -p0-65535 or --top-ports 1000
  sudo ~/tools/masscan/bin/masscan -p0-65535 --open --rate 100000 --wait 0 -iL ipv4.ipaddresses -oX masscan.xml --exclude 255.255.255.255
  sudo rm paused.conf
  open_ports=$(cat masscan.xml | grep portid | cut -d "\"" -f 10 | sort -n | uniq | paste -sd,)
  cat masscan.xml | grep portid | cut -d "\"" -f 4 | sort -V | uniq >> nmap_targets.tmp
  
  sudo nmap -sVC -p $open_ports -v -Pn -n -T4 -iL nmap_targets.tmp -oX nmap.ipv4.xml
  sudo rm nmap_targets.tmp
  xsltproc -o nmap-native.ipv4.html nmap.ipv4.xml
#  xsltproc -o nmap-bootstrap.ipv4.html bootstrap-nmap.xsl nmap.ipv4.xml

  [ -f ipv6.ipaddresses ] && sudo nmap -sSV --top-ports 1000 -Pn -n -iL ipv6.ipaddresses -oX nmap.ipv6.xml && \
  xsltproc -o nmap-native.ipv6.html nmap.ipv6.xml
}

getrobots(){
  cat hosts | while read line; do 
    python3 ~/tools/waybackrobots.py $line
  done
  cat *-robots.txt | cut -c -2 | sort -u >> wayback-data/robots.paths.wobs
}

waybackrecon() {
  ## drishti
  mkdir wayback-data/
  getrobots
  echo "${green}Scraping wayback for data... ${reset}"

  cat all.alive.subdomains | waybackurls | sort -u >> wayback-data/waybackurls

  cat wayback-data/waybackurls | unfurl --unique keys | sort -u >> wayback-data/params
  [ -s wayback-data/params ] && echo "${yellow}Found : $(wc -l wayback-data/params | awk '{print $1}') : parameters ${reset}"

  cat wayback-data/waybackurls | unfurl --unique values | sort -u >> wayback-data/values
  [ -s wayback-data/values ] && echo "${yellow}Found : $(wc -l  wayback-data/values | awk '{print $1}') : values for parameters ${reset}"

  cat wayback-data/waybackurls | unfurl --unique domains | sort -u >> wayback-data/domains
  [ -s wayback-data/domains ] && echo "${yellow}Found : $(wc -l wayback-data/domains | awk '{print $1}') : domains ${reset}"

  cat wayback-data/waybackurls | unfurl --unique paths | sort -u >> wayback-data/paths
  cat wayback-data/paths | cut -c 2- | sort -u >> wayback-data/paths.wobs
  [ -s wayback-data/paths ] && echo "${yellow}Found : $(wc -l wayback-data/paths | awk '{print $1}') : paths ${reset}"

  cat wayback-data/waybackurls | unfurl --unique format %S | sort -u >> wayback-data/subdomains
  [ -s wayback-data/subdomains ] && echo "${yellow}Found : $(wc -l wayback-data/subdomains | awk '{print $1}') : subdomains ${reset}"

  cat wayback-data/waybackurls | grep -P "\w+\.js(\?|$)" | hakcheckurl | grep 200 | awk '{print $2}' | sort -u >> wayback-data/jsurls
  [ -s wayback-data/jsurls ] && echo "${yellow}Found : $(wc -l wayback-data/jsurls | awk '{print $1}') : javascript files ${reset}" 

  cat wayback-data/waybackurls | grep -P "\w+\.php(\?|$)" | hakcheckurl | grep 200 | awk '{print $2}' | sort -u >> wayback-data/phpurls
  [ -s $domain/$foldername/wayback-data/phpurls ] && echo "${yellow}Found : $(wc -l $domain/$foldername/wayback-data/phpurls | awk '{print $1}') : php files ${reset}"

  cat wayback-data/waybackurls | grep -P "\w+\.aspx(\?|$)" | hakcheckurl | grep 200 | awk '{print $2}' | sort -u >> wayback-data/aspxurls
  [ -s wayback-data/aspxurls ] && echo "${yellow}Found : $(wc -l wayback-data/aspxurls | awk '{print $1}') : aspx files ${reset}"

  cat wayback-data/waybackurls | grep -P "\w+\.asp(\?|$)" | hakcheckurl | grep 200 | awk '{print $2}' | sort -u >> wayback-data/aspurls
  [ -s wayback-data/aspurls ] && echo "${yellow}Found : $(wc -l wayback-data/aspurls | awk '{print $1}') : asp files ${reset}"

  cat wayback-data/waybackurls | grep -P "\w+\.jsp(\?|$)" | hakcheckurl | grep 200 | awk '{print $2}' | sort -u >> wayback-data/jspurls
  [ -s wayback-data/jspurls ] && echo "${yellow}Found : $(wc -l wayback-data/jspurls | awk '{print $1}') : javascript Server Pages ${reset}"

  cat wayback-data/waybackurls | grep -P "\w+\.xml(\?|$)" | hakcheckurl | grep 200 | awk '{print $2}' | sort -u >> wayback-data/xmlurls
  [ -s wayback-data/xmlurls ] && echo "${yellow}Found : $(wc -l wayback-data/xmlurls | awk '{print $1}') : xml files ${reset}"

  cat wayback-data/waybackurls | grep -P "\w+\.cgi(\?|$)" | hakcheckurl | grep 200 | awk '{print $2}' | sort -u >> wayback-data/cgiurls
  [ -s wayback-data/cgiurls ] && echo "${yellow}Found : $(wc -l wayback-data/cgiurls | awk '{print $1}') : cgi files ${reset}"

  cat wayback-data/waybackurls | grep -P "\w+\.py(\?|$)" | hakcheckurl | grep 200 | awk '{print $2}' | sort -u >> wayback-data/pyurls
  [ -s wayback-data/pyurls ] && echo "${yellow}Found : $(wc -l wayback-data/pyurls | awk '{print $1}') : python files ${reset}"

  cat wayback-data/waybackurls | grep -P "\w+\.bak(\?|$)" | hakcheckurl | grep 200 | awk '{print $2}' | sort -u >> wayback-data/backupurls
  [ -s wayback-data/backupurls ] && echo "${yellow}Found : $(wc -l wayback-data/backupurls | awk '{print $1}') : backup files ${reset}"
}

#gocewl hakrawler
crawler() { 
  cat hosts | hakrawler | tee -a crawled.urls
}

getjsurls() {  
  cat domains | while read line; do
    cat all.alive.subdomains | subjs -ua "$UA" | grep $line | tee -a js.urls
  done
  cat all.alive.subdomains | getJS -complete -resolve | sort -u | tee -a js.urls
  [ -f wayback-data/jsurls ] && cat wayback-data/jsurls >> js.urls && rm wayback-data/jsurls -f
  sort -u -o sorted.js.urls js.urls
  rm js.urls -f
  cat sorted.js.urls | hakcheckurl | grep 200 | awk '{print $2}' >> alive.js.urls
  rm sorted.js.urls -f
}

getjspaths() {
  cat alive.js.urls | while read line; do 
    ruby $HOME/tools/relative-url-extractor/extract.rb $line | tee -a js.extracted.paths
    python3 ~/tools/LinkFinder/linkfinder.py -i $line -o cli | tee -a js.extracted.paths
  done

  cat hosts | hakrawler -linkfinder | tee -a js.extracted.paths
  sort -u js.extracted.paths -o sorted.js.paths
  rm -f js.extracted.paths
  cat sorted.js.paths | cut -c 2- | sort -u >> sorted.js.paths.wobs
}

jsep()
{
  mkdir scripts
  mkdir scriptsresponse
  mkdir endpoints
  mkdir responsebody
  mkdir headers
  response()
  {
    echo "Gathering Response"       
    for x in $(cat hosts)
    do
      NAME=$(echo $x | awk -F/ '{print $3}')
      curl -X GET -H "X-Forwarded-For: evil.com" $x -I > "headers/$NAME" 
      curl -s -X GET -H "X-Forwarded-For: evil.com" -L $x > "responsebody/$NAME"
    done
  }

  jsfinder()
  {
    echo "Gathering JS Files"       
    for x in $(ls "responsebody")
    do
      printf "\n\n${RED}$x${NC}\n\n"
      END_POINTS=$(cat "responsebody/$x" | grep -Eoi "src=\"[^>]+></script>" | cut -d '"' -f 2)
      for end_point in $END_POINTS
      do
        len=$(echo $end_point | grep "http" | wc -c)
        mkdir "scriptsresponse/$x/" > /dev/null 2>&1
        URL=$end_point
        if [ $len == 0 ]
        then
                URL="https://$x$end_point"
        fi
        file=$(basename $end_point)
        curl -X GET $URL -L > "scriptsresponse/$x/$file"
        echo $URL >> "scripts/$x"
      done
    done
  }

  endpoints()
  {
  echo "Gathering Endpoints"
  for domain in $(ls scriptsresponse)
  do
    #looping through files in each domain
    mkdir endpoints/$domain
    for file in $(ls scriptsresponse/$domain)
    do
      ruby ~/tools/relative-url-extractor/extract.rb scriptsresponse/$domain/$file >> endpoints/$domain/$file 
    done
  done
  }
  response
  jsfinder
  endpoints

  cat endpoints/*/* | sort -u | tee -a endpoints.txt
}
#getcms(){
#  cmsmap webanalyzer cmseek builtwith whatweb wappalyze
#}

#check4wafs(){
#  wafwoof
#  identYwaf
#}

## ffuf, gobuster, meg
#bf-jspaths
#bf-wayback
#bf-quick
#bf-mylist
#bf-custom

#bf-params(){
# arjun parameth aron photon 
#}

fullrecon(){
#  getscope
  # rapid7search
  subdomain-enum
  subdomain-brute
  resolving
#  checkscope
  getalive
  getdata
  screenshot
#  scanner
#  waybackrecon
  crawler
  #smuggling
  getjsurls
  getjspaths
  nuc
#  getcms
#  check4wafs
#  bruteforce
}

redUrl() { 
gau -subs $1 | grep "redirect" >> $1_redirectall.txt | gau -subs $1 | grep "redirect=" >> $1_redirectequal.txt | gau -subs $1 | grep "url" >> $1_urlall.txt | gau -subs $1 | grep "url=" >> $1_urlequal.txt | gau -subs $1 | grep "next=" >> $1_next.txt | gau -subs $1 | grep "dest=" >> $1_dest.txt | gau -subs $1 | grep "destination" >> $1_destination.txt | gau -subs $1 | grep "return" >> $1_return.txt | gau -subs $1 | grep "go=" >> $1_go.txt | gau -subs $1 | grep "redirect_uri" >> $1_redirecturi.txt | gau -subs $1 | grep "continue=" >> $1_continue.txt | gau -subs $1 | grep "return_path=" >> $1_path.txt | gau -subs $1 | grep "externalLink=" >> $1_link.txt | gau -subs $1 | grep "URL=" >> $1_URL.txt 
}

blindssrftest(){
  if [ -z "$1" ]; then
    echo >&2 "ERROR: Domain not set"
    exit 2
  fi
  if [ -z "$2" ]; then
    echo >&2 "ERROR: Sever link not set"
    exit 2
  fi
  if [ -f wayback-data/waybackurls ] && [ -f crawler.urls ]; then
    cat wayack-data/waybackurls crawler.urls | sort -u | grep "?" | qsreplace -a | qsreplace $2 > $1-bssrf
    sed -i "s|$|\&dest=$2\&redirect=$2\&uri=$2\&path=$2\&continue=$2\&url=$2\&window=$2\&next=$2\&data=$2\&reference=$2\&site=$2\&html=$2\&val=$2\&validate=$2\&domain=$2\&callback=$2\&return=$2\&page=$2\&feed=$2\&host=$2&\port=$2\&to=$2\&out=$2\&view=$2\&dir=$2\&show=$2\&navigation=$2\&open=$2|g" $1-bssrf
    echo "Firing the requests - check your server for potential callbacks"
    ffuf -w $1-bssrf -u FUZZ -t 50
  fi
}
CORStest() {
    python $HOME/tools/corstest.py $1
}

smuggling() {
  cat hosts | rush -j 3 "python3 $ToolsPath/smuggler/smuggler.py -u {}" | tee -a smuggler_op.txt
}

nuc(){
  mkdir nuclei_op
  
  nuclei -l hosts cves/ -c 60 -pbar -o nuclei_op/cves.txt
  nuclei -l hosts dns/ -c 60 -pbar -o nuclei_op/dns.txt
  nuclei -l hosts subdomain-takeover/ -c 60 -pbar -o nuclei_op/subdomain-takeover.txt
  nuclei -l hosts files/ -c 60 -pbar -o nuclei_op/files.txt
  nuclei -l hosts panels/ -c 60 -pbar -o nuclei_op/panels.txt
  nuclei -l hosts security-misconfiguration/ -c 60 -pbar -o nuclei_op/security-misconfiguration.txt
  nuclei -l hosts tokens/ -c 60 -pbar -o nuclei_op/tokens.txt
  nuclei -l hosts vulnerabilities/ -c 60 -pbar -o nuclei_op/vulnerabilities.txt
  nuclei -l hosts default-credentials/ -c 60 -pbar -o nuclei_op/default-credentials.txt
}

## must already be login to github 
# this is part of jhaddix hunter.sh script
github_dorks () {
        if [ "$#" -ne 1 ]; then
                echo "${red}Usage: domain_github_dorks <domains>${reset}"
                return
        fi
        host=$1
        without_suffix=$(awk -F '.' '{print $1}' host)
        echo ""
        echo "************ Github Dork Links (must be logged in) *******************"
        echo ""
        echo "  password"
        echo "https://github.com/search?q=%22$1%22+password&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+password&type=Code"
        echo ""
        echo " npmrc _auth"
        echo "https://github.com/search?q=%22$1%22+npmrc%20_auth&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+npmrc%20_auth&type=Code"
        echo ""
        echo " dockercfg"
        echo "https://github.com/search?q=%22$1%22+dockercfg&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+dockercfg&type=Code"
        echo ""
        echo " pem private"
        echo "https://github.com/search?q=%22$1%22+pem%20private&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+extension:pem%20private&type=Code"
        echo ""
        echo "  id_rsa"
        echo "https://github.com/search?q=%22$1%22+id_rsa&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+id_rsa&type=Code"
        echo ""
        echo " aws_access_key_id"
        echo "https://github.com/search?q=%22$1%22+aws_access_key_id&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+aws_access_key_id&type=Code"
        echo ""
        echo " s3cfg"
        echo "https://github.com/search?q=%22$1%22+s3cfg&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+s3cfg&type=Code"
        echo ""
        echo " htpasswd"
        echo "https://github.com/search?q=%22$1%22+htpasswd&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+htpasswd&type=Code"
        echo ""
        echo " git-credentials"
        echo "https://github.com/search?q=%22$1%22+git-credentials&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+git-credentials&type=Code"
        echo ""
        echo " bashrc password"
        echo "https://github.com/search?q=%22$1%22+bashrc%20password&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+bashrc%20password&type=Code"
        echo ""
        echo " sshd_config"
        echo "https://github.com/search?q=%22$1%22+sshd_config&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+sshd_config&type=Code"
        echo ""
        echo " xoxp OR xoxb OR xoxa"
        echo "https://github.com/search?q=%22$1%22+xoxp%20OR%20xoxb%20OR%20xoxa&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+xoxp%20OR%20xoxb&type=Code"
        echo ""
        echo " SECRET_KEY"
        echo "https://github.com/search?q=%22$1%22+SECRET_KEY&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+SECRET_KEY&type=Code"
        echo ""
        echo " client_secret"
        echo "https://github.com/search?q=%22$1%22+client_secret&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+client_secret&type=Code"
        echo ""
        echo " sshd_config"
        echo "https://github.com/search?q=%22$1%22+sshd_config&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+sshd_config&type=Code"
        echo ""
        echo " github_token"
        echo "https://github.com/search?q=%22$1%22+github_token&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+github_token&type=Code"
        echo ""
        echo " api_key"
        echo "https://github.com/search?q=%22$1%22+api_key&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+api_key&type=Code"
        echo ""
        echo " FTP"
        echo "https://github.com/search?q=%22$1%22+FTP&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+FTP&type=Code"
        echo ""
        echo " app_secret"
        echo "https://github.com/search?q=%22$1%22+app_secret&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+app_secret&type=Code"
        echo ""
        echo "  passwd"
        echo "https://github.com/search?q=%22$1%22+passwd&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+passwd&type=Code"
        echo ""
        echo " s3.yml"
        echo "https://github.com/search?q=%22$1%22+.env&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+.env&type=Code"
        echo ""
        echo " .exs"
        echo "https://github.com/search?q=%22$1%22+.exs&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+.exs&type=Code"
        echo ""
        echo " beanstalkd.yml"
        echo "https://github.com/search?q=%22$1%22+beanstalkd.yml&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+beanstalkd.yml&type=Code"
        echo ""
        echo " deploy.rake"
        echo "https://github.com/search?q=%22$1%22+deploy.rake&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+deploy.rake&type=Code"
        echo ""
        echo " mysql"
        echo "https://github.com/search?q=%22$1%22+mysql&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+mysql&type=Code"
        echo ""
        echo " credentials"
        echo "https://github.com/search?q=%22$1%22+credentials&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+credentials&type=Code"
        echo ""
        echo " PWD"
        echo "https://github.com/search?q=%22$1%22+PWD&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+PWD&type=Code"
        echo ""
        echo " deploy.rake"
        echo "https://github.com/search?q=%22$1%22+deploy.rake&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+deploy.rake&type=Code"
        echo ""
        echo " .bash_history"
        echo "https://github.com/search?q=%22$1%22+.bash_history&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+.bash_history&type=Code"
        echo ""
        echo " .sls"
        echo "https://github.com/search?q=%22$1%22+.sls&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+PWD&type=Code"
        echo ""
        echo " secrets"
        echo "https://github.com/search?q=%22$1%22+secrets&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+secrets&type=Code"
        echo ""
        echo " composer.json"
        echo "https://github.com/search?q=%22$1%22+composer.json&type=Code"
        echo "https://github.com/search?q=%22$without_suffix%22+composer.json&type=Code"
        echo ""
}

check4vulns() {
  redUrl
  blindssrf
#  github-dorker -> gitrob, git-dump, git-hound, git-all-secrets 
#  google-dorker -> thehavester, jnx-script
#  shodan-dorker -> reconSai
#  CORStest -> CORStest
#  AWSbuckets ScoutSuite -> S3canner, lazyS3, mass3, s3Takeover
#  domain-takeover -> subzy, subzero, tko-subs, takeover, subjack
#  XSS -> XSStrike
#  backupfiles -> BFAC
#  crlf -> CRLF-Injection-Scanner
}


#getapk(){ adb }
#pushapk(){ adb }

dapk(){ 
  apktool d $1 
}

#rapk(){ apktool   $1 }
#apk2jar(){ enjarify } 
#readjar(){ jadx jd-gui jd-cmd }

#androidapp-recon() {
# get endpoints
# add ssl cert to an app automaticly 
# decodify reverseAPK websf ninjadroid
#}

# OSINT tools
check4phNsq(){
  ~/tools/urlcrazy/urlcrazy -p $1
  #python3 ~/tools/dnstwist/dnstwist.py 
}

fullOSINT(){
  check4phNsq
#  spiderfoot
#  hunter.io
#  intelx.io
#  Zoomeye
#  nerdydata
#  crunchbase
#  curl emailrep.io/$email
#  OSRF
#  theharvester
#  recon-ng-v5
}

# reference for scripts
# https://github.com/venom26/recon
# https://github.com/offhourscoding/recon
# https://github.com/Sambal0x/Recon-tools
# https://github.com/JoshuaMart/AutoRecon

fufapi(){
  ffuf -u $1/FUZZ -w $ToolsPath/apiwords.txt -mc 200 -t 100
}

fufdir(){
  ffuf -u $1/FUZZ -w $DIRS_LARGE -mc 200,301,302,403 -t 170
}

fufextension(){
  ffuf -u $1/FUZZ -mc 200,301,302,403,401 -t 150 -w $ToolsPath/ffuf_extension.txt -e .php,.asp,.aspx,.jsp,.py,.txt,.conf,.config,.bak,.backup,.swp,.old,.db,.sql,.json,.xml,.log,.zip
}

fleetScan(){

  company=$(cat domains)
  liveHosts=$company-live.txt

  # Start a fleet called stock with 9 instances and expire after 2 hours
  axiom-fleet well -i=9 -t=2


  # Run a scan, use the stok fleet, use the ranges file we just made, and set the ports to 443, then set the output file
  axiom-scan 'well*' --rate=10000 -p443 --banners -iL=ipv4.ipaddresses -o=masscanIC.txt

  echo 'Clean file ...'

  cat masscanIC.txt | awk '{print $2}' | grep -v Masscan | grep -v Ports | sort -u | tee $liveHosts
  axiom-scan "well*" -iL=$liveHosts -p443 -sV -sC -T4 -m=nmapx -o=output
  
  echo 'Remove servers ...'
  axiom-rm "well0*" -f
}

