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
assert cfg["mode"]["main"]["alt-r"] == "mode resize"
assert cfg["mode"]["resize"]["esc"] == "mode main"
assert "sketchybar --trigger dinky_workspace_change" in cfg["hooks"]["workspace-changed"][0]
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
if defaults read NSGlobalDomain _HIHideMenuBar >/dev/null 2>&1; then
  fail "_HIHideMenuBar deveria voltar a ausente"
fi

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

# SketchyBar: plugins chamam um sketchybar falso que registra os argumentos
bin="$WORK/bin"; mkdir -p "$bin"
printf '#!/bin/bash\necho "$*" >> "%s"\n' "$WORK/sb.log" > "$bin/sketchybar"; chmod +x "$bin/sketchybar"
sb() { : > "$WORK/sb.log"; PATH="$bin:$PATH" CONFIG_DIR="$ROOT/config/sketchybar" "$@"; cat "$WORK/sb.log"; }
out=$(sb env NAME=space.3 FOCUSED_WORKSPACE=3 bash "$ROOT/config/sketchybar/plugins/dinky_space.sh" 3)
[[ "$out" == *"background.color=0xff7aa2f7"* ]] || fail "workspace em foco sem destaque: $out"
out=$(sb env NAME=space.2 FOCUSED_WORKSPACE=3 bash "$ROOT/config/sketchybar/plugins/dinky_space.sh" 2)
[[ "$out" == *"background.color=0x00000000"* ]] || fail "workspace sem foco destacado: $out"
out=$(sb env NAME=dinky_mode MODE=resize bash "$ROOT/config/sketchybar/plugins/dinky_mode.sh")
[[ "$out" == *"drawing=on label=RESIZE"* ]] || fail "modo resize não exibido: $out"
out=$(sb env NAME=dinky_mode MODE=main bash "$ROOT/config/sketchybar/plugins/dinky_mode.sh")
[[ "$out" == *"drawing=off"* ]] || fail "modo main deveria ocultar: $out"
out=$(sb env CONFIG_DIR="$ROOT/config/sketchybar" bash "$ROOT/config/sketchybar/sketchybarrc")
[[ "$out" == *"--add item space.10 left"* && "$out" == *"--add event dinky_mode_change"* ]] || fail "sketchybarrc incompleto"

# install_sketchybar_config faz backup de config local diferente
SKETCHYBAR_CONFIG_DIR="$WORK/sbcfg"
mkdir -p "$SKETCHYBAR_CONFIG_DIR"; echo "local" > "$SKETCHYBAR_CONFIG_DIR/sketchybarrc"
install_sketchybar_config >/dev/null
cmp -s "$ROOT/config/sketchybar/sketchybarrc" "$SKETCHYBAR_CONFIG_DIR/sketchybarrc" || fail "config da barra não copiada"
[[ "$(cat "$WORK"/sbcfg.bak.*/sketchybarrc)" == "local" ]] || fail "config local da barra sem backup"
install_sketchybar_config >/dev/null
[[ "$(ls -d "$WORK"/sbcfg.bak.* | wc -l)" -eq 1 ]] || fail "backup da barra criado sem diferença"

echo "macos tiling tests passed"
