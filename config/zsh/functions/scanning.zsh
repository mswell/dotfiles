#
# Port scanning and HTTP probing functions
#

# Probes for live hosts and categorizes them by status code
# Usage: getalive
# Requires: naabuScan file
# Outputs: HTTPOK, 200HTTP, 403HTTP, Without404, ALLHTTP
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

# Port scanning with Naabu (top 100 ports)
# Usage: naabuRecon
# Requires: clean.subdomains file
# Outputs: naabuScanFull, naabuScan
naabuRecon() {
  echo "${yellow}[+] Running port scan with Naabu...${reset}"
  if [ ! -s "clean.subdomains" ]; then echo "${red}[-] clean.subdomains not found or empty.${reset}"; return 1; fi
  naabu -l clean.subdomains -r "$RESOLVERS_LIST" -ec -tp 100 -sa -o naabuScanFull
  [ -s "naabuScanFull" ] && cat naabuScanFull | grep -v '^\[' | anew naabuScan
}

# Full port range scanning with Naabu
# Usage: naabuFullPorts
# Requires: clean.subdomains file
# Outputs: full_ports.txt
naabuFullPorts() {
  echo "${yellow}[+] Running full port scan with Naabu...${reset}"
  if [ ! -s "clean.subdomains" ]; then echo "${red}[-] clean.subdomains not found or empty.${reset}"; return 1; fi
  naabu -p - -l clean.subdomains -exclude-ports 80,443,8443,21,25,22 -o full_ports.txt
}

# Port scanning and Nuclei scan workflow
# Usage: scanPortsAndNuclei
# Requires: dnsx.txt file
# Outputs: mapcidr.txt, naabuIP.txt, nuclei.txt
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

# Discover hosts from IPs with hakip2host
# Usage: massHakip2host
# Requires: domain file, mapcidr.txt file
# Outputs: hakip2hostResult.txt, cleanHakipResult.txt
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
