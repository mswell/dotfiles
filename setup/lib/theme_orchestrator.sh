#!/usr/bin/env bash
# Shared theme orchestration for install-time defaults and runtime switching.
# This file intentionally separates pure planning helpers from host-mutating apply steps.

# shellcheck shell=bash

THEME_NAMES=(wellpunk-dark wellpunk-light tokyonight)
THEME_DEFAULT="wellpunk-dark"

_theme_home() {
    printf '%s\n' "${THEME_HOME:-$HOME}"
}

theme_supported_names() {
    printf '%s\n' "${THEME_NAMES[@]}"
}

theme_is_supported() {
    local candidate="${1:-}"
    local theme
    for theme in "${THEME_NAMES[@]}"; do
        [[ "$theme" == "$candidate" ]] && return 0
    done
    return 1
}

theme_usage() {
    printf 'Usage: theme-switch.sh [%s|next|toggle]\n' "$(IFS='|'; echo "${THEME_NAMES[*]}")"
}

theme_current_file() {
    printf '%s/.config/hypr/current-theme\n' "$(_theme_home)"
}

theme_current() {
    local current_file
    current_file="$(theme_current_file)"
    if [[ -s "$current_file" ]]; then
        read -r current < "$current_file"
        if theme_is_supported "$current"; then
            printf '%s\n' "$current"
            return 0
        fi
    fi
    printf '%s\n' "$THEME_DEFAULT"
}

theme_resolve() {
    local requested="${1:-}"
    local current idx theme

    case "$requested" in
        next|toggle)
            current="$(theme_current)"
            for idx in "${!THEME_NAMES[@]}"; do
                if [[ "${THEME_NAMES[$idx]}" == "$current" ]]; then
                    printf '%s\n' "${THEME_NAMES[$(( (idx + 1) % ${#THEME_NAMES[@]} ))]}"
                    return 0
                fi
            done
            printf '%s\n' "$THEME_DEFAULT"
            ;;
        *)
            if theme_is_supported "$requested"; then
                printf '%s\n' "$requested"
            else
                theme_usage >&2
                return 1
            fi
            ;;
    esac
}

theme_gtk_values() {
    local theme="$1"
    if [[ "$theme" == "wellpunk-light" ]]; then
        printf '%s|%s|%s|%s|%s\n' "Adwaita" "0" "prefer-light" "Papirus-Light" "Bibata-Modern-Ice"
    else
        printf '%s|%s|%s|%s|%s\n' "Adwaita-dark" "1" "prefer-dark" "Papirus-Dark" "Bibata-Modern-Classic"
    fi
}

theme_mako_values() {
    local theme="$1"
    case "$theme" in
        wellpunk-light) printf '%s|%s|%s\n' "#000000" "#4f46e5" "#ffffff" ;;
        tokyonight) printf '%s|%s|%s\n' "#c0caf5" "#7aa2f7" "#1a1b26" ;;
        *) printf '%s|%s|%s\n' "#ffffff" "#6366f1" "#000000" ;;
    esac
}

# Emit a host-independent plan. Tests consume this instead of touching a real desktop.
theme_plan() {
    local theme="$1"
    local home
    home="$(_theme_home)"
    theme_is_supported "$theme" || return 1

    cat <<PLAN
persist|$home/.config/hypr/current-theme|$theme
symlink|$home/.config/hypr/themes/$theme.conf|$home/.config/hypr/colors.conf
symlink|$home/.config/waybar/themes/$theme.css|$home/.config/waybar/themes/current.css
symlink|$home/.config/kitty/themes/$theme.conf|$home/.config/kitty/current-theme.conf
symlink|$home/.config/rofi/colors/$theme.rasi|$home/.config/rofi/colors/current.rasi
symlink|$home/.config/tmux/themes/$theme.conf|$home/.config/tmux/current-theme.conf
symlink|$home/.config/fzf/themes/$theme.sh|$home/.config/fzf/current-theme.sh
symlink|$home/.config/tofi/themes/$theme.conf|$home/.config/tofi/current-configV
symlink|$home/.config/zsh/themes/$theme.zsh|$home/.config/zsh/current-theme.zsh
symlink|$home/.config/Kvantum/themes/$theme.kvconfig|$home/.config/Kvantum/kvantum.kvconfig
symlink|$home/.config/bat/themes/$theme.conf|$home/.config/bat/config
symlink|$home/.config/git/themes/$theme.gitconfig|$home/.config/git/current-theme.gitconfig
write|$home/.config/gtk-3.0/settings.ini|gtk3-settings
write|$home/.config/gtk-4.0/settings.ini|gtk4-settings
write|$home/.gtkrc-2.0|gtk2-settings
write|$home/.icons/default/index.theme|cursor-index
reload|hyprctl reload
reload|waybar SIGUSR2-or-restart
reload|kitty SIGUSR1
reload|tmux source-file
reload|zsh SIGUSR1
reload|mako reload
reload|pi hypr-theme-sync extension
PLAN
}

_theme_ln_sf() {
    local source="$1" destination="$2"
    mkdir -p "$(dirname "$destination")"
    ln -sf "$source" "$destination"
}

theme_apply() {
    local requested="${1:-}"
    local theme home hypr_themes waybar_themes kitty_themes rofi_colors tmux_themes fzf_themes zsh_themes kvantum_themes bat_themes git_themes current_file bg_dir
    local walker_cfg current_fzf new_fzf_opts gtk_values gtk_theme_name gtk_dark gtk_color_scheme gtk_icons gtk_cursor mako_values mako_text mako_border mako_bg pi_settings pi_theme tmp

    theme="$(theme_resolve "$requested")" || return 1
    home="$(_theme_home)"

    if [[ "${THEME_DRY_RUN:-0}" == "1" || "${DOTFILES_DRY_RUN:-0}" == "1" ]]; then
        theme_plan "$theme"
        return 0
    fi

    hypr_themes="$home/.config/hypr/themes"
    waybar_themes="$home/.config/waybar/themes"
    kitty_themes="$home/.config/kitty/themes"
    rofi_colors="$home/.config/rofi/colors"
    tmux_themes="$home/.config/tmux/themes"
    fzf_themes="$home/.config/fzf/themes"
    zsh_themes="$home/.config/zsh/themes"
    kvantum_themes="$home/.config/Kvantum/themes"
    bat_themes="$home/.config/bat/themes"
    git_themes="$home/.config/git/themes"
    current_file="$home/.config/hypr/current-theme"
    bg_dir="$home/.config/backgrounds"

    _theme_ln_sf "$hypr_themes/$theme.conf" "$home/.config/hypr/colors.conf"
    _theme_ln_sf "$waybar_themes/$theme.css" "$home/.config/waybar/themes/current.css"
    _theme_ln_sf "$kitty_themes/$theme.conf" "$home/.config/kitty/current-theme.conf"
    pkill -SIGUSR1 -x kitty 2>/dev/null || true

    if [[ -d "$rofi_colors" ]]; then
        _theme_ln_sf "$rofi_colors/$theme.rasi" "$home/.config/rofi/colors/current.rasi"
    fi

    walker_cfg="$home/.config/walker/config.toml"
    if [[ -f "$walker_cfg" ]]; then
        sed -i "s/^theme = .*/theme = \"$theme\"/" "$walker_cfg"
        pkill -x walker 2>/dev/null || true
        sleep 0.2
        if command -v walker >/dev/null 2>&1; then
            walker --gapplication-service &
            disown $! 2>/dev/null || true
        fi
    fi

    _theme_ln_sf "$tmux_themes/$theme.conf" "$home/.config/tmux/current-theme.conf"
    command -v tmux >/dev/null 2>&1 && tmux source-file "$home/.tmux.conf" 2>/dev/null || true

    _theme_ln_sf "$home/.config/tofi/themes/$theme.conf" "$home/.config/tofi/current-configV"

    _theme_ln_sf "$fzf_themes/$theme.sh" "$home/.config/fzf/current-theme.sh"
    if command -v tmux >/dev/null 2>&1 && tmux info >/dev/null 2>&1; then
        current_fzf=$(tmux show-environment FZF_DEFAULT_OPTS 2>/dev/null | sed 's/^FZF_DEFAULT_OPTS=//' || echo "")
        new_fzf_opts=$(env -i bash -c "export FZF_DEFAULT_OPTS='$current_fzf'; source '$home/.config/fzf/current-theme.sh' && echo \"\$FZF_DEFAULT_OPTS\"" 2>/dev/null || true)
        [[ -n "$new_fzf_opts" ]] && tmux set-environment -g FZF_DEFAULT_OPTS "$new_fzf_opts"
    fi
    pkill -SIGUSR1 -x zsh 2>/dev/null || true

    _theme_ln_sf "$zsh_themes/$theme.zsh" "$home/.config/zsh/current-theme.zsh"

    [[ -d "$kvantum_themes" ]] && _theme_ln_sf "$kvantum_themes/$theme.kvconfig" "$home/.config/Kvantum/kvantum.kvconfig"
    [[ -d "$bat_themes" ]] && _theme_ln_sf "$bat_themes/$theme.conf" "$home/.config/bat/config"
    [[ -d "$git_themes" ]] && _theme_ln_sf "$git_themes/$theme.gitconfig" "$home/.config/git/current-theme.gitconfig"

    if [[ -d "$bg_dir/$theme" && -x "$home/.config/hypr/scripts/wpaperd-set.sh" ]]; then
        "$home/.config/hypr/scripts/wpaperd-set.sh" "$bg_dir/$theme" || true
    fi

    command -v hyprctl >/dev/null 2>&1 && hyprctl reload || true
    sleep 0.3
    if ! pkill -SIGUSR2 -x waybar 2>/dev/null; then
        pkill -x waybar 2>/dev/null || true
        sleep 0.2
        if command -v waybar >/dev/null 2>&1; then
            waybar &
            disown $! 2>/dev/null || true
        fi
    fi

    IFS='|' read -r gtk_theme_name gtk_dark gtk_color_scheme gtk_icons gtk_cursor <<< "$(theme_gtk_values "$theme")"

    mkdir -p "$home/.config/gtk-3.0"
    cat > "$home/.config/gtk-3.0/settings.ini" <<EOF
[Settings]
gtk-theme-name=$gtk_theme_name
gtk-icon-theme-name=$gtk_icons
gtk-cursor-theme-name=$gtk_cursor
gtk-cursor-theme-size=24
gtk-font-name=Adwaita Sans 11
gtk-application-prefer-dark-theme=$gtk_dark
EOF

    mkdir -p "$home/.config/gtk-4.0"
    cat > "$home/.config/gtk-4.0/settings.ini" <<EOF
[Settings]
gtk-application-prefer-dark-theme=$gtk_dark
gtk-icon-theme-name=$gtk_icons
gtk-cursor-theme-name=$gtk_cursor
gtk-cursor-theme-size=24
EOF

    cat > "$home/.gtkrc-2.0" <<EOF
# Managed by theme_orchestrator.sh
gtk-theme-name="$gtk_theme_name"
gtk-icon-theme-name="$gtk_icons"
gtk-font-name="Adwaita Sans 11"
gtk-cursor-theme-name="$gtk_cursor"
gtk-cursor-theme-size=24
gtk-toolbar-style=GTK_TOOLBAR_ICONS
gtk-toolbar-icon-size=GTK_ICON_SIZE_LARGE_TOOLBAR
gtk-button-images=0
gtk-menu-images=0
gtk-enable-event-sounds=1
gtk-enable-input-feedback-sounds=0
gtk-xft-antialias=1
gtk-xft-hinting=1
gtk-xft-hintstyle="hintslight"
gtk-xft-rgba="rgb"
EOF

    mkdir -p "$home/.icons/default"
    cat > "$home/.icons/default/index.theme" <<EOF
[Icon Theme]
Inherits=$gtk_cursor
EOF

    if command -v gsettings >/dev/null 2>&1; then
        gsettings set org.gnome.desktop.interface color-scheme "$gtk_color_scheme" || true
        gsettings set org.gnome.desktop.interface gtk-theme "$gtk_theme_name" || true
        gsettings set org.gnome.desktop.interface icon-theme "$gtk_icons" || true
        gsettings set org.gnome.desktop.interface cursor-theme "$gtk_cursor" || true
        gsettings set org.gnome.desktop.interface cursor-size 24 || true
    fi
    command -v hyprctl >/dev/null 2>&1 && hyprctl setcursor "$gtk_cursor" 24 || true
    command -v nautilus >/dev/null 2>&1 && nautilus -q 2>/dev/null || true

    if command -v mako >/dev/null 2>&1; then
        local mako_cfg="$home/.config/mako/config"
        if [[ -f "$mako_cfg" ]]; then
            IFS='|' read -r mako_text mako_border mako_bg <<< "$(theme_mako_values "$theme")"
            sed -i "s/^text-color=.*/text-color=$mako_text/" "$mako_cfg"
            sed -i "s/^border-color=.*/border-color=$mako_border/" "$mako_cfg"
            sed -i "s/^background-color=.*/background-color=$mako_bg/" "$mako_cfg"
            command -v makoctl >/dev/null 2>&1 && makoctl reload 2>/dev/null || true
        fi
    fi

    pi_settings="$home/.pi/agent/settings.json"
    if [[ -f "$pi_settings" ]]; then
        if [[ -f "$home/.pi/agent/themes/$theme.json" ]]; then
            pi_theme="$theme"
        else
            pi_theme=$([[ "$theme" == "wellpunk-light" ]] && echo "light" || echo "dark")
        fi
        if command -v jq >/dev/null 2>&1; then
            tmp=$(mktemp)
            jq --arg t "$pi_theme" '.theme = $t' "$pi_settings" > "$tmp" && mv "$tmp" "$pi_settings"
        else
            sed -i "s/\"theme\": \"[^\"]*\"/\"theme\": \"$pi_theme\"/" "$pi_settings"
        fi
    fi

    mkdir -p "$(dirname "$current_file")"
    printf '%s\n' "$theme" > "$current_file"

    command -v notify-send >/dev/null 2>&1 && notify-send "Theme" "Switched to: $theme" --icon=preferences-desktop-theme -t 2000 || true
}
