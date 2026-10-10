#!/bin/bash
CORES="$(sysctl -n hw.ncpu)"
CPU="$(ps -A -o %cpu= | awk -v cores="$CORES" '{ sum += $1 } END { printf "%.0f", sum / cores }')"
sketchybar --set "$NAME" label="${CPU}%"
