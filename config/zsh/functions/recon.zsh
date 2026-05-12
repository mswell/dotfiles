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

subdomainenum() {
  echo "${yellow}[+] Starting passive subdomain enumeration...${reset}"
  require_workspace_file "domains" "subdomainenum" || return 1
  local Domain
  Domain=$(cat domains)
  subfinder -up
  subfinder -nW -t 100 -all -o all.subdomains -dL domains
  dnsx -l all.subdomains -silent | anew clean.subdomains
  echo "${green}[+] Passive subdomain enumeration completed.${reset}"
}

resolving() {
  require_workspace_file "domains" "resolving" || return 1
  require_workspace_file "sorted.all.subdomains" "resolving" || return 1
  shuffledns -d domains -list sorted.all.subdomains -r "$RESOLVERS_LIST" -o resolved.subdomains
}

subtakeover() {
  echo "${yellow}[+] Checking for Subdomain Takeover...${reset}"
  require_workspace_file "clean.subdomains" "subtakeover" || return 1
  python3 "$TAKEOVER_SCRIPT_PATH" -l clean.subdomains -o subtakeover.txt -k -v -t 50
  if [ -s "subtakeover.txt" ]; then
    echo "[+] Subdomain Takeover results found!" | notify -silent -id subs
    cat subtakeover.txt | notify -silent -id subs
  fi
}
