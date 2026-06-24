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

assert_not_contains() {
  local haystack="$1" needle="$2"
  if [[ "$haystack" == *"$needle"* ]]; then
    echo "Expected output not to contain: $needle" >&2
    echo "$haystack" >&2
    exit 1
  fi
}

manifest_rule_matches_expected() {
  local action="$1" source="$2" destination="$3"
  [[ "$action" == "$MANIFEST_EXPECT_ACTION" ]] &&
    [[ "$source" == "$MANIFEST_EXPECT_SOURCE" ]] &&
    [[ "$destination" == "$MANIFEST_EXPECT_DESTINATION" ]]
}

manifest_rule_callback() {
  manifest_rule_matches_expected "$@" && MANIFEST_RULE_FOUND=1
}

assert_manifest_has_rule() {
  MANIFEST_EXPECT_ACTION="$1"
  MANIFEST_EXPECT_SOURCE="$2"
  MANIFEST_EXPECT_DESTINATION="$3"
  MANIFEST_RULE_FOUND=0
  DOTFILES="$ROOT" HOME=/tmp/dotfiles-home dotfiles_manifest_visit manifest_rule_callback
  if [[ "$MANIFEST_RULE_FOUND" != "1" ]]; then
    echo "Expected manifest rule not found: $MANIFEST_EXPECT_ACTION $MANIFEST_EXPECT_SOURCE => $MANIFEST_EXPECT_DESTINATION" >&2
    exit 1
  fi
}

source "$ROOT/setup/lib/theme_orchestrator.sh"
[[ "$(theme_resolve wellpunk-dark)" == "wellpunk-dark" ]]
if theme_resolve invalid >/tmp/theme-invalid.out 2>&1; then
  echo "invalid theme unexpectedly succeeded" >&2
  exit 1
fi
plan=$(THEME_HOME=/tmp/dotfiles-home theme_plan wellpunk-light)
assert_contains "$plan" "persist|/tmp/dotfiles-home/.config/hypr/current-theme|wellpunk-light"
assert_contains "$plan" "symlink|/tmp/dotfiles-home/.config/waybar/themes/wellpunk-light.css|/tmp/dotfiles-home/.config/waybar/themes/current.css"
assert_contains "$plan" "set|gsettings org.gnome.desktop.interface color-scheme|prefer-light"
assert_contains "$plan" "check|xdg-desktop-portal Settings color-scheme|2"
if grep -Eq 'google-chrome|chromium.*/Preferences|extensions\.theme\.system_theme' "$ROOT/setup/lib/theme_orchestrator.sh"; then
  echo "theme orchestrator must not edit Chromium-family browser profiles" >&2
  exit 1
fi

mockbin=$(mktemp -d)
tmp_home=""
trap 'rm -rf "$mockbin" "$tmp_home"' EXIT
for command_name in pkill gsettings hyprctl; do
  cat > "$mockbin/$command_name" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
done
chmod +x "$mockbin/pkill" "$mockbin/gsettings" "$mockbin/hyprctl"

tmp_home=$(mktemp -d)
tmp_plan=$(THEME_HOME="$tmp_home" theme_plan wellpunk-light)
plan_persist_entry=$(printf '%s\n' "$tmp_plan" | grep '^persist|')
catalog_persist_entry=$(THEME_HOME="$tmp_home" _theme_catalog_persist_current_theme wellpunk-light)
[[ "$catalog_persist_entry" == "$plan_persist_entry" ]]
THEME_HOME="$tmp_home" PATH="$mockbin:/usr/bin:/bin" theme_apply wellpunk-light >/dev/null
applied_persist_entry="persist|$tmp_home/.config/hypr/current-theme|$(cat "$tmp_home/.config/hypr/current-theme")"
[[ "$applied_persist_entry" == "$catalog_persist_entry" ]]
rm -rf "$tmp_home"
tmp_home=""
cat > "$mockbin/dbus-send" <<'EOF'
#!/usr/bin/env bash
printf 'method return\n   variant       variant          uint32 1\n'
EOF
cat > "$mockbin/notify-send" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "${THEME_NOTIFY_LOG:?}"
EOF
chmod +x "$mockbin/dbus-send" "$mockbin/notify-send"
THEME_NOTIFY_LOG="$mockbin/notify.log" PATH="$mockbin:$PATH" _theme_validate_portal_color_scheme wellpunk-light 2 2>"$mockbin/portal.err"
assert_contains "$(cat "$mockbin/portal.err")" "XDG portal color-scheme mismatch after switching to wellpunk-light"
assert_contains "$(cat "$mockbin/notify.log")" "Theme portal mismatch"
: > "$mockbin/portal.err"
: > "$mockbin/notify.log"
THEME_NOTIFY_LOG="$mockbin/notify.log" PATH="$mockbin:$PATH" _theme_validate_portal_color_scheme wellpunk-dark 1 2>"$mockbin/portal.err"
if [[ -s "$mockbin/portal.err" || -s "$mockbin/notify.log" ]]; then
  echo "portal validation warned despite matching expected color-scheme" >&2
  exit 1
fi

source "$ROOT/setup/lib/dotfiles_manifest.sh"
manifest=$(DOTFILES="$ROOT" HOME=/tmp/dotfiles-home dotfiles_plan)
assert_manifest_has_rule "dir" "" "/tmp/dotfiles-home/.config/zsh"
assert_manifest_has_rule "copy_file" "$ROOT/config/zsh/runtime.zsh" "/tmp/dotfiles-home/.config/zsh/runtime.zsh"
assert_manifest_has_rule "symlink" "/tmp/dotfiles-home/.config/git/themes/wellpunk-dark.gitconfig" "/tmp/dotfiles-home/.config/git/current-theme.gitconfig"
assert_manifest_has_rule "copy_file" "$ROOT/setup/lib/theme_orchestrator.sh" "/tmp/dotfiles-home/.config/hypr/scripts/lib/theme_orchestrator.sh"
assert_contains "$manifest" "dir||/tmp/dotfiles-home/.config/zsh"
assert_contains "$manifest" "copy_file|$ROOT/config/zsh/runtime.zsh|/tmp/dotfiles-home/.config/zsh/runtime.zsh"
waybar_config=$(cat "$ROOT/config/waybar/config.jsonc")
assert_not_contains "$waybar_config" "~/.local/scripts/stream_status"

source "$ROOT/setup/lib/setup_plans.sh"
ubuntu_plan=$(setup_plan_print 1)
assert_contains "$ubuntu_plan" "setup/ubuntu/setup.sh"
assert_contains "$ubuntu_plan" "Dependency chain"

source "$ROOT/config/zsh/env.zsh"
source "$ROOT/setup/lib/hacktools_inventory.sh"
hacktools_plan=$(hacktools_inventory_plan)
[[ "$(hacktools_projectdiscovery_csv)" == "naabu,shuffledns,chaos,nuclei,notify,httpx,dnsx,subfinder,interactsh-client,alterx,katana" ]]
expected_hacktools_lines=(
  "path|directory|TOOLS_PATH|$TOOLS_PATH"
  "go_install|projectdiscovery|naabu|github.com/projectdiscovery/naabu/v2/cmd/naabu@latest"
  "go_install|generic|gf|github.com/tomnomnom/gf@latest"
  "python_install|pip_user|uro|uro"
  "repo_sync|gf|$TOOLS_PATH/gf|https://github.com/tomnomnom/gf"
  "wordlist_download|$LISTS_PATH/raft-large-directories-lowercase.txt|https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/raft-large-directories-lowercase.txt"
  "wordlist_download|$LISTS_PATH/dirsearch-dicc.txt|https://raw.githubusercontent.com/maurosoria/dirsearch/master/db/dicc.txt"
  "post_install|gf_templates|copy_gf_templates|$HOME/.gf"
  "post_install|recursive_wordlist|generate_recursive_wordlist|$LISTS_PATH/recursive.txt"
)
for expected_hacktools_line in "${expected_hacktools_lines[@]}"; do
  assert_contains "$hacktools_plan" "$expected_hacktools_line"
done
assert_not_contains "$hacktools_plan" "pdtm"

echo "shell module tests passed"
