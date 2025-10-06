#!/bin/bash

# Shell utilities for dotfiles installation
# Provides functions to manage user shell configuration

set -euo pipefail

# Change user shell to zsh (non-interactive)
# Usage: change_shell_to_zsh
# Returns: 0 on success, 1 on failure
change_shell_to_zsh() {
    local zsh_path
    zsh_path=$(which zsh 2>/dev/null || echo "")

    if [ -z "$zsh_path" ]; then
        if type log_error &>/dev/null; then
            log_error "ZSH not found, please install it first"
        else
            echo "[ERROR] ZSH not found, please install it first" >&2
        fi
        return 1
    fi

    # Check if ZSH is in /etc/shells
    if ! grep -q "^${zsh_path}$" /etc/shells 2>/dev/null; then
        if type log_warn &>/dev/null; then
            log_warn "Adding $zsh_path to /etc/shells"
        fi
        echo "$zsh_path" | sudo tee -a /etc/shells >/dev/null
    fi

    # Check if already using zsh
    if [ "${SHELL:-}" = "$zsh_path" ]; then
        if type log_info &>/dev/null; then
            log_info "Already using zsh, skipping shell change"
        else
            echo "[INFO] Already using zsh, skipping"
        fi
        return 0
    fi

    if type log_info &>/dev/null; then
        log_info "Changing default shell to zsh: $zsh_path"
    else
        echo "[INFO] Changing default shell to zsh: $zsh_path"
    fi

    # Use sudo chsh (non-interactive, no password prompt)
    if sudo chsh -s "$zsh_path" "$(whoami)" 2>/dev/null; then
        if type log_info &>/dev/null; then
            log_info "Shell changed successfully to zsh"
            log_warn "Logout/login or restart required for changes to take effect"
        else
            echo "[INFO] Shell changed successfully to zsh"
            echo "[WARN] Logout/login or restart required for changes to take effect"
        fi
        return 0
    else
        if type log_error &>/dev/null; then
            log_error "Failed to change shell to zsh"
        else
            echo "[ERROR] Failed to change shell to zsh" >&2
        fi
        return 1
    fi
}

# Check if current shell is zsh
# Usage: is_zsh
# Returns: 0 if zsh, 1 otherwise
is_zsh() {
    [ "${SHELL:-}" = "$(which zsh 2>/dev/null)" ]
}

# Export functions for use in other scripts
export -f change_shell_to_zsh
export -f is_zsh
