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
trap 'rm -rf "$mockbin"' EXIT
cat > "$mockbin/pkill" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat > "$mockbin/gsettings" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat > "$mockbin/hyprctl" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$mockbin/pkill" "$mockbin/gsettings" "$mockbin/hyprctl"

tmp_home=$(mktemp -d)
tmp_plan=$(THEME_HOME="$tmp_home" theme_plan wellpunk-light)
tmp_persist_plan_entry=$(printf '%s\n' "$tmp_plan" | grep '^persist|')
catalog_persist_entry=$(THEME_HOME="$tmp_home" _theme_catalog_persist_current_theme wellpunk-light)
[[ "$catalog_persist_entry" == "$tmp_persist_plan_entry" ]]
THEME_HOME="$tmp_home" PATH="$mockbin:/usr/bin:/bin" theme_apply wellpunk-light >/dev/null
persist_apply_entry="persist|$tmp_home/.config/hypr/current-theme|$(cat "$tmp_home/.config/hypr/current-theme")"
[[ "$persist_apply_entry" == "$catalog_persist_entry" ]]
rm -rf "$tmp_home"
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
assert_contains "$manifest" "copy_file|$ROOT/config/zsh/runtime.zsh|/tmp/dotfiles-home/.config/zsh/runtime.zsh"
assert_contains "$manifest" "symlink|/tmp/dotfiles-home/.config/git/themes/wellpunk-dark.gitconfig|/tmp/dotfiles-home/.config/git/current-theme.gitconfig"
assert_contains "$manifest" "copy_file|$ROOT/setup/lib/theme_orchestrator.sh|/tmp/dotfiles-home/.config/hypr/scripts/lib/theme_orchestrator.sh"
waybar_config=$(cat "$ROOT/config/waybar/config.jsonc")
assert_not_contains "$waybar_config" "~/.local/scripts/stream_status"

source "$ROOT/setup/lib/setup_plans.sh"
ubuntu_plan=$(setup_plan_print 1)
assert_contains "$ubuntu_plan" "setup/ubuntu/setup.sh"
assert_contains "$ubuntu_plan" "Dependency chain"

source "$ROOT/config/zsh/env.zsh"
source "$ROOT/setup/lib/hacktools_inventory.sh"
hacktools_plan=$(hacktools_inventory_plan)
assert_contains "$hacktools_plan" "projectdiscovery|pdtm|naabu,shuffledns,chaos,nuclei,notify,httpx,dnsx,subfinder,interactsh-client,alterx,katana"
assert_contains "$hacktools_plan" "wordlist|$LISTS_PATH/raft-large-directories-lowercase.txt|"
assert_contains "$hacktools_plan" "wordlist|$LISTS_PATH/dirsearch-dicc.txt|https://raw.githubusercontent.com/maurosoria/dirsearch/master/db/dicc.txt"

echo "shell module tests passed"
