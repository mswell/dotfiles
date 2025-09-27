# Project Context Guideline - Dotfiles Management System

## Overview
This is a comprehensive dotfiles management system designed to set up development environments across multiple Linux distributions. The system uses a modular approach where each component has a specific responsibility.

## Architecture

### Main Entry Point
- **`install.sh`**: Interactive menu system that allows users to choose their Linux distribution and setup type
- Provides 7 main options:
  1. Ubuntu VPS
  2. Archlinux with Hyprland
  3. Install Hacktools
  4. Install Pyenv (Python environment)
  5. Archlinux with i3wm
  6. Archlinux WSL
  7. Archlinux DE

### Distribution-Specific Setup Scripts
Each distribution has its own setup directory with specialized scripts:

#### Ubuntu (`setup/ubuntu/`)
- **`setup.sh`**: Main orchestrator that calls all Ubuntu-specific scripts
- **`base.sh`**: Installs base system dependencies (build tools, Python, git, etc.)
- **`devel.sh`**: Installs development tools (neovim, virtualenvwrapper, etc.)
- **`apps.sh`**: Installs applications (neovim, python-setuptools, etc.)
- **`terminal.sh`**: Configures terminal tools

#### Arch Linux Variants (`setup/ArchHypr/`, `setup/ArchI3wm/`, `setup/ArchWSL/`, `setup/ArchDE/`)
- **`setup.sh`**: Main orchestrator
- **`base.sh`**: Installs base system and AUR helper (yay)
- **`apps.sh`**: Installs applications via pacman/yay
- **`fonts.sh`**: Installs fonts (varies by desktop environment)
- **`terminal.sh`**: Terminal configuration

### Specialized Installation Scripts
- **`pyenv_install.sh`**: Python environment setup using pyenv (called from main menu option 4)
- **`install_golang.sh`**: Go language installation
- **`install_hacktools.sh`**: Security testing tools (called from main menu option 3)
- **`terminal.sh`**: Terminal multiplexer and shell configuration
- **`copy_dots.sh`**: Copies configuration files to home directory

## Dependency Management Strategy

### System Dependencies
- **Each distro script handles its own system dependencies**
- Ubuntu: Uses `apt` with comprehensive package lists
- Arch: Uses `pacman` + `yay` (AUR helper)
- Dependencies are NOT installed by `pyenv_install.sh`

### Python Environment Dependencies
- `pyenv_install.sh` assumes system dependencies are already installed
- Only handles Python-specific tools and pyenv setup
- Checks for required build tools before proceeding

## Installation Flow

### Typical Usage Pattern:
1. **Choose distro** from `install.sh` menu (e.g., option 1 for Ubuntu VPS)
2. **Distro setup runs first** - installs system dependencies
3. **Run pyenv_install.sh** separately (option 4) - sets up Python environment
4. **Run install_hacktools.sh** if needed (option 3) - installs security tools

### Example Ubuntu Setup:
```bash
./install.sh          # Choose option 1 (Ubuntu VPS)
# ... Ubuntu setup completes with all system deps
./install.sh          # Choose option 4 (Install Pyenv)
# ... Python environment setup
./install.sh          # Choose option 3 (Install Hacktools)
# ... Security tools setup
```

## Key Design Principles

### 1. Separation of Concerns
- Each script has a single responsibility
- System deps handled by distro scripts
- Python environment handled by pyenv script
- Security tools handled by hacktools script

### 2. Modularity
- Scripts can be run independently
- Easy to maintain and update individual components
- Clear dependency chain

### 3. Cross-Distribution Compatibility
- Common functionality abstracted
- Distro-specific implementations
- Consistent user experience

### 4. Safety and Reliability
- Comprehensive error checking
- Dependency verification
- Clear user feedback with colored output

## Configuration Files
- **Dotfiles copied to `~/`**: All configuration files from `config/` directory
- **ZSH configuration**: Multiple files in `config/zsh/` (functions, aliases, custom flows)
- **Editor configs**: Neovim, vim configurations
- **Terminal configs**: Kitty, WezTerm, Ghostty themes
- **WM configs**: Hyprland, i3wm, Qtile configurations

## Tools and Technologies
- **Shell**: Bash/ZSH
- **Python**: pyenv for version management
- **Security**: Custom nuclei templates and recon tools
- **Editors**: Neovim with Lua configuration
- **Terminal**: Multiple terminal emulator support
- **WM**: Multiple window manager support (Hyprland, i3wm, Qtile)

## Maintenance Guidelines

### Adding New Distributions
1. Create new directory under `setup/`
2. Add base.sh, apps.sh, terminal.sh scripts
3. Add option to main menu in install.sh
4. Update this documentation

### Updating Dependencies
1. Update distro-specific scripts (e.g., ubuntu/base.sh)
2. Test across all supported distributions
3. Update documentation

### Adding New Tools
1. Determine which script should handle the tool
2. Add to appropriate installation script
3. Update dependencies if needed
4. Test installation flow

## Troubleshooting
- **Missing dependencies**: Run distro-specific setup first
- **Python issues**: Ensure pyenv_install.sh runs after system setup
- **Permission issues**: Check sudo access for system packages
- **AUR issues (Arch)**: Ensure yay is properly installed by base.sh