#
# Reconnaissance functions for subdomain enumeration and discovery
#

# Sets up a workspace for a new target
# Usage: workspaceRecon <domain>
# Creates: <domain>/YYYY-MM-DD/ directory structure
workspaceRecon() {
  local name
  name=$(echo "$1" | unfurl -u domains)
  local wdir="$name/$(date +%F)/"
  mkdir -p "$wdir"
  cd "$wdir"
  echo "$name" | anew domains
}

# Runs a comprehensive subdomain enumeration and resolution flow
# Usage: wellSubRecon
# Requires: domains file in current directory
# Outputs: clean.subdomains, cidr
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

# Subdomain enumeration based on the domain specified in the "domains" file
# Usage: subdomainenum
# Requires: domains file
# Outputs: all.subdomains, clean.subdomains
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

# DNS resolution with shuffledns
# Usage: resolving
# Requires: domains, sorted.all.subdomains files
# Outputs: resolved.subdomains
resolving() {
  shuffledns -d domains -list sorted.all.subdomains -r "$RESOLVERS_LIST" -o resolved.subdomains
}

# Subdomain takeover detection
# Usage: subtakeover
# Requires: clean.subdomains file
# Outputs: subtakeover.txt
subtakeover() {
  echo "${yellow}[+] Checking for Subdomain Takeover...${reset}"
  if [ ! -s "clean.subdomains" ]; then echo "${red}[-] clean.subdomains not found or empty.${reset}"; return 1; fi
  python3 "$TAKEOVER_SCRIPT_PATH" -l clean.subdomains -o subtakeover.txt -k -v -t 50
  if [ -s "subtakeover.txt" ]; then
    echo "[+] Subdomain Takeover results found!" | notify -silent -id subs
    cat subtakeover.txt | notify -silent -id subs
  fi
}
