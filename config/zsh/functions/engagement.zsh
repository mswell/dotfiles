#
# Engagement recon bridge — drops tool output where the engagement workflow ingests it.
# Self-contained (does not use the workspace-file contract); writes into ./3-Recon/.
# Kept bash-parseable because local validation uses bash -n for zsh modules.
#

# Local recon: dnsx resolve + httpx live probe (+ optional nuclei) on the in-scope list.
# Usage (run from an engagement dir, or pass one):
#   bbrecon                 # dnsx + httpx on 6-Lists/in-scope-domains.txt
#   bbrecon -e              # also subfinder-enumerate registrable roots first
#   bbrecon -n              # also run nuclei on live hosts
#   bbrecon -f hosts.txt    # custom input host list
#   bbrecon /path/to/eng    # operate on a specific engagement dir
# Output -> 3-Recon/: httpx.jsonl (key file), live.txt, resolved.txt, nuclei.txt, subs.txt
bbrecon() {
  local enum=0 nuc=0 infile="" dir=""
  while [ $# -gt 0 ]; do
    case "$1" in
      -e) enum=1 ;;
      -n) nuc=1 ;;
      -f) infile="$2"; shift ;;
      -*) echo "${red}[-] bbrecon: unknown flag $1${reset}"; return 2 ;;
      *)  dir="$1" ;;
    esac
    shift
  done
  [ -n "$dir" ] && cd "$dir"
  [ -d 3-Recon ] || { echo "${red}[-] bbrecon: no 3-Recon/ here — run inside an engagement dir (or pass its path)${reset}"; return 1; }

  [ -z "$infile" ] && infile="6-Lists/in-scope-domains.txt"
  [ -s "$infile" ] || { echo "${red}[-] bbrecon: input host list not found/empty: $infile${reset}"; return 1; }

  local R=3-Recon ts
  ts=$(date +%Y%m%d-%H%M%S)
  echo "${yellow}[+] bbrecon: input=$infile hosts=$(wc -l < "$infile" | tr -d ' ') -> $R/ ($ts)${reset}"

  if [ $enum -eq 1 ]; then
    echo "${yellow}[+] subfinder enumerating registrable roots...${reset}"
    rev "$infile" | cut -d. -f1-2 | rev | sort -u > "$R/roots-$ts.txt"
    subfinder -dL "$R/roots-$ts.txt" -silent 2>/dev/null | anew "$R/subs.txt" >/dev/null
    cat "$infile" "$R/subs.txt" 2>/dev/null | sort -u > "$R/allhosts-$ts.txt"
    infile="$R/allhosts-$ts.txt"
    echo "${yellow}    total after enum: $(wc -l < "$infile" | tr -d ' ')${reset}"
  fi

  echo "${yellow}[+] dnsx resolving...${reset}"
  dnsx -l "$infile" -silent 2>/dev/null | anew "$R/resolved.txt" >/dev/null
  echo "${yellow}    resolved: $(wc -l < "$R/resolved.txt" | tr -d ' ')${reset}"

  echo "${yellow}[+] httpx probing (heavy step)...${reset}"
  httpx -l "$R/resolved.txt" -silent \
    -json -o "$R/httpx.jsonl" \
    -sc -title -tech-detect -web-server -location -ip -cname \
    -mc 200,201,202,204,301,302,307,401,403,405 \
    -rl 150 -timeout 8 2>/dev/null
  jq -r '.url' "$R/httpx.jsonl" 2>/dev/null | sort -u > "$R/live.txt"
  echo "${yellow}    live: $(wc -l < "$R/live.txt" | tr -d ' ')${reset}"

  if [ $nuc -eq 1 ]; then
    echo "${yellow}[+] nuclei on live hosts...${reset}"
    nuclei -l "$R/live.txt" -silent -severity low,medium,high,critical \
      -o "$R/nuclei.txt" -rl 150 2>/dev/null
    echo "${yellow}    nuclei findings: $(wc -l < "$R/nuclei.txt" 2>/dev/null | tr -d ' ')${reset}"
  fi

  echo "${yellow}[+] Top tech on live hosts:${reset}"
  jq -r '.tech[]?' "$R/httpx.jsonl" 2>/dev/null | sort | uniq -c | sort -rn | head -15
  echo "${yellow}[+] Done. In the engagement, tell the assistant 'sync recon' (it reads $R/httpx.jsonl).${reset}"
}

# Distributed recon via ShadowClone (AWS Lambda) — same 3-Recon/ contract as bbrecon.
# Splits the in-scope list across hundreds of lambdas: minutes instead of hours for large scopes.
# Prereqs (one-time):
#   pipx install lithops            (or pip install lithops)
#   git clone https://github.com/fyoorer/ShadowClone ~/tools/ShadowClone
#   pip install -r ~/tools/ShadowClone/requirements.txt
#   aws configure                   (creds for the Lambda backend)
#   lithops runtime build -f Dockerfile <img>   (image MUST contain httpx, + nuclei if used)
#   edit ~/tools/ShadowClone/config.py per its README
# Override repo path with: export SHADOWCLONE_DIR=/path/to/ShadowClone
# Usage:
#   bbrecon-cloud                # distributed httpx on 6-Lists/in-scope-domains.txt
#   bbrecon-cloud -s 50          # 50 hosts per lambda worker (default 100)
#   bbrecon-cloud -n             # also distributed nuclei on live hosts
#   bbrecon-cloud -f hosts.txt   # custom input list
bbrecon-cloud() {
  local split=100 nuc=0 infile="" dir=""
  while [ $# -gt 0 ]; do
    case "$1" in
      -s) split="$2"; shift ;;
      -n) nuc=1 ;;
      -f) infile="$2"; shift ;;
      -*) echo "${red}[-] bbrecon-cloud: unknown flag $1${reset}"; return 2 ;;
      *)  dir="$1" ;;
    esac
    shift
  done
  [ -n "$dir" ] && cd "$dir"
  [ -d 3-Recon ] || { echo "${red}[-] bbrecon-cloud: no 3-Recon/ here — run inside an engagement dir (or pass its path)${reset}"; return 1; }

  local SC="${SHADOWCLONE_DIR:-$HOME/tools/ShadowClone}/shadowclone.py"
  [ -f "$SC" ] || { echo "${red}[-] bbrecon-cloud: ShadowClone not found at $SC — set SHADOWCLONE_DIR or install it (see prereqs).${reset}"; return 1; }

  [ -z "$infile" ] && infile="6-Lists/in-scope-domains.txt"
  [ -s "$infile" ] || { echo "${red}[-] bbrecon-cloud: input host list not found/empty: $infile${reset}"; return 1; }

  local R=3-Recon ts
  ts=$(date +%Y%m%d-%H%M%S)
  echo "${yellow}[+] bbrecon-cloud: input=$infile hosts=$(wc -l < "$infile" | tr -d ' ') split=$split -> $R/ ($ts)${reset}"

  echo "${yellow}[+] ShadowClone httpx across lambdas...${reset}"
  python3 "$SC" -i "$infile" -s "$split" -o "$R/httpx.jsonl" \
    -c "httpx -silent -json -l {INPUT} -sc -title -tech-detect -web-server -location -ip -cname -mc 200,201,202,204,301,302,307,401,403,405 -timeout 8" || {
      echo "${red}[-] bbrecon-cloud: ShadowClone run failed — check lithops/aws config.${reset}"; return 1; }
  jq -r '.url' "$R/httpx.jsonl" 2>/dev/null | sort -u > "$R/live.txt"
  echo "${yellow}    live: $(wc -l < "$R/live.txt" | tr -d ' ')${reset}"

  if [ $nuc -eq 1 ]; then
    echo "${yellow}[+] ShadowClone nuclei on live hosts...${reset}"
    python3 "$SC" -i "$R/live.txt" -s "$split" -o "$R/nuclei.txt" \
      -c "nuclei -silent -l {INPUT} -severity low,medium,high,critical" || \
      echo "${red}[-] bbrecon-cloud: nuclei run failed (non-fatal).${reset}"
    echo "${yellow}    nuclei findings: $(wc -l < "$R/nuclei.txt" 2>/dev/null | tr -d ' ')${reset}"
  fi

  echo "${yellow}[+] Top tech on live hosts:${reset}"
  jq -r '.tech[]?' "$R/httpx.jsonl" 2>/dev/null | sort | uniq -c | sort -rn | head -15
  echo "${yellow}[+] Done. In the engagement, tell the assistant 'sync recon' (it reads $R/httpx.jsonl).${reset}"
}
