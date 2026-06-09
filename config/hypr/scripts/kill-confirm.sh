#!/bin/bash

choice=$(echo -e "  Yes, close\n  Cancel" | walker --dmenu --width 260 --minheight 1 --maxheight 200 -p "Close window?" 2>/dev/null)

case "$choice" in
*Yes*) hyprctl dispatch 'hl.dsp.window.close()' ;;
esac
