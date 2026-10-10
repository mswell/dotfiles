#!/bin/bash
source "${CONFIG_DIR:-$HOME/.config/sketchybar}/colors.sh"

# O nome da rede Wi-Fi exige permissão de Localização no macOS recente;
# mostra só o estado e o IP.
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"
if [ -n "$IP" ]; then
  sketchybar --set "$NAME" icon="󰖩" icon.color=$SUCCESS label="$IP"
else
  sketchybar --set "$NAME" icon="󰖪" icon.color=$URGENT label="offline"
fi
