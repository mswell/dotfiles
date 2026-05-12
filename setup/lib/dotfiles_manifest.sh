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
copy_file|$root/config/zsh/.zshrc|$HOME/.zshrc
copy_file|$root/config/zsh/env.zsh|$config_dir/zsh/env.zsh
copy_file|$root/config/zsh/custom.zsh|$config_dir/zsh/custom.zsh
copy_file|$root/config/zsh/alias.zsh|$config_dir/zsh/alias.zsh
copy_file|$root/config/zsh/functions.zsh|$config_dir/zsh/functions.zsh
copy_file|$root/config/zsh/runtime.zsh|$config_dir/zsh/runtime.zsh
copy_dir|$root/config/zsh/functions|$config_dir/zsh/functions
copy_dir|$root/config/zsh/themes|$config_dir/zsh/themes
copy_file|$root/config/zsh/.zprofile|$HOME/.zprofile
copy_file|$root/config/zsh/.p10k.zsh|$HOME/.p10k.zsh
copy_file|$root/config/git/.gitconfig|$HOME/.gitconfig
copy_file|$root/config/git/.catppuccin.gitconfig|$HOME/.catppuccin.gitconfig
dir||$config_dir/git/themes
copy_dir|$root/config/git/themes|$config_dir/git/themes
symlink|$config_dir/git/themes/vantablack.gitconfig|$config_dir/git/current-theme.gitconfig
dir||$config_dir/git/hooks
copy_file|$root/config/git/hooks/pre-commit|$config_dir/git/hooks/pre-commit
chmod_exec||$config_dir/git/hooks/pre-commit
dir||$config_dir/bat/themes
copy_dir|$root/config/bat/themes|$config_dir/bat/themes
symlink|$config_dir/bat/themes/vantablack.conf|$config_dir/bat/config
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
            *)
                _dotfiles_log "[WARN] Unknown manifest action: $action"
                ;;
        esac
    done < <(dotfiles_manifest_entries)
}
