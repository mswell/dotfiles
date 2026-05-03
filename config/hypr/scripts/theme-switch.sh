#!/usr/bin/env bash
# theme-switch.sh — Switch between vantablack and white themes
# Usage: theme-switch.sh [vantablack|white|toggle]

HYPR_THEMES="$HOME/.config/hypr/themes"
WAYBAR_THEMES="$HOME/.config/waybar/themes"
KITTY_THEMES="$HOME/.config/kitty/themes"
ROFI_COLORS="$HOME/.config/rofi/colors"
TMUX_THEMES="$HOME/.config/tmux/themes"
CURRENT_FILE="$HOME/.config/hypr/current-theme"
BG_DIR="$HOME/.config/backgrounds"

# Determine target theme
if [[ "$1" == "toggle" ]]; then
    current=$(cat "$CURRENT_FILE" 2>/dev/null || echo "vantablack")
    [[ "$current" == "vantablack" ]] && THEME="white" || THEME="vantablack"
elif [[ "$1" == "white" || "$1" == "vantablack" ]]; then
    THEME="$1"
else
    echo "Usage: theme-switch.sh [vantablack|white|toggle]"
    exit 1
fi

# Hyprland + Hyprlock colors
ln -sf "$HYPR_THEMES/$THEME.conf" "$HOME/.config/hypr/colors.conf"

# Waybar CSS
ln -sf "$WAYBAR_THEMES/$THEME.css" "$HOME/.config/waybar/themes/current.css"

# Kitty — symlink must match the include name in kitty.conf
ln -sf "$KITTY_THEMES/$THEME.conf" "$HOME/.config/kitty/current-theme.conf"
kill -SIGUSR1 $(pgrep -x kitty) 2>/dev/null

# Rofi (kept as fallback)
ln -sf "$ROFI_COLORS/$THEME.rasi" "$HOME/.config/rofi/colors/current.rasi"

# Walker
WALKER_CFG="$HOME/.config/walker/config.toml"
if [[ -f "$WALKER_CFG" ]]; then
    sed -i "s/^theme = .*/theme = \"$THEME\"/" "$WALKER_CFG"
fi

# Tmux
ln -sf "$TMUX_THEMES/$THEME.conf" "$HOME/.config/tmux/current-theme.conf"
tmux source-file ~/.tmux.conf 2>/dev/null

# Wallpaper via wpaperd — update config and restart daemon
WALLPAPER=$(ls "$BG_DIR/$THEME/"*.{png,jpg,jpeg} 2>/dev/null | shuf -n 1)
if [[ -n "$WALLPAPER" ]]; then
    printf '[default]\npath = "%s"\nduration = "30m"\nmode = "stretch"\nsorting = "random"\n' \
        "$BG_DIR/$THEME" > "$HOME/.config/wpaperd/wallpaper.toml"
    pkill wpaperd 2>/dev/null
    sleep 0.3
    rm -f "$HOME/.local/state/wpaperd/wallpapers/"* 2>/dev/null
    wpaperd -d
fi

# Reload Hyprland (picks up colors.conf)
hyprctl reload

# Reload Waybar
sleep 0.3
if ! pkill -SIGUSR2 waybar 2>/dev/null; then
    pkill waybar 2>/dev/null
    sleep 0.2
    waybar &
fi

# Persist current theme
echo "$THEME" > "$CURRENT_FILE"

notify-send "Theme" "Switched to: $THEME" --icon=preferences-desktop-theme -t 2000
