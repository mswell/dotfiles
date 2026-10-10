#!/bin/bash
# MODE vem do hook mode-changed do dinky
if [ -z "$MODE" ] || [ "$MODE" = "main" ]; then
  sketchybar --set "$NAME" drawing=off
else
  sketchybar --set "$NAME" drawing=on label="$(echo "$MODE" | tr '[:lower:]' '[:upper:]')"
fi
