#
# Recon workspace pipeline contracts and pure helpers.
# Kept bash-parseable because local validation uses bash -n for zsh modules.
#

recon_stage_contract() {
  local stage="${1:-}"
  case "$stage" in
    workspaceRecon)
      echo "inputs:- outputs:domains" ;;
    subdomainenum)
      echo "inputs:domains outputs:all.subdomains,clean.subdomains" ;;
    brutesub|resolving)
      echo "inputs:domains,sorted.all.subdomains outputs:resolved.subdomains" ;;
    getalive)
      echo "inputs:clean.subdomains outputs:HTTPOK,200HTTP,403HTTP,Without404,ALLHTTP" ;;
    naabuRecon)
      echo "inputs:clean.subdomains outputs:naabuScan,HTTPOKSCAN,HTTPOK,200HTTP,403HTTP,Without404,ALLHTTP" ;;
    nuclei)
      echo "inputs:ALLHTTP outputs:scan-specific" ;;
    screenshot)
      echo "inputs:ALLHTTP outputs:aqua_out" ;;
    faviconEnum)
      echo "inputs:200HTTP outputs:outputFavFreak" ;;
    *)
      echo "inputs:unknown outputs:unknown" ;;
  esac
}

recon_previous_stage_for_file() {
  case "$1" in
    domains) echo "workspaceRecon <domain>" ;;
    clean.subdomains) echo "wellSubRecon or subdomainenum" ;;
    sorted.all.subdomains) echo "subdomainenum or your passive enumeration stage" ;;
    ALLHTTP|200HTTP|403HTTP|Without404|HTTPOK) echo "getalive" ;;
    dnsx.txt) echo "dnsrecords" ;;
    cleanHakipResult.txt) echo "massHakip2host" ;;
    *) echo "the stage that produces $1" ;;
  esac
}

require_workspace_file() {
  local file="$1"
  local stage="${2:-current stage}"
  if [ ! -s "$file" ]; then
    echo "${red}[-] $stage requires $file, but it is missing or empty. Run: $(recon_previous_stage_for_file "$file")${reset}"
    return 1
  fi
}

# Pure transformation: categorize httpx -status-code output into the existing files.
# Usage: categorize_live_hosts <input_file> [output_dir]
categorize_live_hosts() {
  local input_file="$1"
  local output_dir="${2:-.}"
  require_workspace_file "$input_file" "categorize_live_hosts" || return 1
  mkdir -p "$output_dir"
  awk '/200/ {print $1}' "$input_file" > "$output_dir/200HTTP"
  awk '/40[0-4]/ && $0 !~ /404/ {print $1}' "$input_file" > "$output_dir/403HTTP"
  awk '$0 !~ /404/ {print $1}' "$input_file" > "$output_dir/Without404"
  awk '{print $1}' "$input_file" > "$output_dir/ALLHTTP"
}
