#
# Port scanning and HTTP probing functions
#

filterLive() {
  if [ -s "HTTPOK" ]; then
    grep '200' HTTPOK | awk -F " " '{print $1}' | anew 200HTTP
    grep -E '40[0-4]' HTTPOK | grep -Ev 404 | awk -F " " '{print $1}' | anew 403HTTP
    grep -v '404' HTTPOK | awk '{print $1}' | anew Without404
    awk -F " " '{print $1}' HTTPOK | anew ALLHTTP
  fi
}

getalive() {
  echo "${yellow}[+] Checking for live hosts...${reset}"
  httpx -l clean.subdomains -silent -status-code -tech-detect -title -ip -cname -location -cl -timeout 10 -threads 10 -o HTTPOK

  filterLive
}

naabuRecon() {
  echo "${yellow}[+] Running port scan with Naabu...${reset}"
  if [ ! -s "clean.subdomains" ]; then echo "${red}[-] clean.subdomains not found or empty.${reset}"; return 1; fi
  naabu -l clean.subdomains -ec -tp 100 -sa -o naabuScan
  httpx -l naabuScan -silent -status-code -tech-detect -title -ip -cname -location -cl -timeout 10 -threads 10 -o HTTPOKSCAN
  cat HTTPOKSCAN | anew HTTPOK

  filterLive
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

# Infrastructure enumeration with FavFreak
# Usage: faviconEnum
# Requires: 200HTTP file
# Outputs: outputFavFreak directory
faviconEnum() {
  echo '${yellow}[+] Enumerating infrastructure with FavFreak...${reset}'
  if [ ! -s "200HTTP" ]; then echo "${red}[-] 200HTTP file not found or empty.${reset}"; return 1; fi
  python3 "$FAVFREAK_PATH" --shodan -o outputFavFreak -i 200HTTP
}

# Takes screenshots of live hosts
# Usage: screenshot
# Requires: ALLHTTP file
# Outputs: aqua_out directory with screenshots
screenshot() {
  echo "${yellow}[+] Taking screenshots...${reset}"
  if [ ! -s "ALLHTTP" ]; then echo "${red}[-] ALLHTTP file not found or empty.${reset}"; return 1; fi
  cat ALLHTTP | aquatone -chrome-path /snap/bin/chromium -scan-timeout 900 -http-timeout 6000 -out aqua_out -ports xlarge
}

# Recursive directory fuzzing with ffuf (CSV output)
# Usage: ffuf_recursive <url> [wordlist] [threads] [extra_flags]
# Outputs: recursive/recursive_<domain>.csv
ffuf_recursive() {
  if [ -z "$1" ]; then echo "${red}[-] Usage: ffuf_recursive <url> [wordlist] [threads] [extra_flags]${reset}"; return 1; fi
  echo "${yellow}[+] Input URL: $1${reset}"
  mkdir -p recursive
  local dom wordlist thread
  dom=$(echo "$1" | unfurl format %s%d%p | sed 's/\///g')
  wordlist=${2:-$RECURSIVE_LIST}
  thread=${3:-30}
  ffuf -c -v -u "$1/FUZZ" -w "$wordlist" \
    -H "User-Agent: Mozilla Firefox Mozilla/5.0 X-Bug-bounty: w3llpunk" \
    -H "X-Bug-Bounty: w3llpunk" \
    -recursion -recursion-depth 10 \
    -t "$thread" \
    -mc all -ac -fc 400 \
    -o "recursive/recursive_${dom}.csv" -of csv $4
}

# Recursive directory fuzzing with ffuf (JSON output)
# Usage: ffuf_recursive_json <url> [wordlist] [threads] [extra_flags]
# Outputs: recursive/recursive_<domain>.json
ffuf_recursive_json() {
  if [ -z "$1" ]; then echo "${red}[-] Usage: ffuf_recursive_json <url> [wordlist] [threads] [extra_flags]${reset}"; return 1; fi
  echo "${yellow}[+] Input URL: $1${reset}"
  mkdir -p recursive
  local dom wordlist thread
  dom=$(echo "$1" | unfurl format %s%d%p | sed 's/\///g')
  wordlist=${2:-$RECURSIVE_LIST}
  thread=${3:-30}
  ffuf -c -v -u "$1/FUZZ" -w "$wordlist" \
    -H "User-Agent: Mozilla Firefox Mozilla/5.0 X-Bug-bounty: w3llpunk" \
    -H "X-Bug-Bounty: w3llpunk" \
    -recursion -recursion-depth 10 \
    -t "$thread" \
    -mc all -ac -fc 400 \
    -o "recursive/recursive_${dom}.json" -of json $4
}
