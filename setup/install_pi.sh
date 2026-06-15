#!/usr/bin/env bash
# =============================================================================
# install_pi.sh — Install Pi Coding Agent and restore sanitized Pi config
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
DOTFILES="${DOTFILES:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PI_CONFIG_SRC="$DOTFILES/config/pi"
PI_AGENT_DIR="$HOME/.pi/agent"
SETTINGS_SRC="$PI_CONFIG_SRC/agent/settings.example.json"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

# Colors / logging fallback. If install.sh sourced setup/lib/logging.sh, use it.
green=$(tput setaf 2 2>/dev/null || echo "")
yellow=$(tput setaf 3 2>/dev/null || echo "")
red=$(tput setaf 1 2>/dev/null || echo "")
blue=$(tput setaf 4 2>/dev/null || echo "")
reset=$(tput sgr0 2>/dev/null || echo "")

pi_info() { if declare -F log_info >/dev/null; then log_info "$@"; else echo "${blue}[INFO]${reset} $*"; fi; }
pi_ok() { if declare -F log_info >/dev/null; then log_info "$@"; else echo "${green}[OK]${reset} $*"; fi; }
pi_warn() { if declare -F log_warn >/dev/null; then log_warn "$@"; elif declare -F log_warning >/dev/null; then log_warning "$@"; else echo "${yellow}[WARN]${reset} $*"; fi; }
pi_err() { if declare -F log_error >/dev/null; then log_error "$@"; else echo "${red}[ERROR]${reset} $*" >&2; fi; }
pi_step() { if declare -F log_step >/dev/null; then log_step "$@"; else echo "\n${green}>>> $*${reset}\n"; fi; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

add_runtime_paths() {
    export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"
}

install_mise_if_needed() {
    add_runtime_paths
    if command_exists mise; then
        pi_ok "mise already installed: $(mise --version 2>/dev/null | head -1)"
        return 0
    fi

    if ! command_exists curl; then
        pi_err "curl is required to install mise automatically. Install curl and retry."
        return 1
    fi

    pi_info "Installing mise (needed to provide Node.js/npm when missing)..."
    curl https://mise.run | sh
    add_runtime_paths

    if ! command_exists mise; then
        pi_err "mise installation failed or ~/.local/bin is not on PATH."
        return 1
    fi

    pi_ok "mise installed: $(mise --version 2>/dev/null | head -1)"
}

ensure_node_and_npm() {
    add_runtime_paths

    if command_exists node && command_exists npm; then
        pi_ok "Node.js: $(node --version), npm: $(npm --version)"
        return 0
    fi

    pi_warn "Node.js/npm not found. Installing Node.js latest via mise..."
    install_mise_if_needed

    mise install node@latest
    mise use --global node@latest
    eval "$(mise activate bash)" 2>/dev/null || true
    add_runtime_paths
    hash -r 2>/dev/null || true

    if ! command_exists node || ! command_exists npm; then
        pi_err "Node.js/npm still not available after mise install."
        return 1
    fi

    pi_ok "Node.js: $(node --version), npm: $(npm --version)"
}

ensure_writable_npm_prefix() {
    local prefix
    prefix="$(npm config get prefix 2>/dev/null || true)"

    if [[ -n "$prefix" && -w "$prefix" ]]; then
        return 0
    fi

    # If npm comes from mise, prefix is usually writable. For system npm, avoid sudo by using ~/.local.
    pi_warn "Global npm prefix is not writable: ${prefix:-unknown}. Using ~/.local for npm globals."
    mkdir -p "$HOME/.local"
    npm config set prefix "$HOME/.local"
    add_runtime_paths
}

install_pi() {
    pi_step "Installing Pi Coding Agent"
    ensure_node_and_npm
    ensure_writable_npm_prefix

    if command_exists pi; then
        pi_ok "pi already available: $(command -v pi)"
        pi_info "Updating @earendil-works/pi-coding-agent..."
    else
        pi_info "Installing @earendil-works/pi-coding-agent..."
    fi

    # Project was renamed from @mariozechner/* to @earendil-works/* (v0.74+).
    # Remove the stale old-scope package so extensions resolve the new scope.
    npm uninstall -g @mariozechner/pi-coding-agent >/dev/null 2>&1 || true
    npm install -g @earendil-works/pi-coding-agent@latest
    add_runtime_paths
    hash -r 2>/dev/null || true

    if ! command_exists pi; then
        pi_err "pi binary not found after npm install. Check npm global bin path."
        return 1
    fi

    pi_ok "pi installed: $(pi --version 2>/dev/null || command -v pi)"
}

backup_existing_settings() {
    local target="$PI_AGENT_DIR/settings.json"
    if [[ -f "$target" ]]; then
        local backup="$PI_AGENT_DIR/settings.json.bak.$TIMESTAMP"
        cp "$target" "$backup"
        pi_warn "Existing settings.json backed up to $backup"
    fi
}

copy_dir_contents() {
    local src="$1"
    local dst="$2"
    local label="$3"

    if [[ ! -d "$src" ]]; then
        pi_info "No $label directory in dotfiles: $src"
        return 0
    fi

    mkdir -p "$dst"
    cp -R "$src/." "$dst/"
    pi_ok "Restored $label -> $dst"
}

restore_pi_config() {
    pi_step "Restoring Pi config from dotfiles"

    if [[ ! -d "$PI_CONFIG_SRC" ]]; then
        pi_err "Pi config backup not found: $PI_CONFIG_SRC"
        return 1
    fi

    mkdir -p "$PI_AGENT_DIR"

    if [[ -f "$SETTINGS_SRC" ]]; then
        backup_existing_settings
        cp "$SETTINGS_SRC" "$PI_AGENT_DIR/settings.json"
        chmod 600 "$PI_AGENT_DIR/settings.json" 2>/dev/null || true
        pi_ok "Restored settings.json from settings.example.json"
    else
        pi_warn "settings.example.json not found: $SETTINGS_SRC"
    fi

    copy_dir_contents "$PI_CONFIG_SRC/agent/extensions" "$PI_AGENT_DIR/extensions" "extensions"
    copy_dir_contents "$PI_CONFIG_SRC/agent/skills" "$PI_AGENT_DIR/skills" "skills"
    copy_dir_contents "$PI_CONFIG_SRC/agent/prompts" "$PI_AGENT_DIR/prompts" "prompts"
    copy_dir_contents "$PI_CONFIG_SRC/agent/themes" "$PI_AGENT_DIR/themes" "themes"
}

# Detect distro locally so this script also works when run standalone
# (without install.sh/preflight setting DETECTED_DISTRO).
detect_distro_local() {
    if [[ -n "${DETECTED_DISTRO:-}" ]]; then
        echo "$DETECTED_DISTRO"
        return 0
    fi
    if [[ -r /etc/os-release ]]; then
        . /etc/os-release
        case "${ID:-}" in
            ubuntu|debian) echo "debian"; return 0 ;;
            arch|manjaro|cachyos|endeavouros) echo "arch"; return 0 ;;
        esac
    fi
    echo "unknown"
}

# Provide a no-op `husky` on PATH for the package-install phase.
# pi installs packages with `npm install --omit=dev`; some packages (e.g.
# badlogic/pi-diff-review) declare `"prepare": "husky"`, and husky is a
# devDependency that is NOT installed under --omit=dev. Without a shim the
# prepare script exits 127 and aborts the whole install.
make_npm_script_shims() {
    if [[ -z "${PI_NPM_SHIM_DIR:-}" ]]; then
        PI_NPM_SHIM_DIR="$(mktemp -d)"
        printf '#!/bin/sh\nexit 0\n' > "$PI_NPM_SHIM_DIR/husky"
        chmod +x "$PI_NPM_SHIM_DIR/husky"
        export PATH="$PI_NPM_SHIM_DIR:$PATH"
        pi_info "Added no-op husky shim for npm prepare scripts"
    fi
}

# Install system dependencies needed to build the Glimpse native host that the
# diff-review extension uses (GTK4 + WebKit6 + gtk4-layer-shell + Rust/cargo).
ensure_diff_review_native_deps() {
    local distro
    distro="$(detect_distro_local)"
    case "$distro" in
        arch)
            pi_info "Installing Glimpse build deps (Arch): gtk4 webkitgtk-6.0 gtk4-layer-shell rust"
            sudo pacman -S --noconfirm --needed gtk4 webkitgtk-6.0 gtk4-layer-shell rust \
                || pi_warn "pacman failed; install gtk4 webkitgtk-6.0 gtk4-layer-shell rust manually."
            ;;
        debian)
            pi_info "Installing Glimpse build deps (Debian/Ubuntu): GTK4/WebKit6/layer-shell + cargo"
            sudo apt-get update -y || true
            sudo apt-get install -y libgtk-4-dev libwebkitgtk-6.0-dev libgtk4-layer-shell-dev cargo \
                || pi_warn "apt failed; install libgtk-4-dev libwebkitgtk-6.0-dev libgtk4-layer-shell-dev cargo manually."
            ;;
        *)
            pi_warn "Unknown distro: install GTK4 + WebKit6 + gtk4-layer-shell + Rust/cargo manually for diff-review."
            ;;
    esac
}

# Build the Glimpse native host for the diff-review extension.
# pi blocks npm postinstall scripts (allow-scripts) for security, so the native
# Rust binary is never built automatically; we build it explicitly here.
build_diff_review_host() {
    pi_step "Building Glimpse native host for diff-review"

    local glimpse="$PI_AGENT_DIR/git/github.com/badlogic/pi-diff-review/node_modules/glimpseui"
    if [[ ! -d "$glimpse" ]]; then
        pi_warn "glimpseui not found at $glimpse; diff-review may not have installed. Skipping host build."
        return 0
    fi
    if [[ -x "$glimpse/src/glimpse" ]]; then
        pi_ok "Glimpse native host already built"
        return 0
    fi

    ensure_diff_review_native_deps

    pi_info "Compiling Glimpse host (Rust release build, one-time)..."
    # A transitive cargo dependency (gtk4-layer-shell) pulls a git submodule over
    # SSH; force the git CLI so fetch uses existing credentials instead of failing
    # on ssh-agent auth.
    if CARGO_NET_GIT_FETCH_WITH_CLI=true npm --prefix "$glimpse" run build:linux; then
        pi_ok "Glimpse native host built: $glimpse/src/glimpse"
    else
        pi_warn "Glimpse build failed. After installing the deps, retry with:"
        pi_warn "  CARGO_NET_GIT_FETCH_WITH_CLI=true npm --prefix '$glimpse' run build:linux"
    fi
}

install_configured_pi_packages() {
    pi_step "Installing/updating Pi packages from restored settings"

    if [[ ! -f "$PI_AGENT_DIR/settings.json" ]]; then
        pi_warn "No settings.json found; skipping package install."
        return 0
    fi

    # Ensure husky shim is active before npm runs any package prepare scripts.
    make_npm_script_shims

    # pi update --extensions reads packages from settings.json and installs/updates them.
    # Keep this non-fatal so provider auth/network issues do not break base restore.
    if pi update --extensions; then
        pi_ok "Pi packages installed/updated"
    else
        pi_warn "pi update --extensions failed. You can retry later after network/provider setup."
    fi
}

validate_pi() {
    pi_step "Validating Pi"

    if pi --offline --help >/dev/null; then
        pi_ok "pi starts successfully in offline mode"
    else
        pi_warn "pi --offline --help failed. Review the output by running it manually."
    fi
}

print_next_steps() {
    echo ""
    echo "${green}Pi setup finished.${reset}"
    echo ""
    echo "Config restored from: $PI_CONFIG_SRC"
    echo "Config installed to : $PI_AGENT_DIR"
    echo ""
    echo "Next steps on a new machine:"
    echo "  1. Log in/authenticate the providers you use (for example GitHub Copilot)."
    echo "  2. Start Pi: pi"
    echo "  3. If already inside Pi, run: /reload"
    echo "  4. Optional: run /pi-backup after changing Pi config."
    echo ""
    echo "Sensitive data was not restored by design. Sessions are not restored."
}

main() {
    pi_step "Pi Coding Agent + dotfiles config restore"
    pi_info "Dotfiles: $DOTFILES"
    pi_info "Pi backup source: $PI_CONFIG_SRC"

    install_pi
    restore_pi_config
    install_configured_pi_packages
    build_diff_review_host
    validate_pi
    print_next_steps
}

main "$@"
