#!/bin/bash
# $1 = número do workspace deste item; FOCUSED_WORKSPACE vem do hook do dinky
source "${CONFIG_DIR:-$HOME/.config/sketchybar}/colors.sh"

if [ "$1" = "$FOCUSED_WORKSPACE" ]; then
  sketchybar --set "$NAME" label.color=$BG background.color=$ACCENT
else
  sketchybar --set "$NAME" label.color=$MUTED background.color=$TRANSPARENT
fi
