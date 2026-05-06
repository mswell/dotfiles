#!/usr/bin/env bash
# theme-switch.sh — Cycle or set desktop theme
# Usage: theme-switch.sh [vantablack|white|tokyonight|next]

HYPR_THEMES="$HOME/.config/hypr/themes"
WAYBAR_THEMES="$HOME/.config/waybar/themes"
KITTY_THEMES="$HOME/.config/kitty/themes"
ROFI_COLORS="$HOME/.config/rofi/colors"
TMUX_THEMES="$HOME/.config/tmux/themes"
FZF_THEMES="$HOME/.config/fzf/themes"
ZSH_THEMES="$HOME/.config/zsh/themes"
CURRENT_FILE="$HOME/.config/hypr/current-theme"
BG_DIR="$HOME/.config/backgrounds"

THEMES=(vantablack white tokyonight)

# Determine target theme
if [[ "$1" == "next" || "$1" == "toggle" ]]; then
    current=$(cat "$CURRENT_FILE" 2>/dev/null || echo "vantablack")
    for i in "${!THEMES[@]}"; do
        if [[ "${THEMES[$i]}" == "$current" ]]; then
            THEME="${THEMES[$(( (i + 1) % ${#THEMES[@]} ))]}"
            break
        fi
    done
    THEME="${THEME:-vantablack}"
elif [[ "$1" == "vantablack" || "$1" == "white" || "$1" == "tokyonight" ]]; then
    THEME="$1"
else
    echo "Usage: theme-switch.sh [vantablack|white|tokyonight|next]"
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

# Walker — update theme and restart service so it reloads config
WALKER_CFG="$HOME/.config/walker/config.toml"
if [[ -f "$WALKER_CFG" ]]; then
    sed -i "s/^theme = .*/theme = \"$THEME\"/" "$WALKER_CFG"
    pkill -x walker 2>/dev/null
    sleep 0.2
    walker --gapplication-service &
fi

# Tmux
ln -sf "$TMUX_THEMES/$THEME.conf" "$HOME/.config/tmux/current-theme.conf"
tmux source-file ~/.tmux.conf 2>/dev/null

# fzf — new shells will pick up the theme via .zshrc sourcing current-theme.sh
mkdir -p "$HOME/.config/fzf"
ln -sf "$FZF_THEMES/$THEME.sh" "$HOME/.config/fzf/current-theme.sh"

# ZSH — p10k + autosuggestions colors (new shells pick up via .zshrc)
mkdir -p "$HOME/.config/zsh/themes"
ln -sf "$ZSH_THEMES/$THEME.zsh" "$HOME/.config/zsh/current-theme.zsh"

# Wallpaper via wpaperd — set theme folder, no auto-rotation (cycle manually with wpaperctl next)
if [[ -d "$BG_DIR/$THEME" ]]; then
    printf '[default]\npath = "%s"\nmode = "stretch"\n' \
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

# GTK + icon + cursor theme sync
# gsettings → propagates to running GTK4/libadwaita apps via xdg-desktop-portal-gtk
# settings.ini → applies at launch for GTK3 apps without a settings daemon
if [[ "$THEME" == "white" ]]; then
    GTK_THEME_NAME="Adwaita"
    GTK_DARK="0"
    GTK_COLOR_SCHEME="prefer-light"
    GTK_ICONS="Papirus-Light"
    GTK_CURSOR="Bibata-Modern-Ice"
else
    GTK_THEME_NAME="Gruvbox-Material-Dark"
    GTK_DARK="1"
    GTK_COLOR_SCHEME="prefer-dark"
    GTK_ICONS="Papirus-Dark"
    GTK_CURSOR="Bibata-Modern-Classic-Gruvbox"
fi

# Write GTK3 settings.ini (read at app launch; no daemon needed)
mkdir -p "$HOME/.config/gtk-3.0"
cat > "$HOME/.config/gtk-3.0/settings.ini" <<EOF
[Settings]
gtk-theme-name=$GTK_THEME_NAME
gtk-icon-theme-name=$GTK_ICONS
gtk-cursor-theme-name=$GTK_CURSOR
gtk-cursor-theme-size=24
gtk-font-name=Adwaita Sans 11
gtk-application-prefer-dark-theme=$GTK_DARK
EOF

# Write GTK4 settings.ini (libadwaita dark/light toggle)
mkdir -p "$HOME/.config/gtk-4.0"
cat > "$HOME/.config/gtk-4.0/settings.ini" <<EOF
[Settings]
gtk-application-prefer-dark-theme=$GTK_DARK
gtk-icon-theme-name=$GTK_ICONS
gtk-cursor-theme-name=$GTK_CURSOR
gtk-cursor-theme-size=24
EOF

# Notify running GTK apps via dconf/xdg-desktop-portal-gtk
gsettings set org.gnome.desktop.interface color-scheme   "$GTK_COLOR_SCHEME"
gsettings set org.gnome.desktop.interface gtk-theme      "$GTK_THEME_NAME"
gsettings set org.gnome.desktop.interface icon-theme     "$GTK_ICONS"
gsettings set org.gnome.desktop.interface cursor-theme   "$GTK_CURSOR"
gsettings set org.gnome.desktop.interface cursor-size    24

# Apply cursor live in Hyprland (compositor + all new X/Wayland clients)
hyprctl setcursor "$GTK_CURSOR" 24

# Quit Nautilus completely (including daemon) so it reloads icon theme on next open
nautilus -q 2>/dev/null

# Mako — update colors and reload (Omarchy pattern: text/border/background from theme)
if command -v mako &>/dev/null; then
    MAKO_CFG="$HOME/.config/mako/config"
    if [[ "$THEME" == "white" ]]; then
        MAKO_TEXT="#000000"; MAKO_BORDER="#6e6e6e"; MAKO_BG="#ffffff"
    elif [[ "$THEME" == "tokyonight" ]]; then
        MAKO_TEXT="#c0caf5"; MAKO_BORDER="#7aa2f7"; MAKO_BG="#1a1b26"
    else
        MAKO_TEXT="#ffffff"; MAKO_BORDER="#8d8d8d"; MAKO_BG="#000000"
    fi
    sed -i "s/^text-color=.*/text-color=$MAKO_TEXT/" "$MAKO_CFG"
    sed -i "s/^border-color=.*/border-color=$MAKO_BORDER/" "$MAKO_CFG"
    sed -i "s/^background-color=.*/background-color=$MAKO_BG/" "$MAKO_CFG"
    makoctl reload 2>/dev/null
fi

# Pi coding agent — use named theme if installed, fallback to dark/light
PI_SETTINGS="$HOME/.pi/agent/settings.json"
if [[ -f "$PI_SETTINGS" ]]; then
    if [[ -f "$HOME/.pi/agent/themes/$THEME.json" ]]; then
        PI_THEME="$THEME"
    else
        PI_THEME=$([[ "$THEME" == "white" ]] && echo "light" || echo "dark")
    fi
    if command -v jq &>/dev/null; then
        tmp=$(mktemp)
        jq --arg t "$PI_THEME" '.theme = $t' "$PI_SETTINGS" > "$tmp" && mv "$tmp" "$PI_SETTINGS"
    else
        sed -i "s/\"theme\": \"[^\"]*\"/\"theme\": \"$PI_THEME\"/" "$PI_SETTINGS"
    fi
fi

# Persist current theme
echo "$THEME" > "$CURRENT_FILE"

notify-send "Theme" "Switched to: $THEME" --icon=preferences-desktop-theme -t 2000
