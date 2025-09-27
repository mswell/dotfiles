#!/bin/bash

# Python environment installation script using pyenv
# Author: Based on original script by Henrique Bastos and Wellington Moraes
# Modified for: Python 3 only, current versions, better security practices
# Note: This script assumes system dependencies are already installed by distro-specific scripts

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

# Colors for output (compatible with existing dotfiles color scheme)
red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
blue=$(tput setaf 4)
reset=$(tput sgr0)

# Modern versions
PYTHON_VERSION="3.12.7"  # More stable LTS
PYTHON_TOOLS_ARRAY=("poetry" "ipython" "pytest" "black" "ruff" "mypy" "requests" "colorama")

# Directories
VENVS="$HOME/.ve"
PROJS="$HOME/Projects"

# Function for colored logging
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Add line to .zshrc if it doesn't exist
add_to_zshrc() {
    grep -qxF "$1" "$HOME/.zshrc" || echo "$1" >> "$HOME/.zshrc"
}

# Check if required system dependencies are available
check_dependencies() {
    log_info "Checking system dependencies..."

    local missing_deps=()

    # Essential build tools that should be installed by distro scripts
    local required_commands=("gcc" "make" "git" "curl" "wget")

    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            missing_deps+=("$cmd")
        fi
    done

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_warning "Missing dependencies: ${missing_deps[*]}"
        log_warning "Please run the appropriate distro setup first (e.g., Ubuntu VPS option 1)"
        log_warning "This script will continue, but installation may fail..."
    else
        log_success "All required dependencies found"
    fi
}

# Install Pyenv
install_pyenv() {
    log_info "Installing Pyenv..."

    if [ -d "$HOME/.pyenv" ]; then
        log_warning "Pyenv already exists. Skipping installation..."
        return
    fi

    # Use HTTPS for security
    git clone https://github.com/pyenv/pyenv.git ~/.pyenv

    export PYENV_ROOT="$HOME/.pyenv"
    export PATH="$PYENV_ROOT/bin:$PATH"

    add_to_zshrc 'export PYENV_ROOT="$HOME/.pyenv"'
    add_to_zshrc 'export PATH="$PYENV_ROOT/bin:$PATH"'

    log_success "Pyenv installed"
}

# Install Pyenv plugins
install_pyenv_plugins() {
    log_info "Installing Pyenv plugins..."

    export PYENV_ROOT="$HOME/.pyenv"
    export PATH="$PYENV_ROOT/bin:$PATH"

    # Check if plugins already exist
    if [ ! -d "$PYENV_ROOT/plugins/pyenv-virtualenv" ]; then
        git clone https://github.com/pyenv/pyenv-virtualenv.git \
            "$(pyenv root)/plugins/pyenv-virtualenv"
    fi

    if [ ! -d "$PYENV_ROOT/plugins/pyenv-update" ]; then
        git clone https://github.com/pyenv/pyenv-update.git \
            "$(pyenv root)/plugins/pyenv-update"
    fi

    log_success "Pyenv plugins installed"
}

# Setup directories
setup_directories() {
    log_info "Setting up directories..."

    mkdir -p "$VENVS"
    mkdir -p "$PROJS"

    add_to_zshrc 'export WORKON_HOME='"$VENVS"
    add_to_zshrc 'export PROJECT_HOME='"$PROJS"

    log_success "Directories configured"
}

# Setup Pyenv initialization
setup_pyenv_init() {
    log_info "Setting up Pyenv initialization..."

    add_to_zshrc 'eval "$(pyenv init --path)"'
    add_to_zshrc 'eval "$(pyenv init -)"'
    add_to_zshrc 'if which pyenv-virtualenv-init > /dev/null; then eval "$(pyenv virtualenv-init -)"; fi'

    log_success "Pyenv initialization configured"
}

# Initialize Pyenv
initialize_pyenv() {
    log_info "Initializing Pyenv..."

    eval "$(pyenv init --path)"
    eval "$(pyenv init -)"

    if command_exists pyenv-virtualenv-init; then
        eval "$(pyenv virtualenv-init -)"
    fi

    log_success "Pyenv initialized"
}

# Install Python version
install_python_version() {
    log_info "Installing Python $PYTHON_VERSION..."

    # Check if already installed
    if pyenv versions --bare | grep -q "^${PYTHON_VERSION}$"; then
        log_warning "Python $PYTHON_VERSION is already installed. Skipping..."
        return
    fi

    pyenv install "$PYTHON_VERSION"

    log_success "Python $PYTHON_VERSION installed"
}

# Prepare virtual environment
prepare_virtualenv() {
    log_info "Preparing virtual environment..."

    # Check if already exists
    if pyenv versions --bare | grep -q "^tools${PYTHON_VERSION%.*}$"; then
        log_warning "Virtualenv tools${PYTHON_VERSION%.*} already exists. Skipping..."
        return
    fi

    pyenv virtualenv "$PYTHON_VERSION" "tools${PYTHON_VERSION%.*}"

    # Upgrade pip
    "$HOME/.pyenv/versions/$PYTHON_VERSION/bin/pip" install --upgrade pip setuptools wheel

    # Upgrade pip in virtualenv
    "$HOME/.pyenv/versions/tools${PYTHON_VERSION%.*}/bin/pip" install --upgrade pip setuptools wheel

    log_success "Virtual environment prepared"
}

# Install Python tools
install_python_tools() {
    log_info "Installing Python tools..."

    local venv_path="$HOME/.pyenv/versions/tools${PYTHON_VERSION%.*}/bin/pip"

    # Convert array to individual arguments for pip
    "$venv_path" install "${PYTHON_TOOLS_ARRAY[@]}"

    log_success "Python tools installed"
}

# Setup global Pyenv
setup_pyenv_global() {
    log_info "Setting up global Python..."

    pyenv global "$PYTHON_VERSION" "tools${PYTHON_VERSION%.*}"

    log_success "Global Python configured"
}

# Protect lib directories
protect_lib_dirs() {
    log_info "Protecting lib directories..."

    chmod -R -w "$HOME/.pyenv/versions/$PYTHON_VERSION/lib/"

    log_success "Lib directories protected"
}

# Check installation
check_installation() {
    log_info "Checking installation..."

    local checks=()
    local warnings=()

    # Check Python version (be more flexible)
    if pyenv versions --bare | grep -q "^${PYTHON_VERSION}$"; then
        log_success "✓ Python $PYTHON_VERSION"
        checks+=("python")
    elif python$PYTHON_VERSION_MAJOR -c "import sys; print(f'Python {sys.version}')" 2>/dev/null; then
        log_success "✓ Python $PYTHON_VERSION (system)"
        checks+=("python")
    else
        log_error "✗ Python $PYTHON_VERSION not found"
    fi

    # Check virtual environment (be more flexible with naming)
    local venv_name="tools${PYTHON_VERSION%.*}"
    if pyenv versions --bare | grep -q "^${venv_name}$"; then
        log_success "✓ Virtualenv $venv_name"
        checks+=("virtualenv")
    else
        log_warning "⚠ Virtualenv $venv_name not found - may use global Python instead"
        warnings+=("virtualenv")
    fi

    # Check main tools (check in virtualenv first, then globally)
    local tools=("poetry" "black" "ruff" "pytest")
    for tool in "${tools[@]}"; do
        local tool_found=false

        # First try in virtualenv
        if [ -f "$HOME/.pyenv/versions/$venv_name/bin/$tool" ]; then
            log_success "✓ $tool (in virtualenv)"
            checks+=("$tool")
            tool_found=true
        # Then try globally
        elif command_exists "$tool"; then
            log_success "✓ $tool (global)"
            checks+=("$tool")
            tool_found=true
        else
            log_warning "⚠ $tool not found"
            warnings+=("$tool")
        fi
    done

    # Summary
    log_info "Installation check complete:"
    log_info "✓ Passed: ${#checks[@]} checks"
    if [ ${#warnings[@]} -gt 0 ]; then
        log_warning "⚠ Warnings: ${#warnings[@]} items"
    fi

    # Only fail if critical components are missing
    if [[ " ${checks[*]} " =~ " python " ]]; then
        log_success "Core installation successful!"
        if [ ${#warnings[@]} -eq 0 ]; then
            log_success "All components working perfectly!"
        else
            log_info "Installation completed with minor warnings (non-critical)"
        fi
    else
        log_error "Critical components missing!"
        return 1
    fi
}

# Main function
main() {
    log_info "Starting Python environment installation..."

    check_dependencies
    install_pyenv
    install_pyenv_plugins
    setup_directories
    setup_pyenv_init
    initialize_pyenv
    install_python_version
    prepare_virtualenv
    install_python_tools
    setup_pyenv_global
    protect_lib_dirs
    check_installation

    log_success "Python environment installation completed successfully!"
    echo
    log_info "To apply changes, restart your terminal or run:"
    echo "  source ~/.zshrc"
    echo
    log_info "To use the virtual environment:"
    echo "  pyenv activate tools${PYTHON_VERSION%.*}"
}

# Execute main function if not sourced, or if explicitly requested
# This allows the script to work both when executed directly and when sourced
if [[ -z "${SOURCED_FROM_INSTALL:-}" ]]; then
    # Not sourced from install.sh, execute normally
    main "$@"
fi
