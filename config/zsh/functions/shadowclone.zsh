#
# ShadowClone distributed recon helpers.
# Output contract follows the Raiju engagement layout:
#   3-Recon/shadowclone-YYYYMMDD-HHMMSS/{raw,normalized}/
# but the command name is generic so the same normalized pack can feed other flows.
#
# Main usage:
#   shadowflow all -i 6-Lists/in-scope-domains.txt --katana --nuclei
#   shadowflow subfinder -i roots.txt
#   shadowflow httpx -o 3-Recon/shadowclone-YYYYMMDD-HHMMSS
#   shadowflow summary -o 3-Recon/shadowclone-YYYYMMDD-HHMMSS
#
# Notes:
# - Uses {INPUT}, matching the existing bbrecon-cloud ShadowClone convention.
# - Calls ShadowClone by absolute script path to preserve the current engagement cwd.
#   This avoids the global shadowclone() wrapper's cd into ~/Projects/ShadowClone
#   making relative input/output paths resolve against the tool repo.
#

_shadowflow_usage() {
  cat <<'EOF'
Usage:
  shadowflow init [-o RUN_DIR]
  shadowflow all [-i INPUT] [-o RUN_DIR] [-s SPLIT] [--katana] [--nuclei]
  shadowflow subfinder [-i ROOT_DOMAINS] [-o RUN_DIR] [-s SPLIT]
  shadowflow dnsx [-i SUBDOMAINS] [-o RUN_DIR] [-s SPLIT]
  shadowflow httpx [-i HOSTS] [-o RUN_DIR] [-s SPLIT]
  shadowflow katana [-i ALIVE_URLS] [-o RUN_DIR] [-s SPLIT]
  shadowflow nuclei [-i ALIVE_URLS] [-o RUN_DIR] [-s SPLIT]
  shadowflow normalize [-o RUN_DIR]
  shadowflow summary [-o RUN_DIR]
  shadowflow doctor
  shadowflow last

Raiju-compatible output:
  3-Recon/shadowclone-YYYYMMDD-HHMMSS/
    raw/
      subfinder-all.txt
      dnsx-resolved.txt
      httpx-all.jsonl
      katana-all.txt
      nuclei-all.jsonl
    normalized/
      summary.md
      subdomains-all.txt
      subdomains-new.txt
      resolved.txt
      alive-httpx.jsonl
      alive-urls.txt
      interesting-hosts.tsv
      urls-all.txt
      urls-interesting.txt
      params.csv
      nuclei-medium-high.jsonl

Examples:
  shadowflow all --katana --nuclei
  shadowflow all -i 6-Lists/in-scope-domains.txt -s 50 --katana
  shadowflow subfinder -i roots.txt -s 5
  shadowflow httpx -i 3-Recon/shadowclone-*/normalized/resolved.txt -s 50
  shadowflow doctor
  shadowflow summary
EOF
}

_shadowflow_abs_path() {
  case "$1" in
    /*) echo "$1" ;;
    *) echo "$PWD/$1" ;;
  esac
}

_shadowflow_count() {
  [ -s "$1" ] && wc -l < "$1" | tr -d ' ' || echo 0
}

_shadowflow_project_root_ok() {
  [ -d "3-Recon" ] || { echo "${red}[-] shadowflow: no 3-Recon/ here. Run inside a Raiju engagement dir or pass -o RUN_DIR.${reset}"; return 1; }
}

_shadowflow_new_run_dir() {
  local dir="3-Recon/shadowclone-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$dir/raw" "$dir/normalized"
  echo "$dir" > "3-Recon/shadowclone-latest.txt"
  echo "$dir"
}

_shadowflow_latest_run_dir() {
  if [ -s "3-Recon/shadowclone-latest.txt" ]; then
    local dir
    dir=$(cat "3-Recon/shadowclone-latest.txt")
    [ -d "$dir" ] && { echo "$dir"; return 0; }
  fi
  ls -td 3-Recon/shadowclone-* 2>/dev/null | head -1
}

_shadowflow_prepare_run_dir() {
  local dir="$1"
  if [ -z "$dir" ]; then
    _shadowflow_project_root_ok || return 1
    dir=$(_shadowflow_latest_run_dir)
    if [ -z "$dir" ]; then
      dir=$(_shadowflow_new_run_dir)
    fi
  else
    mkdir -p "$dir/raw" "$dir/normalized"
    if [ -d "3-Recon" ]; then
      echo "$dir" > "3-Recon/shadowclone-latest.txt"
    fi
  fi
  mkdir -p "$dir/raw" "$dir/normalized"
  echo "$dir"
}

_shadowflow_require_file() {
  local file="$1"
  local label="$2"
  [ -s "$file" ] || { echo "${red}[-] shadowflow: $label not found/empty: $file${reset}"; return 1; }
}

_shadowflow_python() {
  local base="${SHADOWCLONE_DIR:-$HOME/Projects/ShadowClone}"
  if [ -x "$base/env/bin/python" ]; then
    echo "$base/env/bin/python"
  elif [ -x "$base/.venv/bin/python" ]; then
    echo "$base/.venv/bin/python"
  else
    command -v python3
  fi
}

_shadowflow_script() {
  local base="${SHADOWCLONE_DIR:-$HOME/Projects/ShadowClone}"
  echo "$base/shadowclone.py"
}

_shadowflow_output_has_error() {
  local file="$1"
  [ -s "$file" ] || return 1
  grep -Eq 'Encountered a bad command exit code|Exit code: 12[0-9]|command not found|No such file or directory' "$file"
}

_shadowflow_run_shadowclone() {
  local input="$1"
  local split="$2"
  local output="$3"
  local command_template="$4"
  local py sc abs_input abs_output

  py=$(_shadowflow_python)
  sc=$(_shadowflow_script)
  [ -n "$py" ] || { echo "${red}[-] shadowflow: python3 not found.${reset}"; return 1; }
  [ -f "$sc" ] || { echo "${red}[-] shadowflow: ShadowClone not found at $sc. Set SHADOWCLONE_DIR.${reset}"; return 1; }

  abs_input=$(_shadowflow_abs_path "$input")
  abs_output=$(_shadowflow_abs_path "$output")
  _shadowflow_require_file "$abs_input" "input" || return 1
  mkdir -p "$(dirname "$abs_output")"

  echo "${yellow}[+] ShadowClone: input=$input split=$split output=$output${reset}"
  "$py" "$sc" -i "$abs_input" -s "$split" -o "$abs_output" -c "$command_template" || return 1

  if _shadowflow_output_has_error "$abs_output"; then
    echo "${red}[-] shadowflow: ShadowClone command failed; see $output${reset}"
    grep -E 'Command:|Exit code:|Encountered a bad command exit code|command not found|No such file or directory' "$abs_output" | head -20
    echo "${yellow}[!] If Exit code is 127, the ShadowClone runtime image does not contain the tool. Run: shadowflow doctor${reset}"
    return 1
  fi
}

_shadowflow_default_input() {
  local stage="$1"
  local run_dir="$2"
  case "$stage" in
    subfinder) echo "6-Lists/in-scope-domains.txt" ;;
    dnsx)
      if [ -s "$run_dir/normalized/subdomains-all.txt" ]; then echo "$run_dir/normalized/subdomains-all.txt"; else echo "$run_dir/raw/subfinder-all.txt"; fi ;;
    httpx)
      if [ -s "$run_dir/normalized/resolved.txt" ]; then echo "$run_dir/normalized/resolved.txt"; else echo "$run_dir/normalized/subdomains-all.txt"; fi ;;
    katana|nuclei) echo "$run_dir/normalized/alive-urls.txt" ;;
    *) echo "6-Lists/in-scope-domains.txt" ;;
  esac
}

_shadowflow_normalize_subfinder() {
  local run_dir="$1"
  if [ -s "$run_dir/raw/subfinder-all.txt" ]; then
    if _shadowflow_output_has_error "$run_dir/raw/subfinder-all.txt"; then
      : > "$run_dir/normalized/subdomains-all.txt"
      : > "$run_dir/normalized/subdomains-new.txt"
      return 1
    fi
    grep -Eo '([A-Za-z0-9_-]+\.)+[A-Za-z]{2,}' "$run_dir/raw/subfinder-all.txt" | sort -u > "$run_dir/normalized/subdomains-all.txt"
    if [ -s "ccSurface.md" ]; then
      # Best-effort: avoid re-import noise by treating domains already mentioned in ccSurface as old.
      grep -Eo '([A-Za-z0-9_-]+\.)+[A-Za-z]{2,}' ccSurface.md | sort -u > "$run_dir/normalized/.known-subdomains.tmp" 2>/dev/null || true
      comm -13 "$run_dir/normalized/.known-subdomains.tmp" "$run_dir/normalized/subdomains-all.txt" > "$run_dir/normalized/subdomains-new.txt" 2>/dev/null || cp "$run_dir/normalized/subdomains-all.txt" "$run_dir/normalized/subdomains-new.txt"
      rm -f "$run_dir/normalized/.known-subdomains.tmp"
    else
      cp "$run_dir/normalized/subdomains-all.txt" "$run_dir/normalized/subdomains-new.txt"
    fi
  fi
}

_shadowflow_normalize_dnsx() {
  local run_dir="$1"
  if [ -s "$run_dir/raw/dnsx-resolved.txt" ]; then
    if _shadowflow_output_has_error "$run_dir/raw/dnsx-resolved.txt"; then
      : > "$run_dir/normalized/resolved.txt"
      return 1
    fi
    grep -Eo '([A-Za-z0-9_-]+\.)+[A-Za-z]{2,}' "$run_dir/raw/dnsx-resolved.txt" | sort -u > "$run_dir/normalized/resolved.txt"
  fi
}

_shadowflow_normalize_httpx() {
  local run_dir="$1"
  if [ -s "$run_dir/raw/httpx-all.jsonl" ]; then
    if _shadowflow_output_has_error "$run_dir/raw/httpx-all.jsonl"; then
      : > "$run_dir/normalized/alive-httpx.jsonl"
      : > "$run_dir/normalized/alive-urls.txt"
      : > "$run_dir/normalized/interesting-hosts.tsv"
      return 1
    fi
    if command -v jq >/dev/null 2>&1; then
      jq -c 'select(.url != null)' "$run_dir/raw/httpx-all.jsonl" > "$run_dir/normalized/alive-httpx.jsonl" 2>/dev/null || : > "$run_dir/normalized/alive-httpx.jsonl"
      jq -r '.url // empty' "$run_dir/normalized/alive-httpx.jsonl" 2>/dev/null | sort -u > "$run_dir/normalized/alive-urls.txt"
      jq -r '[.url, (.status_code // .status // ""), (.title // ""), ((.tech // []) | join("|"))] | @tsv' "$run_dir/normalized/alive-httpx.jsonl" 2>/dev/null > "$run_dir/normalized/interesting-hosts.tsv" || true
    else
      grep -E '^\{' "$run_dir/raw/httpx-all.jsonl" > "$run_dir/normalized/alive-httpx.jsonl"
      grep -Eo 'https?://[^" ]+' "$run_dir/raw/httpx-all.jsonl" | sort -u > "$run_dir/normalized/alive-urls.txt"
    fi
  fi
}

_shadowflow_normalize_urls() {
  local run_dir="$1"
  cat "$run_dir/raw/katana-all.txt" "$run_dir/raw/passive-urls.txt" 2>/dev/null | sed '/^$/d' | sort -u > "$run_dir/normalized/urls-all.txt"

  if [ -s "$run_dir/normalized/urls-all.txt" ]; then
    grep -Eai '/(admin|api|graphql|oauth|sso|callback|redirect|upload|download|import|export|webhook|invite|team|billing|debug|internal|swagger|openapi)' "$run_dir/normalized/urls-all.txt" \
      | sort -u > "$run_dir/normalized/urls-interesting.txt" 2>/dev/null || true

    {
      echo 'url,param'
      awk -F'?' 'NF>1 {base=$1; q=$2; n=split(q, pairs, "&"); for (i=1; i<=n; i++) {split(pairs[i], kv, "="); if (kv[1] != "") print base "," kv[1]}}' "$run_dir/normalized/urls-all.txt" | sort -u
    } > "$run_dir/normalized/params.csv"
  fi
}

_shadowflow_normalize_nuclei() {
  local run_dir="$1"
  if [ -s "$run_dir/raw/nuclei-all.jsonl" ]; then
    if command -v jq >/dev/null 2>&1; then
      jq -c 'select(.info.severity as $s | ["medium","high","critical"] | index($s))' "$run_dir/raw/nuclei-all.jsonl" \
        > "$run_dir/normalized/nuclei-medium-high.jsonl" 2>/dev/null || true
    else
      grep -Ei 'medium|high|critical' "$run_dir/raw/nuclei-all.jsonl" > "$run_dir/normalized/nuclei-medium-high.jsonl" 2>/dev/null || true
    fi
  fi
}

_shadowflow_normalize_all() {
  local run_dir="$1"
  _shadowflow_normalize_subfinder "$run_dir"
  _shadowflow_normalize_dnsx "$run_dir"
  _shadowflow_normalize_httpx "$run_dir"
  _shadowflow_normalize_urls "$run_dir"
  _shadowflow_normalize_nuclei "$run_dir"
}

_shadowflow_summary() {
  local run_dir="$1"
  local summary="$run_dir/normalized/summary.md"
  mkdir -p "$run_dir/normalized"
  cat > "$summary" <<EOF
# ShadowClone recon summary — $(date +%F)

## Scope
- Mode: read-only distributed recon
- Auth: none
- Run dir: $run_dir

## Output files
- subdomains: $run_dir/normalized/subdomains-all.txt
- new subdomains: $run_dir/normalized/subdomains-new.txt
- resolved hosts: $run_dir/normalized/resolved.txt
- alive httpx JSONL: $run_dir/normalized/alive-httpx.jsonl
- alive URLs: $run_dir/normalized/alive-urls.txt
- interesting URLs: $run_dir/normalized/urls-interesting.txt
- params: $run_dir/normalized/params.csv
- nuclei medium+: $run_dir/normalized/nuclei-medium-high.jsonl

## Counts
- subdomains: $(_shadowflow_count "$run_dir/normalized/subdomains-all.txt")
- new subdomains: $(_shadowflow_count "$run_dir/normalized/subdomains-new.txt")
- resolved: $(_shadowflow_count "$run_dir/normalized/resolved.txt")
- alive URLs: $(_shadowflow_count "$run_dir/normalized/alive-urls.txt")
- interesting URLs: $(_shadowflow_count "$run_dir/normalized/urls-interesting.txt")
- params rows: $(_shadowflow_count "$run_dir/normalized/params.csv")
- nuclei medium+: $(_shadowflow_count "$run_dir/normalized/nuclei-medium-high.jsonl")

## Top tech
EOF

  if command -v jq >/dev/null 2>&1 && [ -s "$run_dir/normalized/alive-httpx.jsonl" ]; then
    jq -r '.tech[]?' "$run_dir/normalized/alive-httpx.jsonl" 2>/dev/null | sort | uniq -c | sort -rn | head -15 | sed 's/^/- /' >> "$summary"
  else
    echo "- n/a" >> "$summary"
  fi

  cat >> "$summary" <<EOF

## High-signal observations
EOF
  if [ -s "$run_dir/normalized/interesting-hosts.tsv" ]; then
    grep -Eai 'admin|dashboard|swagger|api|internal|dev|staging|graphql|jenkins|kibana' "$run_dir/normalized/interesting-hosts.tsv" | head -20 | sed 's/^/- /' >> "$summary" || true
  fi
  if [ ! -s "$summary" ]; then :; fi

  cat >> "$summary" <<EOF

## Suggested ingestion prompt

\`\`\`text
Tenho output manual do ShadowClone em $run_dir/.
Leia primeiro normalized/summary.md, depois normalized/alive-httpx.jsonl, normalized/subdomains-new.txt, normalized/nuclei-medium-high.jsonl, normalized/urls-interesting.txt e normalized/params.csv.

Objetivo:
1. atualizar ccSurface.md com hosts/endpoints/tecnologias;
2. criar leads só para sinais com impacto plausível;
3. registrar em ccLog.md o que foi importado;
4. não tratar resultado de scanner como finding confirmado;
5. ignorar raw/ salvo se precisar verificar contexto.
\`\`\`
EOF
  echo "${green}[+] summary: $summary${reset}"
}

_shadowflow_doctor() {
  local tmp out py sc
  tmp=$(mktemp -d 2>/dev/null || mktemp -d -t shadowflow)
  printf 'example.com\n' > "$tmp/input.txt"
  out="$tmp/doctor.txt"
  py=$(_shadowflow_python)
  sc=$(_shadowflow_script)

  echo "${yellow}[+] shadowflow doctor: checking ShadowClone runtime tools...${reset}"
  echo "    script: $sc"
  echo "    python: $py"

  [ -n "$py" ] || { echo "${red}[-] python3 not found${reset}"; rm -rf "$tmp"; return 1; }
  [ -f "$sc" ] || { echo "${red}[-] ShadowClone script not found: $sc${reset}"; rm -rf "$tmp"; return 1; }

  "$py" "$sc" -i "$tmp/input.txt" -s 1 -o "$out" -c 'for t in subfinder dnsx httpx nuclei katana; do p=$(command -v "$t" || true); if [ -n "$p" ]; then echo "OK:$t:$p"; else echo "MISSING:$t"; fi; done; exit 0' || {
    echo "${red}[-] ShadowClone invocation failed${reset}"
    rm -rf "$tmp"
    return 1
  }

  cat "$out"
  if grep -Eq 'MISSING:(subfinder|dnsx|httpx)' "$out"; then
    echo "${red}[-] Runtime is missing required tools (subfinder/dnsx/httpx). Rebuild/deploy the ShadowClone runtime image with ProjectDiscovery tools.${reset}"
    echo "${yellow}[!] From ~/Projects/ShadowClone, rebuild your Lithops runtime, then rerun: shadowflow doctor${reset}"
    rm -rf "$tmp"
    return 1
  fi

  echo "${green}[+] ShadowClone runtime has the required base tools.${reset}"
  rm -rf "$tmp"
}

shadowflow() {
  local cmd="$1"
  [ -n "$cmd" ] || { _shadowflow_usage; return 2; }
  shift

  local input="" run_dir="" split=50 do_katana=0 do_nuclei=0
  while [ $# -gt 0 ]; do
    case "$1" in
      -i|--input) input="$2"; shift ;;
      -o|--output|--run-dir) run_dir="$2"; shift ;;
      -s|--split) split="$2"; shift ;;
      --katana) do_katana=1 ;;
      --nuclei) do_nuclei=1 ;;
      -h|--help) _shadowflow_usage; return 0 ;;
      *) echo "${red}[-] shadowflow: unknown arg $1${reset}"; _shadowflow_usage; return 2 ;;
    esac
    shift
  done

  case "$cmd" in
    help|-h|--help)
      _shadowflow_usage
      return 0
      ;;
    init)
      _shadowflow_project_root_ok || return 1
      if [ -z "$run_dir" ]; then run_dir=$(_shadowflow_new_run_dir); else run_dir=$(_shadowflow_prepare_run_dir "$run_dir") || return 1; fi
      echo "${green}[+] shadowflow run dir: $run_dir${reset}"
      return 0
      ;;
    doctor)
      _shadowflow_doctor
      return $?
      ;;
    last)
      _shadowflow_latest_run_dir
      return 0
      ;;
  esac

  run_dir=$(_shadowflow_prepare_run_dir "$run_dir") || return 1

  case "$cmd" in
    subfinder)
      [ -n "$input" ] || input=$(_shadowflow_default_input subfinder "$run_dir")
      _shadowflow_run_shadowclone "$input" "$split" "$run_dir/raw/subfinder-all.txt" "subfinder -dL {INPUT} -silent" || return 1
      _shadowflow_normalize_subfinder "$run_dir"
      ;;
    dnsx)
      [ -n "$input" ] || input=$(_shadowflow_default_input dnsx "$run_dir")
      _shadowflow_run_shadowclone "$input" "$split" "$run_dir/raw/dnsx-resolved.txt" "dnsx -l {INPUT} -silent" || return 1
      _shadowflow_normalize_dnsx "$run_dir"
      ;;
    httpx)
      [ -n "$input" ] || input=$(_shadowflow_default_input httpx "$run_dir")
      _shadowflow_run_shadowclone "$input" "$split" "$run_dir/raw/httpx-all.jsonl" "httpx -l {INPUT} -json -silent -sc -title -tech-detect -web-server -location -ip -cname -mc 200,201,202,204,301,302,307,401,403,405 -timeout 8" || return 1
      _shadowflow_normalize_httpx "$run_dir"
      ;;
    katana)
      [ -n "$input" ] || input=$(_shadowflow_default_input katana "$run_dir")
      _shadowflow_run_shadowclone "$input" "$split" "$run_dir/raw/katana-all.txt" "katana -list {INPUT} -silent -d 2 -jc" || return 1
      _shadowflow_normalize_urls "$run_dir"
      ;;
    nuclei)
      [ -n "$input" ] || input=$(_shadowflow_default_input nuclei "$run_dir")
      _shadowflow_run_shadowclone "$input" "$split" "$run_dir/raw/nuclei-all.jsonl" "nuclei -l {INPUT} -severity low,medium,high,critical -rl 25 -c 10 -jsonl -silent" || return 1
      _shadowflow_normalize_nuclei "$run_dir"
      ;;
    normalize)
      _shadowflow_normalize_all "$run_dir"
      ;;
    summary)
      _shadowflow_normalize_all "$run_dir"
      _shadowflow_summary "$run_dir"
      ;;
    all)
      [ -n "$input" ] || input=$(_shadowflow_default_input subfinder "$run_dir")
      _shadowflow_run_shadowclone "$input" 5 "$run_dir/raw/subfinder-all.txt" "subfinder -dL {INPUT} -silent" || return 1
      _shadowflow_normalize_subfinder "$run_dir"
      _shadowflow_run_shadowclone "$run_dir/normalized/subdomains-all.txt" "$split" "$run_dir/raw/dnsx-resolved.txt" "dnsx -l {INPUT} -silent" || return 1
      _shadowflow_normalize_dnsx "$run_dir"
      _shadowflow_run_shadowclone "$run_dir/normalized/resolved.txt" "$split" "$run_dir/raw/httpx-all.jsonl" "httpx -l {INPUT} -json -silent -sc -title -tech-detect -web-server -location -ip -cname -mc 200,201,202,204,301,302,307,401,403,405 -timeout 8" || return 1
      _shadowflow_normalize_httpx "$run_dir"
      if [ $do_katana -eq 1 ]; then
        _shadowflow_run_shadowclone "$run_dir/normalized/alive-urls.txt" 10 "$run_dir/raw/katana-all.txt" "katana -list {INPUT} -silent -d 2 -jc" || return 1
        _shadowflow_normalize_urls "$run_dir"
      fi
      if [ $do_nuclei -eq 1 ]; then
        _shadowflow_run_shadowclone "$run_dir/normalized/alive-urls.txt" 20 "$run_dir/raw/nuclei-all.jsonl" "nuclei -l {INPUT} -severity low,medium,high,critical -rl 25 -c 10 -jsonl -silent" || return 1
        _shadowflow_normalize_nuclei "$run_dir"
      fi
      _shadowflow_summary "$run_dir"
      ;;
    *)
      echo "${red}[-] shadowflow: unknown command $cmd${reset}"
      _shadowflow_usage
      return 2
      ;;
  esac

  echo "${green}[+] shadowflow done: $run_dir${reset}"
  echo "${yellow}[+] Tell your agent: ingest $run_dir/normalized/summary.md and normalized files; do not treat scanner output as confirmed findings.${reset}"
}
