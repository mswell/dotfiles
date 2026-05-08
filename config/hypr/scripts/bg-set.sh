#!/usr/bin/env bash
# bg-set.sh — Set a specific wallpaper via wpaperd
# Called by waypaper post_command with $wallpaper substituted

WALLPAPER="$1"

[[ -z "$WALLPAPER" || ! -f "$WALLPAPER" ]] && exit 1

"$HOME/.config/hypr/scripts/wpaperd-set.sh" "$WALLPAPER"
