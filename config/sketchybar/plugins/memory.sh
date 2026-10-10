#!/bin/bash
FREE="$(memory_pressure 2>/dev/null | awk -F': ' '/free percentage/ { gsub("%", "", $2); print $2 }')"
if [ -n "$FREE" ]; then
  sketchybar --set "$NAME" label="$((100 - FREE))%"
fi
