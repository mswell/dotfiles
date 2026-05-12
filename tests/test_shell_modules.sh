#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)
export DOTFILES="$ROOT"
export HOME

assert_contains() {
  local haystack="$1" needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "Expected output to contain: $needle" >&2
    echo "$haystack" >&2
    exit 1
  fi
}

source "$ROOT/setup/lib/theme_orchestrator.sh"
[[ "$(theme_resolve vantablack)" == "vantablack" ]]
if theme_resolve invalid >/tmp/theme-invalid.out 2>&1; then
  echo "invalid theme unexpectedly succeeded" >&2
  exit 1
fi
plan=$(THEME_HOME=/tmp/dotfiles-home theme_plan white)
assert_contains "$plan" "persist|/tmp/dotfiles-home/.config/hypr/current-theme|white"
assert_contains "$plan" "symlink|/tmp/dotfiles-home/.config/waybar/themes/white.css|/tmp/dotfiles-home/.config/waybar/themes/current.css"

source "$ROOT/setup/lib/dotfiles_manifest.sh"
manifest=$(DOTFILES="$ROOT" HOME=/tmp/dotfiles-home dotfiles_plan)
assert_contains "$manifest" "copy_file|$ROOT/config/zsh/runtime.zsh|/tmp/dotfiles-home/.config/zsh/runtime.zsh"
assert_contains "$manifest" "symlink|/tmp/dotfiles-home/.config/git/themes/vantablack.gitconfig|/tmp/dotfiles-home/.config/git/current-theme.gitconfig"

source "$ROOT/setup/lib/setup_plans.sh"
ubuntu_plan=$(setup_plan_print 1)
assert_contains "$ubuntu_plan" "setup/ubuntu/setup.sh"
assert_contains "$ubuntu_plan" "Dependency chain"

source "$ROOT/config/zsh/env.zsh"
source "$ROOT/setup/lib/hacktools_inventory.sh"
hacktools_plan=$(hacktools_inventory_plan)
assert_contains "$hacktools_plan" "projectdiscovery|pdtm|naabu,shuffledns,chaos,nuclei,notify,httpx,dnsx,subfinder,interactsh-client,alterx,katana"
assert_contains "$hacktools_plan" "wordlist|$LISTS_PATH/raft-large-directories-lowercase.txt|"
assert_contains "$hacktools_plan" "repo|Dirsearch|https://github.com/maurosoria/dirsearch"

echo "shell module tests passed"
