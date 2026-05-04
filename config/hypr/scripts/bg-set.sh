#!/usr/bin/env bash
# bg-set.sh — Set a specific wallpaper via wpaperd
# Called by waypaper post_command with $wallpaper substituted

WALLPAPER="$1"

[[ -z "$WALLPAPER" || ! -f "$WALLPAPER" ]] && exit 1

cat > "$HOME/.config/wpaperd/wallpaper.toml" <<EOF
[default]
path = "$WALLPAPER"
mode = "stretch"
EOF

pkill wpaperd 2>/dev/null
sleep 0.2
rm -f "$HOME/.local/state/wpaperd/wallpapers/"* 2>/dev/null
wpaperd -d
