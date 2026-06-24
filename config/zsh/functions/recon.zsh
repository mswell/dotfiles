# Reconnaissance functions for subdomain enumeration and discovery
#

# Sets up a workspace for a new target
# Usage: workspaceRecon <domain>
# Creates: <domain>/YYYY-MM-DD/ directory structure
workspaceRecon() {
  recon_maybe_render_plan "workspaceRecon" "$@" && return 0
  local target="${1:-}"
  local name
  name=$(echo "$target" | unfurl -u domains)
  local wdir="$name/$(date +%F)/"
  mkdir -p "$wdir"
  cd "$wdir"
  echo "$name" | anew domains
}

wellSubRecon() {
  recon_maybe_render_plan "wellSubRecon" "$@" && return 0
  recon_require_stage_inputs "wellSubRecon" || return 1
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
  recon_maybe_render_plan "subdomainenum" "$@" && return 0
  echo "${yellow}[+] Starting passive subdomain enumeration...${reset}"
  recon_require_stage_inputs "subdomainenum" || return 1
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
