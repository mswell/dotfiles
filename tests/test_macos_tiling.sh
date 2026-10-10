#!/usr/bin/env bash
# Testa o setup/macOS/tiling.sh fora do macOS com um `defaults` falso.
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

export DOTFILES="$ROOT"
export XDG_STATE_HOME="$WORK/state"
export CONFIG_DIR="$WORK/config"
FAKE_DEFAULTS="$WORK/defaults.db"
: > "$FAKE_DEFAULTS"

# defaults falso: guarda "domínio|chave|valor" em um arquivo
defaults() {
  local op="$1" domain="$2" key="$3"
  case "$op" in
    read)
      grep -F "$domain|$key|" "$FAKE_DEFAULTS" | cut -d'|' -f3 | grep . || return 1 ;;
    write)
      local value="$5"
      [[ "$value" == "true" ]] && value=1 || value=0
      grep -vF "$domain|$key|" "$FAKE_DEFAULTS" > "$FAKE_DEFAULTS.tmp" || true
      mv "$FAKE_DEFAULTS.tmp" "$FAKE_DEFAULTS"
      echo "$domain|$key|$value" >> "$FAKE_DEFAULTS" ;;
    delete)
      grep -vF "$domain|$key|" "$FAKE_DEFAULTS" > "$FAKE_DEFAULTS.tmp" || true
      mv "$FAKE_DEFAULTS.tmp" "$FAKE_DEFAULTS" ;;
  esac
}

fail() { echo "FAIL: $*" >&2; exit 1; }

source "$ROOT/setup/macOS/tiling.sh"

# A config precisa ser TOML válido e usar as cores do tokyonight
python3 - "$ROOT/config/dinky/dinky.toml" <<'PY'
import sys, tomllib
cfg = tomllib.load(open(sys.argv[1], "rb"))
assert cfg["borders"]["active-color"] == "#7aa2f7"
assert cfg["borders"]["inactive-color"] == "#3b4261"
assert cfg["mode"]["main"]["alt-1"] == "workspace 1"
assert cfg["mode"]["main"]["alt-0"] == "workspace 10"
assert cfg["workspaces"] == 10
PY

# Estado original: mru-spaces = true, workspaces-auto-swoosh ausente
defaults write com.apple.dock mru-spaces -bool true

defaults_snapshot >/dev/null
defaults_apply >/dev/null
[[ "$(defaults read com.apple.dock mru-spaces)" == "0" ]] || fail "mru-spaces não aplicado"
[[ "$(defaults read com.apple.dock workspaces-auto-swoosh)" == "0" ]] || fail "auto-swoosh não aplicado"

# Snapshot repetido não pode sobrescrever o original
defaults_snapshot >/dev/null
grep -qxF "com.apple.dock|mru-spaces|1" "$DEFAULTS_BACKUP" || fail "backup sobrescrito"

defaults_restore >/dev/null
[[ "$(defaults read com.apple.dock mru-spaces)" == "1" ]] || fail "mru-spaces não restaurado"
if defaults read com.apple.dock workspaces-auto-swoosh >/dev/null 2>&1; then
  fail "auto-swoosh deveria voltar a ausente (padrão do macOS)"
fi
[[ ! -f "$DEFAULTS_BACKUP" ]] || fail "backup deveria ser removido após restaurar"

# start-at-login: substitui a chave existente e não mexe nas tabelas
cfg="$WORK/dinky.toml"
cp "$ROOT/config/dinky/dinky.toml" "$cfg"
toml_set_top_key start-at-login false "$cfg"
[[ "$(grep -c '^start-at-login' "$cfg")" == "1" ]] || fail "start-at-login duplicado"
grep -qx 'start-at-login = false' "$cfg" || fail "start-at-login não atualizado"
cmp -s <(grep -v '^start-at-login' "$cfg") <(grep -v '^start-at-login' "$ROOT/config/dinky/dinky.toml") || fail "resto da config alterado"

# Sem a chave: entra antes da primeira tabela
printf 'workspaces = 5\n\n[gaps]\ninner = 1\n' > "$cfg"
toml_set_top_key start-at-login true "$cfg"
python3 - "$cfg" <<'PY'
import sys, tomllib
cfg = tomllib.load(open(sys.argv[1], "rb"))
assert cfg["start-at-login"] is True, cfg
assert cfg["gaps"]["inner"] == 1
PY

# Instalador: copy_file faz backup de config local diferente antes de sobrescrever
source "$ROOT/setup/lib/dotfiles_manifest.sh"
src="$WORK/src.conf"; dst="$WORK/home/.config/ghostty/config"
mkdir -p "$(dirname "$dst")"
echo "repo" > "$src"; echo "local" > "$dst"
_dotfiles_copy_file "$src" "$dst" >/dev/null
[[ "$(cat "$dst")" == "repo" ]] || fail "copy_file não copiou"
[[ "$(cat "$dst".bak.*)" == "local" ]] || fail "config local não foi salva em backup"
_dotfiles_copy_file "$src" "$dst" >/dev/null
[[ "$(ls "$dst".bak.* | wc -l)" -eq 1 ]] || fail "backup criado sem diferença"

# Manifest leva a config do herdr
plan=$(DOTFILES="$ROOT" CONFIG_DIR="$WORK/cfg" dotfiles_plan)
[[ "$plan" == *"copy_file|$ROOT/config/herdr/config.toml|$WORK/cfg/herdr/config.toml"* ]] \
  || fail "regra do herdr ausente no manifest"

# capture_configs.sh: puxa Ghostty (Application Support vence) e herdr para o repo
fake_repo="$WORK/repo"
mkdir -p "$fake_repo/setup"
cp -R "$ROOT/setup/lib" "$fake_repo/setup/lib"
git -C "$fake_repo" init -q
fake_home="$WORK/machome"
mkdir -p "$fake_home/Library/Application Support/com.mitchellh.ghostty/themes" "$fake_home/.config/ghostty" "$fake_home/.config/herdr"
echo "font-size = 16" > "$fake_home/Library/Application Support/com.mitchellh.ghostty/config"
echo "theme" > "$fake_home/Library/Application Support/com.mitchellh.ghostty/themes/mine.conf"
echo "font-size = 12" > "$fake_home/.config/ghostty/config"
echo '[keys]' > "$fake_home/.config/herdr/config.toml"
HOME="$fake_home" CONFIG_DIR="$fake_home/.config" DOTFILES="$fake_repo" HERDR_CONFIG_PATH="" \
  bash "$ROOT/setup/macOS/capture_configs.sh" >/dev/null
[[ "$(cat "$fake_repo/config/Ghostty/config")" == "font-size = 16" ]] || fail "Ghostty não capturado do Application Support"
[[ -f "$fake_repo/config/Ghostty/themes/mine.conf" ]] || fail "temas do Ghostty não capturados"
[[ "$(cat "$fake_repo/config/herdr/config.toml")" == "[keys]" ]] || fail "herdr não capturado"

echo "macos tiling tests passed"
