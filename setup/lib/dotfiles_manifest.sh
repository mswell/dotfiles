#!/usr/bin/env bash
# Dotfiles installation manifest: a single auditable source of copy/symlink/chmod rules.

# shellcheck shell=bash

_dotfiles_root() {
    printf '%s\n' "${DOTFILES:-${DOTFILES_PATH:-$HOME/Projects/dotfiles}}"
}

_dotfiles_config_dir() {
    printf '%s\n' "${CONFIG_DIR:-$HOME/.config}"
}

# Format: action|source|destination
# action is one of dir, copy_file, copy_dir, symlink, chmod_exec.
dotfiles_manifest_entries() {
    local root config_dir
    root="$(_dotfiles_root)"
    config_dir="$(_dotfiles_config_dir)"

    cat <<EOF
dir||$config_dir/zsh
shim|$root/config/zsh/.zshrc|$HOME/.zshrc
copy_file|$root/config/zsh/env.zsh|$config_dir/zsh/env.zsh
copy_file|$root/config/zsh/custom.zsh|$config_dir/zsh/custom.zsh
copy_file|$root/config/zsh/alias.zsh|$config_dir/zsh/alias.zsh
copy_file|$root/config/zsh/functions.zsh|$config_dir/zsh/functions.zsh
copy_file|$root/config/zsh/runtime.zsh|$config_dir/zsh/runtime.zsh
copy_dir|$root/config/zsh/functions|$config_dir/zsh/functions
copy_dir|$root/config/zsh/themes|$config_dir/zsh/themes
copy_file|$root/config/zsh/.zprofile|$HOME/.zprofile
copy_file|$root/config/zsh/.p10k.zsh|$HOME/.p10k.zsh
shim_git|$root/config/git/.gitconfig|$HOME/.gitconfig
copy_file|$root/config/git/.catppuccin.gitconfig|$HOME/.catppuccin.gitconfig
dir||$config_dir/git/themes
copy_dir|$root/config/git/themes|$config_dir/git/themes
symlink|$config_dir/git/themes/wellpunk-dark.gitconfig|$config_dir/git/current-theme.gitconfig
dir||$config_dir/git/hooks
copy_file|$root/config/git/hooks/pre-commit|$config_dir/git/hooks/pre-commit
chmod_exec||$config_dir/git/hooks/pre-commit
dir||$config_dir/bat/themes
copy_dir|$root/config/bat/themes|$config_dir/bat/themes
symlink|$config_dir/bat/themes/wellpunk-dark.conf|$config_dir/bat/config
dir||$config_dir/nvim
copy_dir|$root/config/nvim|$config_dir/nvim
copy_file|$root/config/Ghostty/config|$config_dir/ghostty/config
copy_file|$root/config/wezterm/wezterm.lua|$config_dir/wezterm/wezterm.lua
copy_file|$root/config/waypaper/config.ini|$config_dir/waypaper/config.ini
copy_file|$root/config/mako/config|$config_dir/mako/config
copy_file|$root/config/flameshot/flameshot.ini|$config_dir/flameshot/flameshot.ini
copy_file|$root/config/swappy/config|$config_dir/swappy/config
dir||$HOME/.local/bin
copy_file|$root/config/tmux/.tmux.conf|$HOME/.tmux.conf
copy_file|$root/config/tmux/.tmux-cht-command|$HOME/.tmux-cht-command
copy_file|$root/config/tmux/.tmux-cht-languages|$HOME/.tmux-cht-languages
copy_file|$root/config/tmux/tmux-sessionizer|$HOME/.local/bin/tmux-sessionizer
copy_file|$root/config/tmux/tmux-cht.sh|$HOME/.local/bin/tmux-cht.sh
chmod_exec||$HOME/.local/bin/tmux-sessionizer
chmod_exec||$HOME/.local/bin/tmux-cht.sh
dir||$HOME/.pi/agent/themes
copy_dir|$root/config/pi/agent/themes|$HOME/.pi/agent/themes
copy_file|$root/config/hypr/hyprland.lua|$config_dir/hypr/hyprland.lua
copy_file|$root/config/hypr/hyprlock.conf|$config_dir/hypr/hyprlock.conf
copy_file|$root/config/hypr/hyprpaper.conf|$config_dir/hypr/hyprpaper.conf
copy_file|$root/config/hypr/hypridle.conf|$config_dir/hypr/hypridle.conf
copy_dir|$root/config/hypr/themes|$config_dir/hypr/themes
copy_dir|$root/config/hypr/scripts|$config_dir/hypr/scripts
copy_file|$root/setup/lib/theme_orchestrator.sh|$config_dir/hypr/scripts/lib/theme_orchestrator.sh
chmod_exec||$config_dir/hypr/scripts/theme-switch.sh
chmod_exec||$config_dir/hypr/scripts/wpaperd-set.sh
chmod_exec||$config_dir/hypr/scripts/bg-set.sh
chmod_exec||$config_dir/hypr/scripts/power-menu.sh
chmod_exec||$config_dir/hypr/scripts/screenshot-area.sh
chmod_exec||$config_dir/hypr/scripts/kill-confirm.sh
copy_dir|$root/config/kitty|$config_dir/kitty
copy_dir|$root/config/walker|$config_dir/walker
copy_dir|$root/config/waybar|$config_dir/waybar
copy_dir|$root/config/wpaperd|$config_dir/wpaperd
copy_dir|$root/config/rofi|$config_dir/rofi
copy_dir|$root/config/tofi|$config_dir/tofi
copy_dir|$root/config/Kvantum|$config_dir/Kvantum
copy_file|$root/config/xdg-desktop-portal/portals.conf|$config_dir/xdg-desktop-portal/portals.conf
dir||$config_dir/fzf/themes
copy_dir|$root/config/fzf/themes|$config_dir/fzf/themes
dir||$config_dir/tmux/themes
copy_dir|$root/config/tmux/themes|$config_dir/tmux/themes
dir||$config_dir/backgrounds
copy_dir|$root/config/hypr/backgrounds/wellpunk-dark|$config_dir/backgrounds/wellpunk-dark
copy_dir|$root/config/hypr/backgrounds/wellpunk-light|$config_dir/backgrounds/wellpunk-light
copy_dir|$root/config/hypr/backgrounds/tokyonight|$config_dir/backgrounds/tokyonight
copy_dir|$root/config/backgrounds|$HOME/Pictures/backgrounds
EOF
}

dotfiles_plan() {
    dotfiles_manifest_entries
}

_dotfiles_log() {
    printf '%s\n' "$*"
}

_dotfiles_copy_file() {
    local source="$1" destination="$2"
    if [[ ! -f "$source" ]]; then
        _dotfiles_log "[WARN] Missing source file: $source"
        return 0
    fi
    mkdir -p "$(dirname "$destination")"
    cp -f "$source" "$destination"
}

_dotfiles_copy_dir() {
    local source="$1" destination="$2"
    if [[ ! -d "$source" ]]; then
        _dotfiles_log "[WARN] Missing source directory: $source"
        return 0
    fi
    mkdir -p "$destination"
    cp -rf "$source/." "$destination/"
}

# Install a non-destructive shim at $destination that pulls in the curated config
# from $source. Idempotent: if the directive that references $source is already
# present, do nothing. If $destination is byte-identical to $source (legacy
# copy_file state), replace it with a pure shim. Otherwise prepend the shim and
# preserve any existing content below — this is the path that protects
# installer-appended lines (mise, fnm, atuin, fzf, gh auth setup-git, etc.).
#
# $syntax decides the include directive and comment style:
#   shell → `source "<path>"` with `#` comments (shell rc files)
#   git   → `[include] path = <path>` with `#` comments (gitconfig)
_dotfiles_ensure_shim() {
    local source="$1" destination="$2" syntax="${3:-shell}"
    local directive=""

    case "$syntax" in
        shell) directive='source "'"$source"'"' ;;
        git)   directive="$(printf '[include]\n    path = %s' "$source")" ;;
        *)
            _dotfiles_log "[WARN] Unknown shim syntax: $syntax"
            return 0
            ;;
    esac

    if [[ ! -f "$source" ]]; then
        _dotfiles_log "[WARN] Missing shim source: $source"
        return 0
    fi

    # Use the source path itself as the idempotency marker — it's stable across
    # both `source "..."` and `path = ...` forms.
    if [[ -f "$destination" ]] && grep -qF "$source" "$destination"; then
        _dotfiles_log "[=] Shim already in place: $destination"
        return 0
    fi

    mkdir -p "$(dirname "$destination")"

    local existing=""
    if [[ -f "$destination" ]] && ! cmp -s "$source" "$destination"; then
        existing="$(cat "$destination")"
    fi

    {
        echo "# Managed by dotfiles — pulls the curated config from the repo."
        echo "# Anything you add below this block stays on this machine and survives sync."
        echo "# That includes lines auto-appended by installers (mise, fnm, atuin, fzf, gh, etc.)."
        printf '%s\n' "$directive"
        if [[ -n "$existing" ]]; then
            echo ""
            echo "# === Local additions below (preserved across sync) ==="
            printf '%s\n' "$existing"
        fi
    } > "$destination"

    _dotfiles_log "[+] Shim installed ($syntax): $destination → $source"
}

dotfiles_apply_manifest() {
    local action source destination

    if [[ "${DOTFILES_DRY_RUN:-0}" == "1" ]]; then
        dotfiles_plan
        return 0
    fi

    while IFS='|' read -r action source destination; do
        [[ -z "$action" ]] && continue
        case "$action" in
            dir)
                _dotfiles_log "[+] Creating directory $destination"
                mkdir -p "$destination"
                ;;
            copy_file)
                _dotfiles_log "[+] Copying $source => $destination"
                _dotfiles_copy_file "$source" "$destination"
                ;;
            copy_dir)
                _dotfiles_log "[+] Copying directory $source => $destination"
                _dotfiles_copy_dir "$source" "$destination"
                ;;
            shim)
                _dotfiles_ensure_shim "$source" "$destination" shell
                ;;
            shim_git)
                _dotfiles_ensure_shim "$source" "$destination" git
                ;;
            symlink)
                _dotfiles_log "[+] Linking $source => $destination"
                mkdir -p "$(dirname "$destination")"
                ln -sfn "$source" "$destination"
                ;;
            chmod_exec)
                if [[ -e "$destination" ]]; then
                    _dotfiles_log "[+] Marking executable $destination"
                    chmod +x "$destination"
                fi
                ;;
            remove)
                if [[ -e "$destination" ]]; then
                    _dotfiles_log "[+] Removing legacy $destination"
                    rm -f "$destination"
                fi
                ;;
            *)
                _dotfiles_log "[WARN] Unknown manifest action: $action"
                ;;
        esac
    done < <(dotfiles_manifest_entries)
}
