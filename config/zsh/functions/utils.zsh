#
# Utility and helper functions
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
# Utility Functions
# ===================================

# Fetches subdomains from CertSpotter API
# Usage: certspotter <domain>
certspotter() {
  curl -s "https://api.certspotter.com/v1/issuances?domain=$1&expand=dns_names&expand=issuer&expand=cert" | \
    jq -c '.[].dns_names' | grep -o '"[^"]\+"' | tr -d '"' | sort -fu
}

# Fetches subdomains from crt.sh
# Usage: crtsh <domain>
crtsh() {
  curl -s "https://crt.sh/?q=%.$"1"" | sed 's/<\]?\?[^>]*>//g' | grep "$1"
}

# Fetches subdomains from crt.sh (JSON output)
# Usage: cert <domain>
cert() {
  curl -s "https://crt.sh/?q=%.$1&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' | anew
}

# Gets IP info from ipinfo.io
# Usage: ipinfo <ip_address>
ipinfo() {
  curl "https://ipinfo.io/$1"
}

# Downloads a fresh list of public DNS resolvers
# Usage: getfreshresolvers
getfreshresolvers() {
  echo "${yellow}[+] Downloading fresh resolvers...${reset}"
  wget -nv -O "$RESOLVERS_LIST" https://raw.githubusercontent.com/trickest/resolvers/main/resolvers.txt
}

# Downloads jhaddix's all.txt wordlist
# Usage: getalltxt
getalltxt() {
  echo "${yellow}[+] Downloading all.txt wordlist...${reset}"
  wget -nv -O "$ALL_TXT_LIST" https://gist.githubusercontent.com/jhaddix/86a06c5dc309d08580a018c66354a056/raw/96f4e51d96b2203f19f6381c8c545b278eaa0837/all.txt
}

# Checks for NS Takeover vulnerabilities
# Usage: nstakeover <file_with_domains>
nstakeover() {
  while IFS= read -r domain; do
    dig "$domain" +trace | grep NS | awk '{print $5}' | anew | egrep -Ev "root-servers|NS|NSEC3|NSEC" | sed 's/\.$//' | \
    xargs -I{} bash -c "dig @{} '$domain' | grep -E 'SERVFAIL|REFUSED' && echo '$domain - {} Is vulnerable'"
  done < "$1"
}

# BBRF Helper Functions
# Usage: bbrfAddDomainsAndUrls
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

# BBRF resolve domains
# Usage: bbrfresolvedomains
bbrfresolvedomains() {
  for p in $(bbrf programs); do
    bbrf domains --view unresolved -p "$p" | \
      dnsx -silent -a -resp | tr -d '[]' | tee \
      >(awk '{print $1":"$2}' | bbrf domain update - -p "$p" -s dnsx) \
      >(awk '{print $1":"$2}' | bbrf domain add - -p "$p" -s dnsx) \
      >(awk '{print $2":"$1}' | bbrf ip add - -p "$p" -s dnsx) \
      >(awk '{print $2":"$1}' | bbrf ip update - -p "$p" -s dnsx)
  done
}

# Search for subdomains in the HackerOne scope
# Usage: checkscope
checkscope() {
  # https://github.com/michael1026/inscope
  if [ -s "sorted.all.subdomains" ]; then
    cat sorted.all.subdomains | inscope | tee -a inscope.sorted.all.subdomains
  else
    echo "${red}[-] sorted.all.subdomains not found.${reset}"
  fi
}

# Display help for bug bounty functions
# Usage: bb_help
bb_help() {
  echo "certspotter() - Subdomain enumeration from a given domain via https://sslmate.com/ct_search_api/"
  echo "-"
}
