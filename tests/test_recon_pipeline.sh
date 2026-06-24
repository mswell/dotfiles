#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)
source "$ROOT/config/zsh/functions/pipeline.zsh"
source "$ROOT/config/zsh/functions/recon.zsh"
source "$ROOT/config/zsh/functions/scanning.zsh"
red=''
reset=''
yellow=''
green=''

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

workspace_contract=$(recon_stage_contract workspaceRecon)
[[ "$workspace_contract" == *"outputs:domains"* ]]

passive_contract=$(recon_stage_contract subdomainenum)
[[ "$passive_contract" == *"inputs:domains"* ]]
[[ "$passive_contract" == *"outputs:all.subdomains,clean.subdomains"* ]]

if require_workspace_file "$tmp/does-not-exist" getalive >/tmp/recon-missing.out 2>&1; then
  echo "missing workspace file unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'requires' /tmp/recon-missing.out

if (cd "$tmp" && subdomainenum) >/tmp/subdomainenum-missing.out 2>&1; then
  echo "subdomainenum without domains unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'subdomainenum requires domains' /tmp/subdomainenum-missing.out
grep -q 'Run: workspaceRecon <domain>' /tmp/subdomainenum-missing.out

printf 'example.com\n' > "$tmp/domains"
if (cd "$tmp" && resolving) >/tmp/resolving-missing.out 2>&1; then
  echo "resolving without sorted.all.subdomains unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'resolving requires sorted.all.subdomains' /tmp/resolving-missing.out

echo 'sub.example.com' > "$tmp/clean.subdomains"
rm -f "$tmp/ALLHTTP"
if (cd "$tmp" && screenshot) >/tmp/screenshot-missing.out 2>&1; then
  echo "screenshot without ALLHTTP unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'screenshot requires ALLHTTP' /tmp/screenshot-missing.out

if ! (cd "$tmp" && RECON_PIPELINE_MODE=plan subdomainenum) >/tmp/recon-plan.out 2>&1; then
  echo "subdomainenum plan unexpectedly failed" >&2
  cat /tmp/recon-plan.out >&2
  exit 1
fi
grep -q 'stage:subdomainenum' /tmp/recon-plan.out
grep -q 'requires:domains' /tmp/recon-plan.out
grep -q 'outputs:all.subdomains,clean.subdomains' /tmp/recon-plan.out
grep -q 'would-run:subfinder -up' /tmp/recon-plan.out
grep -q 'would-run:dnsx -l all.subdomains -silent | anew clean.subdomains' /tmp/recon-plan.out

if ! (cd "$tmp" && RECON_PIPELINE_MODE=plan workspaceRecon example.com) >/tmp/workspace-plan.out 2>&1; then
  echo "workspaceRecon plan unexpectedly failed" >&2
  cat /tmp/workspace-plan.out >&2
  exit 1
fi
grep -q 'stage:workspaceRecon' /tmp/workspace-plan.out
grep -q 'outputs:domains' /tmp/workspace-plan.out
grep -q 'would-run:mkdir -p example.com/' /tmp/workspace-plan.out

echo "recon pipeline tests passed"
