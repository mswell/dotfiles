#
# Core bug bounty functions
#

# ===================================
# Environment & Utility Variables
# ===================================
ResultsPath="$RECON_PATH"
ToolsPath="$TOOLS_PATH"
ConfigFolder="$TOOLS_PATH/config"
GITHUB_TOKENS=${ToolsPath}/.github_tokens
UserAgent="User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/112.0"

red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
reset=$(tput sgr0)

# ===================================
# Reconnaissance Functions
# ===================================

# Sets up a workspace for a new target
workspaceRecon() {
  local name
  name=$(echo "$1" | unfurl -u domains)
  local wdir="$name/$(date +%F)/"
  mkdir -p "$wdir"
  cd "$wdir"
  echo "$name" | anew domains
}

# Runs a comprehensive subdomain enumeration and resolution flow
wellSubRecon() {
  subdomainenum
  if [ -s "asn" ]; then
    cat asn | metabigor net --asn | anew cidr
  fi
  if [ -s "cidr" ]; then
    cat cidr | anew clean.subdomains
  fi
  brutesub
}

# Fetches subdomains from CertSpotter API
certspotter() {
  curl -s "https://api.certspotter.com/v1/issuances?domain=$1&expand=dns_names&expand=issuer&expand=cert" | \
    jq -c '.[].dns_names' | grep -o '"[^"].*"' | tr -d '"' | sort -fu
}

# Fetches subdomains from crt.sh
crtsh() {
  curl -s "https://crt.sh/?q=%.$"1"" | sed 's/<\]?[^>]*>//g' | grep "$1"
}

# Fetches subdomains from crt.sh (JSON output)
cert() {
  curl -s "https://crt.sh/?q=%.$1&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' | anew
}

# Gets IP info from ipinfo.io
ipinfo() {
  curl "http://ipinfo.io/$1"
}

# Downloads a fresh list of public DNS resolvers
getfreshresolvers() {
  echo "${yellow}[+] Downloading fresh resolvers...${reset}"
  wget -nv -O "$RESOLVERS_LIST" https://raw.githubusercontent.com/trickest/resolvers/main/resolvers.txt
}

# Downloads jhaddix's all.txt wordlist
getalltxt() {
  echo "${yellow}[+] Downloading all.txt wordlist...${reset}"
  wget -nv -O "$ALL_TXT_LIST" https://gist.githubusercontent.com/jhaddix/86a06c5dc309d08580a018c66354a056/raw/96f4e51d96b2203f19f6381c8c545b278eaa0837/all.txt
}

# Probes for live hosts and categorizes them by status code
getalive() {
  echo "${yellow}[+] Checking for live hosts...${reset}"
  httpx -l naabuScan -silent -status-code -tech-detect -title -cl -timeout 10 -threads 10 -o HTTPOK
  
  if [ -s "HTTPOK" ]; then
    grep '200' HTTPOK | awk -F " " '{print $1}' | anew 200HTTP
    grep -E '40[0-4]' HTTPOK | grep -Ev 404 | awk -F " " '{print $1}' | anew 403HTTP
    grep -v '404' HTTPOK | awk '{print $1}' | anew Without404
    awk -F " " '{print $1}' HTTPOK | anew ALLHTTP
  fi
}

# Checks for NS Takeover vulnerabilities
nstakeover() {
  while IFS= read -r domain; do
    dig "$domain" +trace | grep NS | awk '{print $5}' | anew | egrep -Ev "root-servers|NS|NSEC3|NSEC" | sed 's/\.$//' | \
    xargs -I{} bash -c "dig @{} '$domain' | grep -E 'SERVFAIL|REFUSED' && echo '$domain - {} Is vulnerable'"
  done < "$1"
}

# Crawls for JavaScript files
JScrawler() {
  katana -jc -d 3 -rd 5 -u 200HTTP -ef eot,jpg,jpeg,gif,css,tif,tiff,png,ttf,otf,woff,woff2,ico,svg,txt -o crawlJS
  if [ -s "crawlJS" ]; then
    grep ".js$" crawlJS | fff -d 50 -S -o JSroot
  fi
}

# Finds AWS Cognito endpoints in JS files
awsCognitoFinder() {
  if [ ! -d "JSroot" ]; then
    echo "${red}[-] JSroot directory not found. Run JScrawler first.${reset}"
    return 1
  fi
  cd JSroot
  grep -lri 'AWSCognitoIdentity' | anew awsVector
  if [ -s "awsVector" ]; then
    echo "[+] Found AWS Cognito" | notify -silent -id nuclei
    notify -silent -bulk -data awsVector -id nuclei
  fi
  cd -
}

# Scans for secrets using grep patterns
secrets() {
    echo "${yellow}[+] Scanning for secrets...${reset}"
    grep -HnriEo 'basic [a-zA-Z0-9=:+/-]{5,100}'
    grep -HnriEo 'AIza[0-9A-Za-z\-]{35}'
    grep -HnriEo 'https://hooks.slack.com/services/T[a-zA-Z0-9]{8}/B[a-zA-Z0-9]{8}/[a-zA-Z0-9]{24}'
    grep -HnriEo 'AKIA[0-9A-Z]{16}'
    grep -HnriEo 'bearer [a-zA-Z0-9\-\.=]+'
    grep -HnriEo 'cloudinary://[0-9]{15}:[0-9A-Za-z]+@[a-z]+'
    grep -HnriEo 'key-[0-9a-zA-Z]{32}'
    grep -HnriEo "(api_key|API_KEY|api-key|API-KEY|apikey|APIKEY)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
    grep -HnriEo "(access_key|ACCESS_KEY|access_token|ACCESSTOKEN)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
    grep -HnriEo 'bearer [a-zA-Z0-9-.=:_+/]{5,100}'
    grep -HnriEo "(auth_token|AUTH_TOKEN)"
    grep -HnriEo "(slack_api|SLACK_API|db_password|DB_PASSWORD|db_username|DB_USERNAME)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
    grep -HnriEo "(authorizationToken|AUTHORIZATIONTOKEN|app_key|APPKEY|authorization|AUTHORIZATION|authentication|AUTHENTICATION)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
    grep -HnriEo "(.{8}[A-z0-9-].amazonaws.com/)[A-z0-9-].{6}"
    grep -HnriEo "(.{8}[A-z0-9-].s3.amazonaws.com/)[A-z0-9-].{6}"
    grep -HnriEo "(.{8}[A-z0-9-].s3-amazonaws.com/)[A-z0-9_-].{6}"
    grep -HnriEo 'amzn.mws.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    grep -HnriEo "(amazonaws|AMAZONAWS)(:|=| : | = )( |\"|')[0-9A-Za-z\-]{5,100}"
    grep -HnriEo "(?i)aws(.{0,20})?(?-i)['\"][0-9a-zA-Z/+]{40}['\"]"
}

# Subdomain enumeration based on the domain specified in the "domains" file
subdomainenum() {
  echo "${yellow}[+] Starting passive subdomain enumeration...${reset}"
  local Domain
  Domain=$(cat domains)
  subfinder -up
  subfinder -nW -t 100 -all -o subfinder.subdomains -dL domains
  cat subfinder.subdomains | anew all.subdomains
  rm -f subfinder.subdomains
  amass enum -v -norecursive -passive -nf all.subdomains -df domains -o amass.subdomains
  cat amass.subdomains | anew all.subdomains
  rm -f amass.subdomains
  curl -s "https://crt.sh/?q=%25.$Domain&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' | anew all.subdomains
  dnsx -l all.subdomains -silent | anew clean.subdomains
  echo "${green}[+] Passive subdomain enumeration completed.${reset}"
}

# Search for subdomains in the HackerOne scope
checkscope() {
  # https://github.com/michael1026/inscope
  if [ -s "sorted.all.subdomains" ]; then
    cat sorted.all.subdomains | inscope | tee -a inscope.sorted.all.subdomains
  else
    echo "${red}[-] sorted.all.subdomains not found.${reset}"
  fi
}

resolving() {
  shuffledns -d domains -list sorted.all.subdomains -r "$RESOLVERS_LIST" -o resolved.subdomains
}

# ===================================
# BBRF Helper Functions
# ===================================
# see this example on https://github.com/pdelteil/BugBountyHuntingScripts/blob/main/bbrf_helper.sh

bbrfAddDomainsAndUrls() {
  for p in $(bbrf programs); do
    bbrf scope in -p "$p" | \
      subfinder -silent | \
      dnsx -silent | \
      bbrf domain add - -s subfinder --show-new -p "$p" | \
      grep -v DEBUG | notify -silent

    bbrf urls -p "$p" | httpx -silent | bbrf url add - -s httpx --show-new -p "$p" | \
      grep -v DEBUG | notify -silent
  done
}
bbrfresolvedomains() {
  for p in $(bbrf programs); do
    bbrf domains --view unresolved -p "$p" | \
      dnsx -silent -a -resp | tr -d '[]' | tee 
      >(awk '{print $1":"$2}' | bbrf domain update - -p "$p" -s dnsx) \
      >(awk '{print $1":"$2}' | bbrf domain add - -p "$p" -s dnsx) \
      >(awk '{print $2":"$1}' | bbrf ip add - -p "$p" -s dnsx) \
      >(awk '{print $2":"$1}' | bbrf ip update - -p "$p" -s dnsx)
  done
}

# ===================================
# Data Gathering & Crawling
# ===================================

getdata() {
  echo "${yellow}[+] Getting all responses and saving to roots folder...${reset}"
  [ -s "ALLHTTP" ] && httpx -l ALLHTTP -srd "AllHttpData"
}

getdatawithcrawl() {
  echo "${yellow}[+] Getting all responses from crawled URLs...${reset}"
  if [ -s "200HTTP" ]; then
    katana -jc -d 3 -rd 5 -u 200HTTP -o crawldata
    [ -s "crawldata" ] && httpx -l crawldata -srd "200HttpData"
  fi
}

crawler() {
  echo '${yellow}[+] Crawler in action...${reset}'
  local Domain
  Domain=$(cat domains)
  mkdir -p .tmp
  gospider -S Without404 -d 10 -c 20 -t 50 -K 3 --no-redirect --js -a -w --blacklist ".(eot|jpg|jpeg|gif|css|tif|tiff|png|ttf|otf|woff|woff2|ico|svg|txt)" --include-subs -q -o .tmp/gospider 2>/dev/null | anew -q gospider_out
  xargs -a Without404 -P 50 -I % bash -c "echo % | waybackurls" 2>/dev/null | anew -q waybackurls_out
  xargs -a Without404 -P 50 -I % bash -c "echo % | gau --blacklist eot,jpg,jpeg,gif,css,tif,tiff,png,ttf,otf,woff,woff2,ico,svg,txt --retries 3 --threads 50" 2>/dev/null | anew -q gau_out 2>/dev/null &>/dev/null
  katana -list Without404 -d 2 -ef eot,jpg,jpeg,gif,css,tif,tiff,png,ttf,otf,woff,woff2,ico,svg,txt -output katana_output.txt
  cat gospider_out gau_out waybackurls_out katana_output.txt 2>/dev/null | sed '/^[[^]/d' | grep "$Domain" | sort -u | uro | anew -q crawlerResults.txt
}

# ===================================
# Vulnerability Scanning
# ===================================

prototypefuzz() {
  echo "${yellow}[+] Fuzzing for Prototype Pollution...${reset}" | notify -silent -id subs
  if [ ! -s "ALLHTTP" ]; then echo "${red}[-] ALLHTTP file not found or empty.${reset}"; return 1; fi
  cat ALLHTTP | sed 's/$/\/?__proto__[testparam]=exploit\//' | page-fetch -j 'window.testparam == "exploit"? "[VULNERABLE]" : "[NOT VULNERABLE]"' | sed "s/(//g" | sed "s/)//g" | sed "s/JS //g" | grep "VULNERABLE" | grep -v "NOT" | notify -silent
}

subtakeover() {
  echo "${yellow}[+] Checking for Subdomain Takeover...${reset}"
  if [ ! -s "clean.subdomains" ]; then echo "${red}[-] clean.subdomains not found or empty.${reset}"; return 1; fi
  python3 "$TAKEOVER_SCRIPT_PATH" -l clean.subdomains -o subtakeover.txt -k -v -t 50
  if [ -s "subtakeover.txt" ]; then
    echo "[+] Subdomain Takeover results found!" | notify -silent -id subs
    cat subtakeover.txt | notify -silent -id subs
  fi
}

xsshunter() {
  echo "${yellow}[+] Hunting for XSS...${reset}" | notify -silent -id xss
  
  # Discover URLs
  while IFS= read -r domain; do
    python3 "$WAYMORE_PATH" -i "$domain" -mode U
    cat "$TOOLS_PATH/Waymore/results/$domain/waymore.txt" | awk '{print tolower($0)}' | anew urldump.txt
  done < domains

  if [ ! -s "urldump.txt" ]; then echo "${red}[-] urldump.txt not found or empty. Cannot proceed with XSS scan.${reset}"; return 1; fi

  # Vector creation
  cat urldump.txt | uro | kxss | awk '{print $0}' | anew xssvector
  cat urldump.txt | uro | gf xss | httpx -silent | anew xssvector

  if [ ! -s "xssvector" ]; then echo "${yellow}[-] No potential XSS vectors found.${reset}"; return 1; fi

  # Scanning
  echo '[+] Scanning with Airixss...'
  cat xssvector | qsreplace '"\"><svg onload=confirm(1)>"' | airixss -payload "confirm(1)" | egrep -v 'Not' | anew airixss.txt
  [ -s "airixss.txt" ] && notify -silent -bulk -data airixss.txt -id xss

  echo '[+] Scanning with Freq...'
  cat xssvector | qsreplace '"\"><img src=x onerror=alert(1);>"' | freq | egrep -v 'Not' | anew FreqXSS.txt
  [ -s "FreqXSS.txt" ] && notify -silent -bulk -data FreqXSS.txt -id xss

  echo '[+] Scanning with XSStrike...'
  python3 "$XSSTRIKE_PATH" -ul xssvector -d 2 --file-log-level WARNING --log-file XSStrike_output.log
  [ -s "XSStrike_output.log"] && notify -silent -data XSStrike_output.log -bulk -id xss
}

bypass4xx() {
  echo "${yellow}[+] Attempting to bypass 403/401...${reset}"
  if [ ! -s "403HTTP" ]; then echo "${red}[-] 403HTTP file not found or empty.${reset}"; return 1; fi
  cat 403HTTP | dirdar -only-ok | anew dirdarResult.txt
  if [ -s "dirdarResult.txt" ]; then
    cat dirdarResult.txt | sed -e '1,12d' | sed '/^$/d' | anew 4xxbypass.txt
    echo "[+] 4xx Bypass results found!" | notify -silent -id subs
    cat 4xxbypass.txt | notify -silent -id subs
  fi
}

paramspider() {
  echo "${yellow}[+] Spidering for parameters...${reset}"
  if [ ! -s "ALLHTTP" ]; then echo "${red}[-] ALLHTTP file not found or empty.${reset}"; return 1; fi
  xargs -a ALLHTTP -I@ sh -c "python3 $PARAMSPIDER_PATH -d @ -l high --exclude jpg,png,gif,woff,css,js,svg,woff2,ttf,eot,json"
  if [ -d "output" ]; then
    cat output/*.txt | anew params
  fi
}

xssknox() {
  echo "${yellow}[+] Hunting for XSS with Knox...${reset}"
  if [ ! -s "waybackdata" ]; then echo "${red}[-] waybackdata file not found or empty.${reset}"; return 1; fi
  cat waybackdata | uro | kxss | awk '{print $9}' | anew kxssresult
  if [ -s "kxssresult" ]; then
    python3 "$KNOXNL_PATH" -i kxssresult -s -o xssSuccess
    if [ -s "xssSuccess" ]; then
      echo "XSS FOUND WITH KNOXSS" | notify -silent -id xss
      notify -silent -bulk -data xssSuccess -id xss
    fi
  fi
}

Corstest() {
  echo "${yellow}[+] Testing for CORS misconfigurations...${reset}"
  gf cors roots | awk -F '/' '{print $2}' | anew | httpx -silent -o CORSHTTP
  [ -s "CORSHTTP" ] && python3 "$CORSTEST_PATH" CORSHTTP -q | notify -silent
}

smuggling() {
  echo "${yellow}[+] Testing for HTTP Request Smuggling...${reset}"
  if [ ! -s "hosts" ]; then echo "${red}[-] hosts file not found or empty.${reset}"; return 1; fi
  cat hosts | rush -j 3 "python3 $SMUGGLER_PATH -u {}" | tee -a smuggler_op.txt
}

# ===================================
# Brute-force & Fuzzing
# ===================================

fufapi() {
  ffuf -u "$1/FUZZ" -w "$API_WORDS_LIST" -mc 200 -t 100
}

fufdir() {
  ffuf -u "$1/FUZZ" -w "$DIRS_LARGE_LIST" -mc 200,301,302,403 -t 170
}

fufextension() {
  ffuf -u "$1/FUZZ" -mc 200,301,302,403,401 -t 150 -w "$FFUF_EXTENSIONS_LIST" -e .php,.asp,.aspx,.jsp,.py,.txt,.conf,.config,.bak,.backup,.swp,.old,.db,.sql,.json,.xml,.log,.zip
}

feroxdir() {
  feroxbuster -u "$1" -e --status-codes 200,204,301,307,401,405,400,302 -k -w "$DIRS_LARGE_LIST"
}

# ===================================
# Infrastructure & Port Scanning
# ===================================

dnsrecords() {
  echo "${yellow}[+] Getting DNS records...${reset}"
  if [ ! -s "clean.subdomains" ]; then echo "${red}[-] clean.subdomains not found or empty.${reset}"; return 1; fi
  mkdir -p dnshistory
  dnsx -l clean.subdomains -silent -a -resp-only -o dnsx.txt
  dnsx -l clean.subdomains -a -resp -silent -o dnshistory/A-records
  dnsx -l clean.subdomains -ns -resp -silent -o dnshistory/NS-records
  dnsx -l clean.subdomains -cname -resp -silent -o dnshistory/CNAME-records
  dnsx -l clean.subdomains -soa -resp -silent -o dnshistory/SOA-records
  dnsx -l clean.subdomains -ptr -resp -silent -o dnshistory/PTR-records
  dnsx -l clean.subdomains -mx -resp -silent -o dnshistory/MX-records
  dnsx -l clean.subdomains -txt -resp -silent -o dnshistory/TXT-records
  dnsx -l clean.subdomains -aaaa -resp -silent -o dnshistory/AAAA-records
}

screenshot() {
  echo "${yellow}[+] Taking screenshots...${reset}"
  if [ ! -s "ALLHTTP" ]; then echo "${red}[-] ALLHTTP file not found or empty.${reset}"; return 1; fi
  cat ALLHTTP | aquatone -chrome-path /snap/bin/chromium -scan-timeout 900 -http-timeout 6000 -out aqua_out -ports xlarge
}

naabuRecon() {
  echo "${yellow}[+] Running port scan with Naabu...${reset}"
  if [ ! -s "clean.subdomains" ]; then echo "${red}[-] clean.subdomains not found or empty.${reset}"; return 1; fi
  naabu -l clean.subdomains -r "$RESOLVERS_LIST" -ec -tp 100 -sa -o naabuScanFull
  [ -s "naabuScanFull" ] && cat naabuScanFull | grep -v '^\[' | anew naabuScan
}

naabuFullPorts() {
  echo "${yellow}[+] Running full port scan with Naabu...${reset}"
  if [ ! -s "clean.subdomains" ]; then echo "${red}[-] clean.subdomains not found or empty.${reset}"; return 1; fi
  naabu -p - -l clean.subdomains -exclude-ports 80,443,8443,21,25,22 -o full_ports.txt
}

scanPortsAndNuclei() {
  echo '${yellow}[+] Aggregating IPs with mapcidr...${reset}'
  mapcidr -l dnsx.txt -silent -aggregate -o mapcidr.txt

  echo '${yellow}[+] Port scanning aggregated IPs with Naabu...${reset}'
  naabu -l mapcidr.txt -top-ports 100 -silent -sa | httpx -silent -timeout 60 -threads 100 -o naabuIP.txt

  echo '${yellow}[+] Running Nuclei on discovered IPs...${reset}'
  if [ -s "naabuIP.txt" ]; then
    nuclei -l naabuIP.txt -silent -o nuclei.txt -severity low,medium,high,critical
    [ -s "nuclei.txt" ] && notify -silent -bulk -data nuclei.txt -id nuclei
  fi
}

massHakip2host() {
  echo "${yellow}[+] Discovering hosts from IPs with hakip2host...${reset}"
  local Domain
  Domain=$(cat domain)
  rush -i mapcidr.txt "prips {} | hakip2host | anew hakip2hostResult.txt"
  if [ -s "hakip2hostResult.txt" ]; then
    grep "$Domain" hakip2hostResult.txt | awk '{print $3}' | anew cleanHakipResult.txt
  fi
}

faviconEnum() {
  echo '${yellow}[+] Enumerating infrastructure with FavFreak...${reset}'
  if [ ! -s "200HTTP" ]; then echo "${red}[-] 200HTTP file not found or empty.${reset}"; return 1; fi
  python3 "$FAVFREAK_PATH" --shodan -o outputFavFreak -i 200HTTP
}

# ===================================
# JavaScript Analysis
# ===================================

getjsurls() {
  echo "${yellow}[+] Getting and validating JS URLs...${reset}"
  local Domain
  Domain=$(cat domains)
  
  [ -s "crawlerResults.txt" ] && cat crawlerResults.txt | grep "$Domain" | grep -Ei ".(js)" | grep -iEv '(\.jsp|\.json)' | anew -q url_extract_js.txt
  [ -s "url_extract_js.txt" ] && cat url_extract_js.txt | cut -d '?' -f 1 | grep -Ei ".(js)" | grep -iEv '(\.jsp|\.json)' | grep "$Domain" | anew -q jsfile_links.txt
  [ -s "ALLHTTP" ] && subjs -i ALLHTTP | grep "$Domain" | anew -q jsfile_links.txt
  [ -s "ALLHTTP" ] && getJS -i ALLHTTP --complete | grep "$Domain" | anew -q jsfile_links.txt
  
  if [ -s "jsfile_links.txt" ]; then
    httpx -l jsfile_links.txt -follow-redirects -random-agent -silent -status-code -retries 2 -no-color | grep '200' | grep -v '301' | cut -d " " -f 1 | anew -q js_livelinks.txt
    [ -s "js_livelinks.txt" ] && fff -l js_livelinks.txt -d 1 -S -o JSroots
  fi
}

getjsdata() {
  echo "${yellow}[+] Scanning JS files for exposure and tokens...${reset}"
  if [ ! -s "js_livelinks.txt" ]; then echo "${red}[-] js_livelinks.txt not found or empty.${reset}"; return 1; fi
  nuclei -l js_livelinks.txt -tags exposure,token -o jsinfo
  [ -s "jsinfo" ] && notify -silent -bulk -data jsinfo -id nuclei
}

secretfinder() {
  echo '${yellow}[+] Running SecretFinder on JS files...${reset}'
  if [ ! -s "js_livelinks.txt" ]; then echo "${red}[-] js_livelinks.txt not found or empty.${reset}"; return 1; fi
  local regexs
  regexs=$(curl -s 'https://gist.githubusercontent.com/mswell/1070fae0021b08d5e5650743ea402b4b/raw/589e669dec183009f01eca2c2ef1401b5f77af2b/regexJS' | tr '\n' '|')
  rush -i js_livelinks.txt "python3 $SECRETFINDER_PATH -i {} -o cli -r '\w+($regexs)\w+' | grep -v custom_regex | anew js_secrets_result"
  if [ -s "js_secrets_result" ]; then
    grep -v custom_regex js_secrets_result | grep -iv '[URL]:' | anew JSPathNoUrl
    [ -s "JSPathNoUrl" ] && python3 "$BBTZ_COLLECTOR_PATH" JSOutput
  fi
}

# ===================================
# Nuclei Scans & Workflows
# ===================================

updateTemplatesNuc() {
  echo "${yellow}[+] Updating Nuclei templates...${reset}"
  rm -rf ~/nuclei-templates
  git clone --branch main --depth 1 https://github.com/projectdiscovery/nuclei-templates.git ~/nuclei-templates
}

# The functions below will be replaced by the new helper function
jiraScan() {
  echo "${yellow}[+] Jira Scan ${reset}"
  cat ALLHTTP | nuclei -t $CUSTOM_NUCLEI_TEMPLATES_PATH/ssrf-jira-well.yaml -H $UserAgent -o jiraNuclei
  [ -s "jiraNuclei" ] && echo "Jira vector found :)" | notify -silent -id nuclei
  [ -s "jiraNuclei" ] && notify -silent -bulk -data jiraNuclei -id nuclei
}

GitScan() {
  echo "[+] Git scan"
  cat ALLHTTP | nuclei -tags git -H $UserAgent -o gitvector
  [ -s "gitvector" ] && echo "Git vector found :)" | notify -silent -id nuclei
  [ -s "gitvector" ] && notify -silent -bulk -data gitvector -id nuclei
}

lfiScan() {
  echo "[+] LFI scan"
  cat ALLHTTP | nuclei -tags lfi -H $UserAgent -o lfivector
  [ -s "lfivector" ] && echo "LFI vector found :)" | notify -silent -id nuclei
  [ -s "lfivector" ] && notify -silent -bulk -data lfivector -id nuclei
}

panelNuc() {
  echo "[+] Panel scan"
  [ -s "ALLHTTP" ] && cat ALLHTTP | nuclei -tags panel -H $UserAgent -o nucPanel
  [ -s "nucPanel" ] && echo "Panel found :)" | notify -silent -id nuclei
  [ -s "nucPanel" ] && notify -silent -bulk -data nucPanel -id nuclei
}

massALLHTTPtemplate() {
  find "$RECON_PATH" -type f -name ALLHTTP | xargs -I{} -P2 bash -c 'cat {}' | anew allhttpalive
  cat allhttpalive | nuclei -t "$1" -o massALLTEST.txt
  [ -s "massALLTEST.txt" ] && cat massALLTEST.txt | notify -silent
}

exposureNuc() {
  echo "[+] Exposure scan"
  [ -s "ALLHTTP" ] && cat ALLHTTP | nuclei -tags exposure -H $UserAgent -o exposurevector
  [ -s "exposurevector" ] && echo "Exposure vector found :)" | notify -silent -id nuclei
  [ -s "exposurevector" ] && notify -silent -bulk -data exposurevector -id nuclei
}

nucTakeover() {
  echo "[+] Takeover scan"
  cat ALLHTTP | nuclei -tags takeover -H $UserAgent -o nucleiTakeover
  [ -s "nucleiTakeover" ] && echo "Takeover found :)" | notify -silent -id nuclei
  [ -s "nucleiTakeover" ] && notify -silent -bulk -data nucleiTakeover -id nuclei
  cat ALLHTTP | nuclei -t $CUSTOM_NUCLEI_TEMPLATES_PATH/m4cddr-takeovers.yaml -H $UserAgent -o takeovers_m4c
  [ -s "takeovers_m4c" ] && echo "Takeover m4c found :)" | notify -silent -id nuclei
  [ -s "takeovers_m4c" ] && notify -silent -bulk -data takeovers_m4c -id nuclei
}

graphqldetect() {
  echo "[+] Graphql Detect"
  cat ALLHTTP | nuclei -id graphql-detect -H $UserAgent -o graphqldetect
  [ -s "graphqldetect" ] && echo "Graphql endpoint found :)" | notify -silent -id api
  [ -s "graphqldetect" ] && notify -silent -bulk -data graphqldetect -id api
}

ssrfdetect() {
  echo "[+] SSRF Detect"
  cat ALLHTTP | nuclei -tags ssrf -H $UserAgent -o ssrfdetect
  [ -s "ssrfdetect" ] && echo "SSRF vector found :)" | notify -silent -id nuclei
  [ -s "ssrfdetect" ] && notify -silent -bulk -data ssrfdetect -id nuclei
}

XssScan() {
  echo "[+] XSS scan"
  cat ALLHTTP | nuclei -tags xss -es info -H $UserAgent -o xssnuclei
  [ -s "xssnuclei" ] && echo "XSS vector found :)" | notify -silent -id xss
  [ -s "xssnuclei" ] && notify -silent -bulk -data xssnuclei -id xss
}

OpenRedirectScan() {
  echo "[+] OpenRedirect scan"
  cat ALLHTTP | nuclei -tags redirect -es info -H $UserAgent -o openredirectVector
  [ -s "openredirectVector" ] && echo "OpenRedirect vector found :)" | notify -silent -id nuclei
  [ -s "openredirectVector" ] && cat openredirectVector | notify -silent -id nuclei
}

swaggerUIdetect() {
  echo "[+] Swagger detect"
  [ -s "ALLHTTP" ] && cat ALLHTTP | nuclei -tags swagger -H $UserAgent -o swaggerUI
  [ -s "swaggerUI" ] && echo "Swagger endpoint found :)" | notify -silent -id api
  [ -s "swaggerUI" ] && notify -silent -bulk -data swaggerUI -id api
}

APIRecon() {
  echo "[+] api detect"
  [ -s "ALLHTTP" ] && cat ALLHTTP | nuclei -w $CUSTOM_NUCLEI_TEMPLATES_PATH/api-recon-workflow.yaml -H $UserAgent -o nucleiapirecon
  [ -s "nucleiapirecon" ] && echo "api endpoint found :)" | notify -silent -id api
  [ -s "nucleiapirecon" ] && cat nucleiapirecon | notify -silent -id api
}

massALLHTTPWebCaching() {
  find "$RECON_PATH" -type f -name ALLHTTP | xargs -I{} -P2 bash -c 'cat {}' | anew allhttpalive
  nuclei -l allhttpalive -t "$HOME/cache-poisoning.yaml" -o webcachingTest
  [ -s "webcachingTest" ] && cat webcachingTest | notify -silent -id nuclei
}

nucauto() {
  if [ ! -s "cleanHakipResult.txt" ]; then echo "${red}[-] cleanHakipResult.txt not found or empty.${reset}"; return 1; fi
  httpx -l cleanHakipResult.txt -silent | anew ALLHTTP
  nuclei -l ALLHTTP -H "$UserAgent" -eid expired-ssl,mismatched-ssl,deprecated-tls,weak-cipher-suites,self-signed-ssl -severity critical,high,medium,low -o resultNuclei
  [ -s "resultNuclei" ] && notify -silent -bulk -data resultNuclei -id nuclei
}

# ===================================
# Deprecated / To Be Refactored
# ===================================

fleetScan() {
  echo "${red}[-] fleetScan is deprecated due to its complexity and environment dependency.${reset}"
}

#-------------------------
# FUNCTION INFORMATION
#-------------------------
bb_help() {
  echo "certspotter() - Subdomain enumeration from a given domain via https://sslmate.com/ct_search_api/"
  echo "-"
}
## END