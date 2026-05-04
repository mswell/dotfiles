#!/bin/bash

options="  Lock\n󰒲  Suspend\n󰍃  Logout\n󰜉  Restart\n󰐥  Shutdown"

choice=$(echo -e "$options" | walker --dmenu --width 295 --minheight 1 --maxheight 400 -p "System…" 2>/dev/null)

case "$choice" in
*Lock*)     hyprlock ;;
*Suspend*)  systemctl suspend ;;
*Logout*)   hyprctl dispatch exit ;;
*Restart*)  systemctl reboot ;;
*Shutdown*) systemctl poweroff ;;
esac
