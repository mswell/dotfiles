#!/bin/bash

# Structured logging system for dotfiles installation
# Provides consistent logging with timestamps, levels, and file output

set -euo pipefail

# ===================================
# Logging Configuration
# ===================================

# Log file location
export LOG_FILE="${LOG_FILE:-$HOME/.dotfiles_install.log}"
export LOG_LEVEL="${LOG_LEVEL:-INFO}"  # DEBUG, INFO, WARN, ERROR

# Colors for terminal output
export LOG_COLOR_DEBUG='\033[0;36m'    # Cyan
export LOG_COLOR_INFO='\033[0;32m'     # Green
export LOG_COLOR_WARN='\033[1;33m'     # Yellow
export LOG_COLOR_ERROR='\033[0;31m'    # Red
export LOG_COLOR_RESET='\033[0m'       # Reset

# Log level priorities (for filtering)
declare -A LOG_PRIORITIES=(
    [DEBUG]=0
    [INFO]=1
    [WARN]=2
    [ERROR]=3
)

# ===================================
# Logging Functions
# ===================================

# Initialize logging system
# Usage: log_init
log_init() {
    # Try to create log file, fallback to /tmp if home directory fails
    if ! touch "$LOG_FILE" 2>/dev/null; then
        LOG_FILE="/tmp/dotfiles_install.log"
        if ! touch "$LOG_FILE" 2>/dev/null; then
            echo "[WARN] Cannot create log file, logging to stdout only" >&2
            # Set flag to skip file logging
            export LOG_FILE_DISABLED=1
            return 0
        fi
    fi

    # Write session header
    {
        echo ""
        echo "========================================="
        echo "Installation started: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "User: ${USER:-unknown}"
        echo "Hostname: $(hostname 2>/dev/null || echo 'unknown')"
        echo "OS: $(uname -s 2>/dev/null || echo 'unknown') $(uname -r 2>/dev/null || echo '')"
        echo "========================================="
        echo ""
    } >> "$LOG_FILE" 2>/dev/null || true

    log_info "Logging initialized: $LOG_FILE"
}

# Check if log level should be displayed
# Usage: should_log <level>
should_log() {
    local level="$1"
    local current_priority=${LOG_PRIORITIES[$LOG_LEVEL]}
    local message_priority=${LOG_PRIORITIES[$level]}

    [ "$message_priority" -ge "$current_priority" ]
}

# Core logging function
# Usage: _log <level> <message>
_log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Check if we should log this level
    if ! should_log "$level"; then
        return 0
    fi

    # Determine color for terminal output
    local color_var="LOG_COLOR_${level}"
    local color="${!color_var}"

    # Format log entry
    local log_entry="[$timestamp] [$level] $message"

    # Write to log file (if not disabled)
    if [ "${LOG_FILE_DISABLED:-0}" != "1" ]; then
        echo "$log_entry" >> "$LOG_FILE" 2>/dev/null || true
    fi

    # Write to terminal with color
    echo -e "${color}[$level]${LOG_COLOR_RESET} $message"
}

# Convenience logging functions
log_debug() { _log DEBUG "$@"; }
log_info()  { _log INFO "$@"; }
log_warn()  { _log WARN "$@"; }
log_error() { _log ERROR "$@"; }

# Log command execution with output capture
# Usage: log_cmd <command>
log_cmd() {
    local cmd="$*"
    log_debug "Executing: $cmd"

    local output
    local exit_code

    # Capture output and exit code
    output=$($cmd 2>&1) || exit_code=$?
    exit_code=${exit_code:-0}

    if [ $exit_code -eq 0 ]; then
        log_debug "Command succeeded: $cmd"
        [ -n "$output" ] && log_debug "Output: $output"
    else
        log_error "Command failed ($exit_code): $cmd"
        [ -n "$output" ] && log_error "Output: $output"
    fi

    return $exit_code
}

# Log a step in the installation process
# Usage: log_step <step_name>
log_step() {
    local step="$1"
    local separator="-------------------------------------------"

    {
        echo ""
        echo "$separator"
        echo "STEP: $step"
        echo "$separator"
    } >> "$LOG_FILE"

    echo -e "\n${LOG_COLOR_INFO}>>> $step${LOG_COLOR_RESET}\n"
}

# Log installation summary
# Usage: log_summary <status> [details]
log_summary() {
    local status="$1"
    local details="${2:-}"

    {
        echo ""
        echo "========================================="
        echo "Installation $status: $(date '+%Y-%m-%d %H:%M:%S')"
        [ -n "$details" ] && echo "Details: $details"
        echo "========================================="
        echo ""
    } >> "$LOG_FILE"

    if [ "$status" = "COMPLETED" ]; then
        log_info "Installation completed successfully!"
    else
        log_error "Installation $status"
    fi
}

# View recent log entries
# Usage: log_tail [lines]
log_tail() {
    local lines="${1:-20}"
    tail -n "$lines" "$LOG_FILE"
}

# Search log for pattern
# Usage: log_grep <pattern>
log_grep() {
    local pattern="$1"
    grep -i "$pattern" "$LOG_FILE"
}

# Export log location info
log_where() {
    echo "Log file: $LOG_FILE"
    echo "Log level: $LOG_LEVEL"
    if [ -f "$LOG_FILE" ]; then
        echo "Log size: $(du -h "$LOG_FILE" | cut -f1)"
        echo "Last modified: $(stat -c %y "$LOG_FILE" 2>/dev/null || stat -f %Sm "$LOG_FILE")"
    fi
}

# ===================================
# Error Handling Integration
# ===================================

# Trap errors and log them
trap_errors() {
    set -E  # Inherit ERR trap in functions
    trap 'log_error "Error occurred in ${BASH_SOURCE[0]}:${LINENO}: ${BASH_COMMAND}"' ERR
}

# Enable verbose mode
enable_verbose() {
    export LOG_LEVEL=DEBUG
    log_debug "Verbose logging enabled"
}

# ===================================
# Initialization
# ===================================

# Auto-initialize if sourced (with fallbacks)
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
    # Being sourced - try to initialize, but don't fail if it doesn't work
    if ! log_init 2>/dev/null; then
        # Fallback: create minimal logging functions
        echo "[WARN] Logging initialization failed, using fallback mode" >&2
        log_debug() { echo "[DEBUG] $*"; }
        log_info() { echo "[INFO] $*"; }
        log_warn() { echo "[WARN] $*"; }
        log_error() { echo "[ERROR] $*" >&2; }
        log_step() { echo -e "\n>>> $*\n"; }
        log_summary() { echo "=== $1 ==="; }
    fi
fi
