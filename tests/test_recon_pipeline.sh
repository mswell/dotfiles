#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)
source "$ROOT/config/zsh/functions/pipeline.zsh"
red=''
reset=''

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cat > "$tmp/HTTPOK" <<'EOF'
https://ok.example [200] [Title]
https://forbidden.example [403] [Title]
https://missing.example [404] [Title]
https://redir.example [301] [Title]
EOF

categorize_live_hosts "$tmp/HTTPOK" "$tmp/out"

grep -qx 'https://ok.example' "$tmp/out/200HTTP"
grep -qx 'https://forbidden.example' "$tmp/out/403HTTP"
! grep -q 'https://missing.example' "$tmp/out/Without404"
grep -qx 'https://redir.example' "$tmp/out/ALLHTTP"

contract=$(recon_stage_contract getalive)
[[ "$contract" == *"inputs:clean.subdomains"* ]]
[[ "$contract" == *"outputs:HTTPOK,200HTTP,403HTTP,Without404,ALLHTTP"* ]]

if require_workspace_file "$tmp/does-not-exist" getalive >/tmp/recon-missing.out 2>&1; then
  echo "missing workspace file unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'requires' /tmp/recon-missing.out

echo "recon pipeline tests passed"
