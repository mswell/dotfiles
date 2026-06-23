#!/usr/bin/env bash
# Explicit installer setup plans for install.sh menu options.

# shellcheck shell=bash

setup_plan_title() {
    case "${1:-}" in
        1) echo "Ubuntu/Debian VPS" ;;
        2) echo "Archlinux VPS" ;;
        3) echo "Archlinux with Hyprland" ;;
        4) echo "Install Hacktools" ;;
        5) echo "Install Dev Environment (mise: Python + Node.js + pnpm)" ;;
        6) echo "Archlinux WSL" ;;
        7) echo "Claude for Bug Bounty (Skills + Agents + Caido AI)" ;;
        8) echo "Install Pi Coding Agent + Restore Pi Config" ;;
        9) echo "macOS Setup" ;;
        *) return 1 ;;
    esac
}

setup_plan_steps() {
    case "${1:-}" in
        1) echo "setup/ubuntu/setup.sh" ;;
        2) echo "setup/ArchVPS/setup.sh" ;;
        3) echo "setup/ArchHypr/setup.sh" ;;
        4) echo "setup/install_hacktools.sh" ;;
        5) echo "setup/devenv_install.sh" ;;
        6) echo "setup/ArchWSL/setup.sh" ;;
        7) echo "setup/install_skills.sh" ;;
        8) echo "setup/install_pi.sh" ;;
        9) echo "setup/macOS/setup.sh" ;;
        *) return 1 ;;
    esac
}

setup_plan_dependency_notes() {
    cat <<'EOF'
Dependency chain: run distro setup before dev environment setup, and dev environment setup before hacktools setup.
EOF
}

setup_plan_print() {
    local option="$1" step index=0
    printf 'Plan: %s\n' "$(setup_plan_title "$option")"
    setup_plan_dependency_notes
    while IFS= read -r step; do
        index=$((index + 1))
        printf '%d. %s\n' "$index" "$step"
    done < <(setup_plan_steps "$option")
}

setup_plan_run() {
    local option="$1"
    local runner_function="${2:-run_setup}"
    local step

    if [[ "${DOTFILES_DRY_RUN:-0}" == "1" ]]; then
        setup_plan_print "$option"
        return 0
    fi

    while IFS= read -r step; do
        "$runner_function" "$step"
    done < <(setup_plan_steps "$option")
}
