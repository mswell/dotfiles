#!/usr/bin/env bash
# Dotfiles installation manifest: a single auditable source of copy/symlink/chmod rules.

# shellcheck shell=bash

_dotfiles_root() {
    printf '%s\n' "${DOTFILES:-${DOTFILES_PATH:-$HOME/Projects/dotfiles}}"
}

_dotfiles_config_dir() {
    printf '%s\n' "${CONFIG_DIR:-$HOME/.config}"
}

_dotfiles_manifest_platform() {
    uname -s
}

_dotfiles_manifest_rule() {
    printf '%s\t%s\t%s\n' "$1" "$2" "$3"
}

_dotfiles_manifest_rules() {
    local root config_dir platform
    root="$(_dotfiles_root)"
    config_dir="$(_dotfiles_config_dir)"
    platform="$(_dotfiles_manifest_platform)"

    # Cross-platform entries (Linux + macOS)
    _dotfiles_manifest_rule dir "" "$config_dir/zsh"
    _dotfiles_manifest_rule shim "$root/config/zsh/.zshrc" "$HOME/.zshrc"
    _dotfiles_manifest_rule copy_file "$root/config/zsh/env.zsh" "$config_dir/zsh/env.zsh"
    _dotfiles_manifest_rule copy_file "$root/config/zsh/custom.zsh" "$config_dir/zsh/custom.zsh"
    _dotfiles_manifest_rule copy_file "$root/config/zsh/alias.zsh" "$config_dir/zsh/alias.zsh"
    _dotfiles_manifest_rule copy_file "$root/config/zsh/functions.zsh" "$config_dir/zsh/functions.zsh"
    _dotfiles_manifest_rule copy_file "$root/config/zsh/runtime.zsh" "$config_dir/zsh/runtime.zsh"
    _dotfiles_manifest_rule copy_dir "$root/config/zsh/functions" "$config_dir/zsh/functions"
    _dotfiles_manifest_rule copy_dir "$root/config/zsh/themes" "$config_dir/zsh/themes"
    _dotfiles_manifest_rule copy_file "$root/config/zsh/.zprofile" "$HOME/.zprofile"
    _dotfiles_manifest_rule copy_file "$root/config/zsh/.p10k.zsh" "$HOME/.p10k.zsh"
    _dotfiles_manifest_rule shim_git "$root/config/git/.gitconfig" "$HOME/.gitconfig"
    _dotfiles_manifest_rule copy_file "$root/config/git/.catppuccin.gitconfig" "$HOME/.catppuccin.gitconfig"
    _dotfiles_manifest_rule dir "" "$config_dir/git/themes"
    _dotfiles_manifest_rule copy_dir "$root/config/git/themes" "$config_dir/git/themes"
    _dotfiles_manifest_rule symlink "$config_dir/git/themes/wellpunk-dark.gitconfig" "$config_dir/git/current-theme.gitconfig"
    _dotfiles_manifest_rule dir "" "$config_dir/git/hooks"
    _dotfiles_manifest_rule copy_file "$root/config/git/hooks/pre-commit" "$config_dir/git/hooks/pre-commit"
    _dotfiles_manifest_rule chmod_exec "" "$config_dir/git/hooks/pre-commit"
    _dotfiles_manifest_rule dir "" "$config_dir/bat/themes"
    _dotfiles_manifest_rule copy_dir "$root/config/bat/themes" "$config_dir/bat/themes"
    _dotfiles_manifest_rule symlink "$config_dir/bat/themes/wellpunk-dark.conf" "$config_dir/bat/config"
    _dotfiles_manifest_rule git_repo "https://github.com/mswell/nvim.git" "$config_dir/nvim"
    _dotfiles_manifest_rule copy_file "$root/config/Ghostty/config" "$config_dir/ghostty/config"
    _dotfiles_manifest_rule dir "" "$config_dir/ghostty/themes"
    _dotfiles_manifest_rule copy_dir "$root/config/Ghostty/themes" "$config_dir/ghostty/themes"
    _dotfiles_manifest_rule copy_file "$root/config/wezterm/wezterm.lua" "$config_dir/wezterm/wezterm.lua"
    _dotfiles_manifest_rule copy_dir "$root/config/kitty" "$config_dir/kitty"
    _dotfiles_manifest_rule dir "" "$HOME/.local/bin"
    _dotfiles_manifest_rule copy_file "$root/config/tmux/.tmux.conf" "$HOME/.tmux.conf"
    _dotfiles_manifest_rule copy_file "$root/config/tmux/.tmux-cht-command" "$HOME/.tmux-cht-command"
    _dotfiles_manifest_rule copy_file "$root/config/tmux/.tmux-cht-languages" "$HOME/.tmux-cht-languages"
    _dotfiles_manifest_rule copy_file "$root/config/tmux/tmux-sessionizer" "$HOME/.local/bin/tmux-sessionizer"
    _dotfiles_manifest_rule copy_file "$root/config/tmux/tmux-cht.sh" "$HOME/.local/bin/tmux-cht.sh"
    _dotfiles_manifest_rule chmod_exec "" "$HOME/.local/bin/tmux-sessionizer"
    _dotfiles_manifest_rule chmod_exec "" "$HOME/.local/bin/tmux-cht.sh"
    _dotfiles_manifest_rule dir "" "$HOME/.pi/agent/themes"
    _dotfiles_manifest_rule copy_dir "$root/config/pi/agent/themes" "$HOME/.pi/agent/themes"
    _dotfiles_manifest_rule dir "" "$config_dir/fzf/themes"
    _dotfiles_manifest_rule copy_dir "$root/config/fzf/themes" "$config_dir/fzf/themes"
    _dotfiles_manifest_rule dir "" "$config_dir/tmux/themes"
    _dotfiles_manifest_rule copy_dir "$root/config/tmux/themes" "$config_dir/tmux/themes"
    _dotfiles_manifest_rule copy_dir "$root/config/backgrounds" "$HOME/Pictures/backgrounds"

    if [[ "$platform" == "Darwin" ]]; then
        local macos_ghostty="$HOME/Library/Application Support/com.mitchellh.ghostty"
        _dotfiles_manifest_rule copy_file "$root/config/Ghostty/config" "$macos_ghostty/config"
        _dotfiles_manifest_rule dir "" "$macos_ghostty/themes"
        _dotfiles_manifest_rule copy_dir "$root/config/Ghostty/themes" "$macos_ghostty/themes"
    fi

    if [[ "$platform" == "Linux" ]]; then
        _dotfiles_manifest_rule copy_file "$root/config/waypaper/config.ini" "$config_dir/waypaper/config.ini"
        _dotfiles_manifest_rule copy_file "$root/config/mako/config" "$config_dir/mako/config"
        _dotfiles_manifest_rule copy_file "$root/config/flameshot/flameshot.ini" "$config_dir/flameshot/flameshot.ini"
        _dotfiles_manifest_rule copy_file "$root/config/swappy/config" "$config_dir/swappy/config"
        _dotfiles_manifest_rule copy_file "$root/config/hypr/hyprland.lua" "$config_dir/hypr/hyprland.lua"
        _dotfiles_manifest_rule copy_file "$root/config/hypr/hyprlock.conf" "$config_dir/hypr/hyprlock.conf"
        _dotfiles_manifest_rule copy_file "$root/config/hypr/hyprpaper.conf" "$config_dir/hypr/hyprpaper.conf"
        _dotfiles_manifest_rule copy_file "$root/config/hypr/hypridle.conf" "$config_dir/hypr/hypridle.conf"
        _dotfiles_manifest_rule copy_dir "$root/config/hypr/themes" "$config_dir/hypr/themes"
        _dotfiles_manifest_rule copy_dir "$root/config/hypr/scripts" "$config_dir/hypr/scripts"
        _dotfiles_manifest_rule copy_file "$root/setup/lib/theme_orchestrator.sh" "$config_dir/hypr/scripts/lib/theme_orchestrator.sh"
        _dotfiles_manifest_rule chmod_exec "" "$config_dir/hypr/scripts/theme-switch.sh"
        _dotfiles_manifest_rule chmod_exec "" "$config_dir/hypr/scripts/wpaperd-set.sh"
        _dotfiles_manifest_rule chmod_exec "" "$config_dir/hypr/scripts/bg-set.sh"
        _dotfiles_manifest_rule chmod_exec "" "$config_dir/hypr/scripts/power-menu.sh"
        _dotfiles_manifest_rule chmod_exec "" "$config_dir/hypr/scripts/screenshot-area.sh"
        _dotfiles_manifest_rule chmod_exec "" "$config_dir/hypr/scripts/kill-confirm.sh"
        _dotfiles_manifest_rule copy_dir "$root/config/walker" "$config_dir/walker"
        _dotfiles_manifest_rule copy_dir "$root/config/waybar" "$config_dir/waybar"
        _dotfiles_manifest_rule copy_dir "$root/config/wpaperd" "$config_dir/wpaperd"
        _dotfiles_manifest_rule copy_dir "$root/config/rofi" "$config_dir/rofi"
        _dotfiles_manifest_rule copy_dir "$root/config/tofi" "$config_dir/tofi"
        _dotfiles_manifest_rule copy_dir "$root/config/Kvantum" "$config_dir/Kvantum"
        _dotfiles_manifest_rule copy_file "$root/config/xdg-desktop-portal/portals.conf" "$config_dir/xdg-desktop-portal/portals.conf"
        _dotfiles_manifest_rule dir "" "$config_dir/backgrounds"
        _dotfiles_manifest_rule copy_dir "$root/config/hypr/backgrounds/wellpunk-dark" "$config_dir/backgrounds/wellpunk-dark"
        _dotfiles_manifest_rule copy_dir "$root/config/hypr/backgrounds/wellpunk-light" "$config_dir/backgrounds/wellpunk-light"
        _dotfiles_manifest_rule copy_dir "$root/config/hypr/backgrounds/tokyonight" "$config_dir/backgrounds/tokyonight"
    fi
}

dotfiles_manifest_visit() {
    local callback="$1"
    local action source destination

    while IFS=$'\t' read -r action source destination; do
        [[ -z "$action" ]] && continue
        "$callback" "$action" "$source" "$destination"
    done < <(_dotfiles_manifest_rules)
}

_dotfiles_manifest_render_rule() {
    printf '%s|%s|%s\n' "$1" "$2" "$3"
}

# Backward-compatible textual adapter for humans and existing callers.
dotfiles_plan() {
    dotfiles_manifest_visit _dotfiles_manifest_render_rule
}

# Backward-compatible textual adapter retained for existing callers.
dotfiles_manifest_entries() {
    dotfiles_plan
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

_dotfiles_git_repo() {
    local repo_url="$1" destination="$2"

    if ! command -v git >/dev/null 2>&1; then
        _dotfiles_log "[WARN] git not found; cannot install repository: $repo_url"
        return 0
    fi

    if [[ -d "$destination/.git" ]]; then
        local current_remote
        current_remote="$(git -C "$destination" remote get-url origin 2>/dev/null || true)"
        if [[ "$current_remote" != "$repo_url" && "$current_remote" != "${repo_url%.git}" ]]; then
            _dotfiles_log "[WARN] Existing git repo at $destination uses origin: $current_remote"
            _dotfiles_log "[WARN] Skipping clone of $repo_url"
            return 0
        fi

        if ! git -C "$destination" diff --quiet || ! git -C "$destination" diff --cached --quiet; then
            _dotfiles_log "[WARN] Local changes in $destination; skipping update"
            return 0
        fi

        _dotfiles_log "[+] Updating repository $repo_url => $destination"
        git -C "$destination" pull --ff-only
        return 0
    fi

    if [[ -d "$destination" ]]; then
        if [[ -z "$(find "$destination" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
            rmdir "$destination"
        else
            local backup="${destination}.backup.$(date +%Y%m%d%H%M%S)"
            _dotfiles_log "[+] Backing up existing $destination => $backup"
            mv "$destination" "$backup"
        fi
    fi

    mkdir -p "$(dirname "$destination")"
    _dotfiles_log "[+] Cloning $repo_url => $destination"
    git clone --depth 1 "$repo_url" "$destination"
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
        shell) directive='source '"'"$source"'"'' ;;
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

_dotfiles_manifest_apply_rule() {
    local action="$1" source="$2" destination="$3"

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
        git_repo)
            _dotfiles_git_repo "$source" "$destination"
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
}

dotfiles_apply_manifest() {
    if [[ "${DOTFILES_DRY_RUN:-0}" == "1" ]]; then
        dotfiles_plan
        return 0
    fi

    dotfiles_manifest_visit _dotfiles_manifest_apply_rule
}
