#!/bin/bash
source "${CONFIG_DIR:-$HOME/.config/sketchybar}/colors.sh"

INFO_LINE="$(pmset -g batt)"
PERCENT="$(echo "$INFO_LINE" | grep -Eo '[0-9]+%' | head -1 | tr -d '%')"
if [ -z "$PERCENT" ]; then
  sketchybar --set "$NAME" drawing=off   # desktop sem bateria
  exit 0
fi

COLOR=$SUCCESS
case "$PERCENT" in
  100|[8-9][0-9]) ICON="󰁹" ;;
  [6-7][0-9])     ICON="󰂀" ;;
  [4-5][0-9])     ICON="󰁾" ;;
  [2-3][0-9])     ICON="󰁼"; COLOR=$WARNING ;;
  *)              ICON="󰁺"; COLOR=$URGENT ;;
esac
if echo "$INFO_LINE" | grep -q 'AC Power'; then
  ICON="󰂄"
fi
sketchybar --set "$NAME" drawing=on icon="$ICON" icon.color=$COLOR label="${PERCENT}%"
