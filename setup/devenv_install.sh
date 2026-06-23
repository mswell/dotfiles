#!/bin/bash

# Development environment installation script using mise (ex-rtx)
# Replaces: pyenv, asdf, nvm, fnm - unified tool version manager
# Author: Wellington Moraes
# Note: This script assumes system dependencies are already installed by distro-specific scripts

set -euo pipefail

# Colors for output (compatible with existing dotfiles color scheme)
red=$(tput setaf 1 2>/dev/null || echo "")
green=$(tput setaf 2 2>/dev/null || echo "")
yellow=$(tput setaf 3 2>/dev/null || echo "")
blue=$(tput setaf 4 2>/dev/null || echo "")
reset=$(tput sgr0 2>/dev/null || echo "")

# =============================================
#  CONFIGURATION
#  Defaults use the latest versions reported by mise at install time.
#  Override when needed, e.g.:
#    PYTHON_VERSION=3.12.7 NODE_VERSION=22 PNPM_VERSION=10 ./setup/devenv_install.sh
# =============================================
PYTHON_VERSION="${PYTHON_VERSION:-latest}"
NODE_VERSION="${NODE_VERSION:-latest}"
PNPM_VERSION="${PNPM_VERSION:-latest}"

RESOLVED_PYTHON_VERSION=""
RESOLVED_NODE_VERSION=""
RESOLVED_PNPM_VERSION=""

# Python tools to install in the managed tools virtualenv
PYTHON_TOOLS_ARRAY=("poetry" "ipython" "pytest" "black" "ruff" "mypy" "requests" "colorama" "pipx")

# npm CLIs to install globally after Node.js is available through mise
NPM_GLOBAL_TOOLS_ARRAY=("esbuild")

# Directories
VENVS="$HOME/.ve"
PROJS="$HOME/Projects"

# =============================================
#  LOGGING FUNCTIONS
# =============================================
log_info() {
    echo "${blue}[INFO]${reset} $*"
}

log_success() {
    echo "${green}[SUCCESS]${reset} $*"
}

log_warning() {
    echo "${yellow}[WARNING]${reset} $*"
}

log_error() {
    echo "${red}[ERROR]${reset} $*"
}

# =============================================
#  UTILITY FUNCTIONS
# =============================================
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Add line to file if it doesn't exist
add_to_file() {
    local line="$1"
    local file="$2"
    grep -qxF "$line" "$file" 2>/dev/null || echo "$line" >> "$file"
}

# Remove line from file
remove_from_file() {
    local pattern="$1"
    local file="$2"
    if [[ -f "$file" ]]; then
        sed -i'' "/$pattern/d" "$file"
    fi
}

# Activate mise while suppressing the inherited ERR trap from install.sh.
# `mise activate bash` internally runs `declare -f command_not_found_handle`,
# which exits non-zero when the function doesn't exist, firing false ERR reports.
mise_activate() {
    local _saved_trap
    _saved_trap=$(trap -p ERR 2>/dev/null || true)
    trap '' ERR
    mise_activate
    [[ -n "$_saved_trap" ]] && eval "$_saved_trap"
}

# =============================================
#  CLEANUP OLD TOOLS (asdf, pyenv)
# =============================================
cleanup_old_tools() {
    log_info "Checking for old version managers to disable..."

    local zshrc="$HOME/.zshrc"
    local cleaned=false

    # Patterns to remove from .zshrc
    local patterns_to_remove=(
        # asdf patterns
        'ASDF_DATA_DIR'
        'asdf/shims'
        'asdf/completions'
        'zinit snippet OMZP::asdf'
        '.asdf/asdf.sh'
        # pyenv patterns
        'PYENV_ROOT'
        'pyenv init'
        'pyenv virtualenv-init'
        'pyenv-virtualenv-init'
        # nvm patterns
        'NVM_DIR'
        'nvm.sh'
        # fnm patterns
        'fnm env'
    )

    if [[ -f "$zshrc" ]]; then
        for pattern in "${patterns_to_remove[@]}"; do
            if grep -q "$pattern" "$zshrc"; then
                log_warning "Found '$pattern' in .zshrc - will be handled by mise"
                cleaned=true
            fi
        done
    fi

    if $cleaned; then
        log_info "Old tool configurations detected. They will coexist with mise."
        log_info "To fully migrate, manually remove old configs from .zshrc"
        log_info "See cleanup instructions at the end of this script."
    else
        log_success "No conflicting configurations found"
    fi
}

# =============================================
#  CHECK DEPENDENCIES
# =============================================
check_dependencies() {
    log_info "Checking system dependencies..."

    local missing_deps=()
    local required_commands=("gcc" "make" "git" "curl")

    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            missing_deps+=("$cmd")
        fi
    done

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_warning "Missing dependencies: ${missing_deps[*]}"
        log_warning "Please run the appropriate distro setup first"
        log_warning "Continuing anyway..."
    else
        log_success "All required dependencies found"
    fi
}

# =============================================
#  INSTALL MISE
# =============================================
install_mise() {
    log_info "Installing mise..."

    if command_exists mise; then
        log_warning "mise is already installed. Updating..."
        mise self-update 2>/dev/null || true
        return
    fi

    # Install mise using official installer
    curl https://mise.run | sh

    # Add to PATH for current session
    export PATH="$HOME/.local/bin:$PATH"

    if command_exists mise; then
        log_success "mise installed successfully"
        mise --version
    else
        log_error "mise installation failed"
        exit 1
    fi
}

# =============================================
#  CONFIGURE MISE IN SHELL
# =============================================
configure_mise_shell() {
    log_info "Configuring mise in shell..."

    local zshrc="$HOME/.zshrc"

    # Add mise activation to .zshrc
    # Using a marker comment to identify our block
    local mise_block='# >>> mise initialization >>>'
    local mise_end='# <<< mise initialization <<<'

    if grep -q "$mise_block" "$zshrc" 2>/dev/null; then
        log_warning "mise already configured in .zshrc"
        return
    fi

    cat >> "$zshrc" << 'EOF'

# >>> mise initialization >>>
# mise: unified version manager for Python, Node.js, Go, etc.
# https://mise.jdx.dev/
export PATH="$HOME/.local/bin:$PATH"
eval "$(mise activate zsh)"
# <<< mise initialization <<<
EOF

    log_success "mise shell configuration added to .zshrc"
}

# =============================================
#  ACTIVATE MISE FOR CURRENT SESSION
# =============================================
activate_mise() {
    log_info "Activating mise for current session..."

    export PATH="$HOME/.local/bin:$PATH"

    # Activate mise
    mise_activate

    log_success "mise activated"
}

# =============================================
#  RESOLVE TOOL VERSIONS
# =============================================
resolve_mise_version() {
    local tool="$1"
    local requested_version="$2"
    local latest_version=""

    if [[ "$requested_version" == "latest" ]]; then
        latest_version=$(mise latest "$tool" 2>/dev/null | awk 'NF {print $1; exit}')
        if [[ -n "$latest_version" ]]; then
            echo "$latest_version"
            return 0
        fi
    fi

    echo "$requested_version"
}

resolve_tool_versions() {
    log_info "Resolving latest tool versions from mise..."

    RESOLVED_PYTHON_VERSION=$(resolve_mise_version "python" "$PYTHON_VERSION")
    RESOLVED_NODE_VERSION=$(resolve_mise_version "node" "$NODE_VERSION")
    RESOLVED_PNPM_VERSION=$(resolve_mise_version "pnpm" "$PNPM_VERSION")

    log_info "Python: $PYTHON_VERSION -> $RESOLVED_PYTHON_VERSION"
    log_info "Node.js: $NODE_VERSION -> $RESOLVED_NODE_VERSION"
    log_info "pnpm: $PNPM_VERSION -> $RESOLVED_PNPM_VERSION"
}

python_venv_name() {
    local version
    version=$(mise list python --current 2>/dev/null | awk 'NF {print $2; exit}')
    version="${version:-${RESOLVED_PYTHON_VERSION:-$PYTHON_VERSION}}"
    echo "tools${version%.*}"
}

# =============================================
#  INSTALL PYTHON
# =============================================
install_python() {
    local version="${RESOLVED_PYTHON_VERSION:-$PYTHON_VERSION}"
    log_info "Installing Python $version via mise..."

    # mise install is idempotent and also fixes versions marked as missing.
    mise install python@$version
    log_success "Python $version installed"

    # Set as global default
    mise use --global python@$version
    log_success "Python $version set as global default"
}

# =============================================
#  INSTALL NODE.JS
# =============================================
install_nodejs() {
    local version="${RESOLVED_NODE_VERSION:-$NODE_VERSION}"
    log_info "Installing Node.js $version via mise..."

    mise install node@$version
    mise use --global node@$version

    local installed_version
    installed_version=$(mise list node --current 2>/dev/null | awk '{print $2}' | head -1)
    log_success "Node.js $installed_version installed and set as global default"
}

# =============================================
#  INSTALL PNPM
# =============================================
install_pnpm() {
    local version="${RESOLVED_PNPM_VERSION:-$PNPM_VERSION}"
    log_info "Installing pnpm $version via mise..."

    # pnpm is managed by mise directly so it is available as a shim alongside node/npm.
    mise install pnpm@$version
    mise use --global pnpm@$version

    local installed_version
    installed_version=$(mise list pnpm --current 2>/dev/null | awk '{print $2}' | head -1)
    log_success "pnpm $installed_version installed and set as global default"
}

# =============================================
#  INSTALL NODE.JS GLOBAL TOOLS
# =============================================
install_node_tools() {
    log_info "Installing global npm tools..."

    mise_activate

    if ! command_exists npm; then
        log_error "npm not found; cannot install global npm tools"
        return 1
    fi

    npm install -g "${NPM_GLOBAL_TOOLS_ARRAY[@]}"
    hash -r 2>/dev/null || true

    for tool in "${NPM_GLOBAL_TOOLS_ARRAY[@]}"; do
        if command_exists "$tool"; then
            log_success "$tool: $("$tool" --version 2>/dev/null | head -1)"
        else
            log_warning "$tool: installed package but command not found on PATH"
        fi
    done
}

# =============================================
#  SETUP DIRECTORIES
# =============================================
setup_directories() {
    log_info "Setting up directories..."

    mkdir -p "$VENVS"
    mkdir -p "$PROJS"

    local zshrc="$HOME/.zshrc"
    add_to_file "export WORKON_HOME=\"$VENVS\"" "$zshrc"
    add_to_file "export PROJECT_HOME=\"$PROJS\"" "$zshrc"

    log_success "Directories configured"
}

# =============================================
#  SETUP PYTHON VIRTUAL ENVIRONMENT
# =============================================
setup_python_venv() {
    log_info "Setting up Python virtual environment..."

    local venv_name
    venv_name=$(python_venv_name)
    local venv_path="$VENVS/$venv_name"

    if [[ -d "$venv_path" ]]; then
        log_warning "Virtual environment $venv_name already exists"
    else
        # Ensure we're using mise's Python
        mise_activate

        python -m venv "$venv_path"
        log_success "Virtual environment created at $venv_path"
    fi

    # Upgrade pip
    "$venv_path/bin/pip" install --upgrade pip setuptools wheel

    log_success "Virtual environment prepared"
}

# =============================================
#  INSTALL PYTHON TOOLS
# =============================================
install_python_tools() {
    log_info "Installing Python tools..."

    local venv_name
    venv_name=$(python_venv_name)
    local venv_path="$VENVS/$venv_name"
    local pip_path="$venv_path/bin/pip"

    if [[ ! -f "$pip_path" ]]; then
        log_error "Virtual environment not found at $venv_path"
        return 1
    fi

    "$pip_path" install "${PYTHON_TOOLS_ARRAY[@]}"

    log_success "Python tools installed"
}

# =============================================
#  CREATE GLOBAL TOOL-VERSIONS FILE
# =============================================
create_global_tool_versions() {
    log_info "Creating global .tool-versions file..."

    local tool_versions="$HOME/.tool-versions"

    # Get actual installed versions
    local python_full=$(mise list python --current 2>/dev/null | awk '{print $2}' | head -1)
    local node_full=$(mise list node --current 2>/dev/null | awk '{print $2}' | head -1)
    local pnpm_full=$(mise list pnpm --current 2>/dev/null | awk '{print $2}' | head -1)

    # Fallback to requested versions if detection fails
    python_full="${python_full:-${RESOLVED_PYTHON_VERSION:-$PYTHON_VERSION}}"
    node_full="${node_full:-${RESOLVED_NODE_VERSION:-$NODE_VERSION}}"
    pnpm_full="${pnpm_full:-${RESOLVED_PNPM_VERSION:-$PNPM_VERSION}}"

    cat > "$tool_versions" << EOF
python $python_full
nodejs $node_full
pnpm $pnpm_full
EOF

    log_success "Global .tool-versions created"
    log_info "Contents:"
    cat "$tool_versions"
}

# =============================================
#  CHECK INSTALLATION
# =============================================
check_installation() {
    log_info "Verifying installation..."

    local checks=()
    local warnings=()

    # Activate mise
    mise_activate

    # Check mise
    if command_exists mise; then
        log_success "mise: $(mise --version)"
        checks+=("mise")
    else
        log_error "mise not found"
    fi

    # Check Python
    if command_exists python; then
        local py_version=$(python --version 2>&1)
        log_success "Python: $py_version"
        checks+=("python")
    else
        log_error "Python not found"
    fi

    # Check Node.js
    if command_exists node; then
        local node_version=$(node --version 2>&1)
        log_success "Node.js: $node_version"
        checks+=("node")
    else
        log_error "Node.js not found"
    fi

    # Check npm
    if command_exists npm; then
        local npm_version=$(npm --version 2>&1)
        log_success "npm: $npm_version"
        checks+=("npm")
    else
        log_warning "npm not found"
        warnings+=("npm")
    fi

    # Check pnpm
    if command_exists pnpm; then
        local pnpm_version=$(pnpm --version 2>&1)
        log_success "pnpm: $pnpm_version"
        checks+=("pnpm")
    else
        log_error "pnpm not found"
        warnings+=("pnpm")
    fi

    # Check global npm tools
    for tool in "${NPM_GLOBAL_TOOLS_ARRAY[@]}"; do
        if command_exists "$tool"; then
            log_success "$tool: $("$tool" --version 2>/dev/null | head -1)"
            checks+=("$tool")
        else
            log_warning "$tool: not found"
            warnings+=("$tool")
        fi
    done

    # Check Python tools in virtualenv
    local venv_name
    venv_name=$(python_venv_name)
    local venv_path="$VENVS/$venv_name"
    local tools=("poetry" "black" "ruff" "pytest")

    for tool in "${tools[@]}"; do
        if [[ -f "$venv_path/bin/$tool" ]]; then
            log_success "$tool: installed (in virtualenv)"
            checks+=("$tool")
        elif command_exists "$tool"; then
            log_success "$tool: installed (global)"
            checks+=("$tool")
        else
            log_warning "$tool: not found"
            warnings+=("$tool")
        fi
    done

    echo ""
    log_info "========================================="
    log_info "Installation Summary"
    log_info "========================================="
    log_success "Passed: ${#checks[@]} checks"
    if [ ${#warnings[@]} -gt 0 ]; then
        log_warning "Warnings: ${#warnings[@]} items (${warnings[*]})"
    fi

    return 0
}

# =============================================
#  PRINT CLEANUP INSTRUCTIONS
# =============================================
print_cleanup_instructions() {
    echo ""
    echo "${yellow}========================================="
    echo "  CLEANUP INSTRUCTIONS (Optional)"
    echo "=========================================${reset}"
    echo ""
    echo "To fully migrate from asdf/pyenv to mise, remove these from ~/.zshrc:"
    echo ""
    echo "${red}# Remove asdf lines:${reset}"
    echo "  fpath=(\${ASDF_DATA_DIR:-\$HOME/.asdf}/completions \$fpath)"
    echo "  export PATH=\"\${ASDF_DATA_DIR:-\$HOME/.asdf}/shims:\$PATH\""
    echo "  # zinit snippet OMZP::asdf  (if uncommented)"
    echo ""
    echo "${red}# Remove pyenv lines (if present):${reset}"
    echo "  export PYENV_ROOT=\"\$HOME/.pyenv\""
    echo "  export PATH=\"\$PYENV_ROOT/bin:\$PATH\""
    echo "  eval \"\$(pyenv init --path)\""
    echo "  eval \"\$(pyenv init -)\""
    echo "  eval \"\$(pyenv virtualenv-init -)\""
    echo ""
    echo "${yellow}# Optionally remove old tool directories:${reset}"
    echo "  rm -rf ~/.asdf           # asdf installation"
    echo "  rm -rf ~/.pyenv          # pyenv installation"
    echo "  rm -rf ~/.nvm            # nvm installation (if exists)"
    echo ""
    echo "${green}# mise data location:${reset}"
    echo "  ~/.local/share/mise      # mise data"
    echo "  ~/.local/bin/mise        # mise binary"
    echo "  ~/.tool-versions         # global versions file"
    echo ""
}

# =============================================
#  PRINT USAGE INSTRUCTIONS
# =============================================
print_usage() {
    echo ""
    echo "${green}========================================="
    echo "  MISE QUICK REFERENCE"
    echo "=========================================${reset}"
    echo ""
    echo "# List installed versions"
    echo "  mise list"
    echo ""
    echo "# Install a specific version"
    echo "  mise install python@3.13"
    echo "  mise install node@20"
    echo "  mise install pnpm@latest"
    echo ""
    echo "# Set global version"
    echo "  mise use --global python@3.12"
    echo ""
    echo "# Set project-local version (creates .tool-versions)"
    echo "  mise use python@3.11"
    echo ""
    echo "# Update mise itself"
    echo "  mise self-update"
    echo ""
    echo "# Override default latest versions when needed"
    echo "  PYTHON_VERSION=3.12.7 NODE_VERSION=22 PNPM_VERSION=10 ./setup/devenv_install.sh"
    echo ""
    echo "# npm CLIs installed globally by this setup"
    echo "  ${NPM_GLOBAL_TOOLS_ARRAY[*]}"
    echo ""
    echo "# Activate virtualenv for Python tools"
    echo "  source $VENVS/$(python_venv_name)/bin/activate"
    echo ""
}

# =============================================
#  MAIN
# =============================================
main() {
    echo ""
    log_info "========================================="
    log_info "  Development Environment Setup (mise)"
    log_info "========================================="
    echo ""

    cleanup_old_tools
    check_dependencies
    install_mise
    configure_mise_shell
    activate_mise
    resolve_tool_versions
    install_python
    install_nodejs
    install_pnpm
    install_node_tools
    setup_directories
    setup_python_venv
    install_python_tools
    create_global_tool_versions
    check_installation

    log_success "Development environment setup completed!"
    echo ""
    log_info "To apply changes, restart your terminal or run:"
    echo "  source ~/.zshrc"

    print_cleanup_instructions
    print_usage
}

# Execute main function if not sourced
if [[ -z "${SOURCED_FROM_INSTALL:-}" ]]; then
    main "$@"
fi
