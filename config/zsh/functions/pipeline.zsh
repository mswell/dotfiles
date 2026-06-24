#
# Recon workspace pipeline contracts and pure helpers.
# Kept bash-parseable because local validation uses bash -n for zsh modules.
#

recon_stage_inputs() {
  case "$1" in
    workspaceRecon) echo "-" ;;
    wellSubRecon|subdomainenum) echo "domains" ;;
    brutesub|resolving) echo "domains,sorted.all.subdomains" ;;
    getalive|naabuRecon) echo "clean.subdomains" ;;
    nuclei|screenshot) echo "ALLHTTP" ;;
    faviconEnum) echo "200HTTP" ;;
    *) echo "unknown" ;;
  esac
}

recon_stage_outputs() {
  case "$1" in
    workspaceRecon) echo "domains" ;;
    wellSubRecon) echo "all.subdomains,clean.subdomains,cidr" ;;
    subdomainenum) echo "all.subdomains,clean.subdomains" ;;
    brutesub|resolving) echo "resolved.subdomains" ;;
    getalive) echo "HTTPOK,200HTTP,403HTTP,Without404,ALLHTTP" ;;
    naabuRecon) echo "naabuScan,HTTPOKSCAN,HTTPOK,200HTTP,403HTTP,Without404,ALLHTTP" ;;
    nuclei) echo "scan-specific" ;;
    screenshot) echo "aqua_out" ;;
    faviconEnum) echo "outputFavFreak" ;;
    *) echo "unknown" ;;
  esac
}

recon_stage_contract() {
  local stage="${1:-}"
  echo "inputs:$(recon_stage_inputs "$stage") outputs:$(recon_stage_outputs "$stage")"
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

recon_require_stage_inputs() {
  local stage="$1"
  local required_inputs
  local input
  local input_lines

  required_inputs=$(recon_stage_inputs "$stage")
  [ "$required_inputs" = "-" ] && return 0

  input_lines=$(printf '%s' "$required_inputs" | tr ',' '\n')
  while IFS= read -r input; do
    [ -n "$input" ] || continue
    require_workspace_file "$input" "$stage" || return 1
  done <<EOF
$input_lines
EOF
}

recon_stage_plan() {
  local stage="$1"
  [ "$#" -gt 0 ] && shift
  local inputs outputs target wdir
  inputs=$(recon_stage_inputs "$stage")
  outputs=$(recon_stage_outputs "$stage")

  echo "stage:$stage"
  echo "requires:$inputs"
  echo "outputs:$outputs"

  case "$stage" in
    workspaceRecon)
      target="${1:-<domain>}"
      wdir="$target/$(date +%F)/"
      echo "would-run:mkdir -p $wdir"
      echo "would-run:cd $wdir"
      echo "would-run:echo $target | anew domains"
      ;;
    wellSubRecon)
      echo "would-run:subdomainenum"
      echo "would-run:if [ -s asn ]; then cat asn | metabigor net --asn | anew cidr; fi"
      echo "would-run:if [ -s cidr ]; then cat cidr | anew clean.subdomains; fi"
      echo "would-run:brutesub"
      ;;
    subdomainenum)
      echo "would-run:subfinder -up"
      echo "would-run:subfinder -nW -t 100 -all -o all.subdomains -dL domains"
      echo "would-run:dnsx -l all.subdomains -silent | anew clean.subdomains"
      ;;
  esac
}

recon_maybe_render_plan() {
  local stage="$1"
  [ "$#" -gt 0 ] && shift
  case "${1:-}" in
    --plan|--dry-run)
      [ "$#" -gt 0 ] && shift
      recon_stage_plan "$stage" "$@"
      return 0
      ;;
  esac

  if [ "${RECON_PIPELINE_MODE:-}" = "plan" ] || [ "${RECON_PIPELINE_MODE:-}" = "dry-run" ]; then
    recon_stage_plan "$stage" "$@"
    return 0
  fi

  return 1
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
