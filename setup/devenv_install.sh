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
#  CONFIGURATION - Edit versions here
# =============================================
PYTHON_VERSION="3.12.7"
NODE_VERSION="22"  # LTS version (mise will get latest 22.x)

# Python tools to install globally
PYTHON_TOOLS_ARRAY=("poetry" "ipython" "pytest" "black" "ruff" "mypy" "requests" "colorama" "pipx")

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
        sed -i "/$pattern/d" "$file"
    fi
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
    eval "$(mise activate bash)" 2>/dev/null || true

    log_success "mise activated"
}

# =============================================
#  INSTALL PYTHON
# =============================================
install_python() {
    log_info "Installing Python $PYTHON_VERSION via mise..."

    # Check if already installed
    if mise list python 2>/dev/null | grep -q "$PYTHON_VERSION"; then
        log_warning "Python $PYTHON_VERSION already installed"
    else
        mise install python@$PYTHON_VERSION
        log_success "Python $PYTHON_VERSION installed"
    fi

    # Set as global default
    mise use --global python@$PYTHON_VERSION
    log_success "Python $PYTHON_VERSION set as global default"
}

# =============================================
#  INSTALL NODE.JS
# =============================================
install_nodejs() {
    log_info "Installing Node.js $NODE_VERSION via mise..."

    # Check if already installed
    if mise list node 2>/dev/null | grep -q "^node.*$NODE_VERSION"; then
        log_warning "Node.js $NODE_VERSION already installed"
    else
        mise install node@$NODE_VERSION
        log_success "Node.js $NODE_VERSION installed"
    fi

    # Set as global default
    mise use --global node@$NODE_VERSION
    log_success "Node.js $NODE_VERSION set as global default"
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

    local venv_name="tools${PYTHON_VERSION%.*}"
    local venv_path="$VENVS/$venv_name"

    if [[ -d "$venv_path" ]]; then
        log_warning "Virtual environment $venv_name already exists"
    else
        # Ensure we're using mise's Python
        eval "$(mise activate bash)" 2>/dev/null || true

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

    local venv_name="tools${PYTHON_VERSION%.*}"
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

    # Fallback to requested versions if detection fails
    python_full="${python_full:-$PYTHON_VERSION}"
    node_full="${node_full:-$NODE_VERSION}"

    cat > "$tool_versions" << EOF
python $python_full
nodejs $node_full
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
    eval "$(mise activate bash)" 2>/dev/null || true

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

    # Check Python tools in virtualenv
    local venv_name="tools${PYTHON_VERSION%.*}"
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
    echo "# Activate virtualenv for Python tools"
    echo "  source $VENVS/tools${PYTHON_VERSION%.*}/bin/activate"
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
    install_python
    install_nodejs
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
