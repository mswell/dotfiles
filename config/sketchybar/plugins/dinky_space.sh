#!/bin/bash
# $1 = número do workspace deste item; FOCUSED_WORKSPACE vem do hook do dinky
source "${CONFIG_DIR:-$HOME/.config/sketchybar}/colors.sh"

# Na inicialização não há evento do dinky: pergunta o workspace em foco
[ -z "$FOCUSED_WORKSPACE" ] && FOCUSED_WORKSPACE=$(dinky list-workspaces --focused 2>/dev/null)

if [ "$1" = "$FOCUSED_WORKSPACE" ]; then
  sketchybar --set "$NAME" label.color=$BG background.color=$ACCENT
else
  sketchybar --set "$NAME" label.color=$MUTED background.color=$TRANSPARENT
fi
