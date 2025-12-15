#!/bin/bash

# Pre-flight validation checks for dotfiles installation
# Verifies system requirements before proceeding with installation

set -euo pipefail

# Set TERM if not defined (for Docker/minimal environments)
export TERM="${TERM:-xterm}"

# Colors with fallback
red=$(tput setaf 1 2>/dev/null || echo "")
green=$(tput setaf 2 2>/dev/null || echo "")
yellow=$(tput setaf 3 2>/dev/null || echo "")
blue=$(tput setaf 4 2>/dev/null || echo "")
reset=$(tput sgr0 2>/dev/null || echo "")

# ===================================
# Check Functions
# ===================================

# Check if running as root (should NOT be root for safety)
check_not_root() {
    # Skip in CI environments where root is common
    if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
        echo "${yellow}⚠ Skipping root check in CI environment${reset}"
        return 0
    fi
    if [ "$EUID" -eq 0 ]; then
        echo "${red}[ERROR] Do not run this script as root!${reset}"
        echo "${yellow}[INFO] Run as regular user with sudo access instead.${reset}"
        return 1
    fi
    echo "${green}✓ Not running as root${reset}"
}

# Check for sudo access
check_sudo_access() {
    # Skip in CI environments (usually runs as root)
    if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
        echo "${yellow}⚠ Skipping sudo check in CI environment${reset}"
        return 0
    fi
    if ! sudo -n true 2>/dev/null; then
        echo "${yellow}[WARN] Testing sudo access...${reset}"
        sudo -v || {
            echo "${red}[ERROR] Sudo access required but not available${reset}"
            return 1
        }
    fi
    echo "${green}✓ Sudo access available${reset}"
}

# Detect Linux distribution
detect_distro() {
    if [ ! -f /etc/os-release ]; then
        echo "${red}[ERROR] Cannot detect Linux distribution${reset}"
        return 1
    fi

    . /etc/os-release
    local distro_id="$ID"

    case "$distro_id" in
        ubuntu|debian)
            echo "${green}✓ Detected: $PRETTY_NAME${reset}"
            export DETECTED_DISTRO="debian"
            ;;
        arch|manjaro|cachyos)
            echo "${green}✓ Detected: $PRETTY_NAME${reset}"
            export DETECTED_DISTRO="arch"
            ;;
        *)
            echo "${yellow}[WARN] Unsupported distribution: $PRETTY_NAME${reset}"
            echo "${yellow}[INFO] Supported: Ubuntu, Debian, Arch Linux, Manjaro, CachyOS${reset}"
            # Auto-continue in CI environments
            if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
                echo "${yellow}⚠ Auto-continuing in CI environment${reset}"
            else
                read -p "Continue anyway? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    return 1
                fi
            fi
            ;;
    esac
}

# Check available disk space
check_disk_space() {
    local required_gb=10
    local target_path="${1:-$HOME}"

    # Get available space in GB
    local available_gb=$(df -BG "$target_path" | awk 'NR==2 {print $4}' | sed 's/G//')

    echo "${blue}[INFO] Available disk space: ${available_gb}GB (required: ${required_gb}GB)${reset}"

    if [ "$available_gb" -lt "$required_gb" ]; then
        echo "${red}[ERROR] Insufficient disk space!${reset}"
        echo "${yellow}[INFO] At least ${required_gb}GB required for full installation${reset}"
        return 1
    fi
    echo "${green}✓ Sufficient disk space available${reset}"
}

# Check internet connectivity
check_internet() {
    echo "${blue}[INFO] Checking internet connectivity...${reset}"

    # Try ping first, fall back to curl (ping may be blocked in some environments)
    if ! ping -c 1 -W 2 8.8.8.8 &>/dev/null; then
        # Ping failed, try HTTP-based check (GitHub Actions blocks ICMP)
        if ! curl -s --connect-timeout 5 https://www.google.com &>/dev/null; then
            echo "${red}[ERROR] No internet connection detected${reset}"
            echo "${yellow}[INFO] Internet required for downloading packages and tools${reset}"
            return 1
        fi
    fi

    # Check if we can reach GitHub (critical for cloning repos)
    if ! curl -s --connect-timeout 5 https://github.com &>/dev/null; then
        echo "${yellow}[WARN] Cannot reach github.com${reset}"
        echo "${yellow}[INFO] This may cause issues downloading tools${reset}"
        # Auto-continue in CI environments
        if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
            echo "${yellow}⚠ Auto-continuing in CI environment${reset}"
        else
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                return 1
            fi
        fi
    fi

    echo "${green}✓ Internet connectivity OK${reset}"
}

# Check for required base commands
check_base_commands() {
    local missing_commands=()
    local required_commands=("curl" "wget" "git")

    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &>/dev/null; then
            missing_commands+=("$cmd")
        fi
    done

    if [ ${#missing_commands[@]} -ne 0 ]; then
        echo "${yellow}[WARN] Missing base commands: ${missing_commands[*]}${reset}"
        echo "${yellow}[INFO] These will be installed during setup${reset}"
    else
        echo "${green}✓ All base commands available${reset}"
    fi
}

# Verify $DOTFILES variable is set
check_dotfiles_var() {
    if [ -z "${DOTFILES:-}" ]; then
        echo "${red}[ERROR] \$DOTFILES environment variable not set${reset}"
        echo "${yellow}[INFO] This should be set by install.sh${reset}"
        return 1
    fi

    if [ ! -d "$DOTFILES" ]; then
        echo "${red}[ERROR] \$DOTFILES path does not exist: $DOTFILES${reset}"
        return 1
    fi

    echo "${green}✓ \$DOTFILES is set: $DOTFILES${reset}"
}

# Check if backup directory exists, create if needed
setup_backup_dir() {
    local backup_dir="$HOME/.dotfiles_backup"

    if [ ! -d "$backup_dir" ]; then
        mkdir -p "$backup_dir"
        echo "${blue}[INFO] Created backup directory: $backup_dir${reset}"
    fi

    echo "${green}✓ Backup directory ready${reset}"
}

# ===================================
# Main Pre-flight Check
# ===================================

run_preflight_checks() {
    echo "${blue}========================================${reset}"
    echo "${blue}  Pre-flight System Validation${reset}"
    echo "${blue}========================================${reset}"
    echo ""

    local checks_passed=0
    local checks_total=0

    # Array of check functions
    local checks=(
        "check_not_root"
        "check_sudo_access"
        "detect_distro"
        "check_disk_space"
        "check_internet"
        "check_base_commands"
        "check_dotfiles_var"
        "setup_backup_dir"
    )

    for check in "${checks[@]}"; do
        ((checks_total++)) || true
        if $check; then
            ((checks_passed++)) || true
        else
            echo "${red}[FAIL] $check failed${reset}"
            return 1
        fi
        echo ""
    done

    echo "${green}========================================${reset}"
    echo "${green}  ✓ All checks passed ($checks_passed/$checks_total)${reset}"
    echo "${green}========================================${reset}"
    echo ""

    return 0
}

# Export function for use in other scripts
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Script is being executed directly
    run_preflight_checks
else
    # Script is being sourced
    :  # Functions are now available
fi
