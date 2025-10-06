# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a comprehensive dotfiles management system for automated Linux development environment setup. It supports multiple Linux distributions (Ubuntu, Arch Linux), window managers (Hyprland, i3wm, Qtile), and includes security/pentesting tools for bug bounty hunting and security research.

## Core Commands

### Initial Setup
```bash
./install.sh  # Interactive menu with 7 setup options
```

**Menu Options:**
- `[1]` - Ubuntu/Debian VPS (servers, web development)
- `[2]` - Arch Linux + Hyprland (modern desktop, Wayland)
- `[3]` - Install Hacktools (security testing, CTF, bug bounty)
- `[4]` - Install Pyenv (Python environment with pyenv)
- `[5]` - Arch Linux + i3wm (tiling window manager, X11)
- `[6]` - Arch Linux WSL (Windows Subsystem for Linux)
- `[7]` - Arch Linux DE (traditional desktop environment)

### Dependency Chain

**Critical:** Scripts must be run in the correct order:
1. Run distro-specific setup first (option 1, 2, 5, 6, or 7) - installs system dependencies
2. Run pyenv installation (option 4) - sets up Python environment
3. Run hacktools installation (option 3) - installs security tools

**Do not run pyenv or hacktools before system setup** - they depend on system packages being installed first.

## Architecture

### Modular Design

Each distribution has its own setup directory with specialized scripts:

**Ubuntu** (`setup/ubuntu/`):
- `setup.sh` - Orchestrator that sources all other scripts
- `base.sh` - System dependencies (build-essential, git, curl, etc.)
- `devel.sh` - Development tools (neovim, virtualenvwrapper)
- `apps.sh` - Applications (python-setuptools, etc.)
- `terminal.sh` - Terminal configuration

**Arch Linux** (`setup/ArchHypr/`, `setup/ArchI3wm/`, `setup/ArchWSL/`, `setup/ArchDE/`):
- `setup.sh` - Orchestrator
- `base.sh` - Base system + yay (AUR helper)
- `apps.sh` - Pacman/yay installations
- `fonts.sh` - Font installations
- `terminal.sh` - Terminal configuration

### Environment Variables (config/zsh/env.zsh)

**Central configuration file** - single source of truth for all paths:
```bash
TOOLS_PATH="$HOME/Tools"              # Security tools installation
LISTS_PATH="$HOME/Lists"              # Wordlists and SecLists
RECON_PATH="$HOME/Recon"              # Bug bounty recon workspace
DOTFILES_PATH="$HOME/Projects/dotfiles"
CUSTOM_NUCLEI_TEMPLATES_PATH="$DOTFILES_PATH/custom_nuclei_templates"
```

**Important:** All scripts source this file. When modifying paths, update env.zsh only.

### Security Tools (setup/install_hacktools.sh)

Installs bug bounty and security testing tools:
- **ProjectDiscovery tools** via pdtm: nuclei, httpx, subfinder, naabu, dnsx, katana, etc.
- **Go tools**: ffuf, amass, gf, qsreplace, waybackurls, gospider, puredns, etc.
- **Python tools**: dirsearch, SecretFinder, waymore, xnLinkFinder
- **Wordlists**: Automatically downloads SecLists wordlists to `$LISTS_PATH`

Sources `config/zsh/env.zsh` for all path variables.

### Python Environment (setup/pyenv_install.sh)

- Installs pyenv with virtualenv and update plugins
- Creates Python 3.12.7 installation
- Sets up virtualenv: `tools3.12` with poetry, ipython, pytest, black, ruff, mypy
- Configures directories: `~/.ve` (virtualenvs), `~/Projects` (projects)
- **Assumes system dependencies already installed** by distro scripts

### ZSH Functions (config/zsh/functions.zsh)

**Bug bounty reconnaissance workflow functions** - comprehensive toolkit for security testing:

**Recon Setup:**
- `workspaceRecon <domain>` - Creates workspace: `<domain>/YYYY-MM-DD/`
- `wellSubRecon` - Full subdomain enumeration + DNS resolution pipeline

**Subdomain Enumeration:**
- `subdomainenum` - Passive subdomain discovery (subfinder, amass, crt.sh)
- `brutesub` - DNS bruteforce
- `resolving` - DNS resolution with shuffledns

**Port Scanning:**
- `naabuRecon` - Top 100 ports scan
- `naabuFullPorts` - Full port range scan (excluding common ports)
- `getalive` - HTTP probing, categorizes by status (200HTTP, 403HTTP, etc.)

**Crawling & Data Collection:**
- `JScrawler` - JavaScript file discovery with katana
- `getjsurls` - JS URL extraction and validation
- `crawler` - Multi-tool crawler (gospider, waybackurls, gau, katana)

**Vulnerability Scanning:**
- `xsshunter` - XSS detection (airixss, freq, xsstrike)
- `subtakeover` - Subdomain takeover detection
- `prototypefuzz` - Prototype pollution testing
- `bypass4xx` - 403/401 bypass attempts
- `secretfinder` - Regex-based secrets scanning in JS

**Nuclei Workflows:**
- `exposureNuc`, `lfiScan`, `GitScan`, `XssScan`, `OpenRedirectScan`
- `APIRecon`, `graphqldetect`, `swaggerUIdetect`
- `nucTakeover` - Subdomain takeover via nuclei

**Infrastructure:**
- `dnsrecords` - Full DNS enumeration (A, NS, CNAME, MX, TXT, etc.)
- `screenshot` - Visual reconnaissance with aquatone

All functions expect files like `domains`, `clean.subdomains`, `ALLHTTP` in current directory.

## Configuration Structure

```
config/
├── zsh/
│   ├── env.zsh           # Central path configuration (source of truth)
│   ├── functions.zsh     # Bug bounty workflow functions
│   ├── alias.zsh         # Shell aliases
│   └── custom.zsh        # Custom workflows
├── nvim/                 # Neovim config (Lua-based)
├── kitty/                # Kitty terminal themes
├── wezterm/              # WezTerm config
├── hypr/                 # Hyprland config (Wayland compositor)
├── i3/                   # i3wm config (X11 tiling WM)
├── qtile/                # Qtile config (Python-based WM)
├── themes/               # Color schemes (Catppuccin, Tokyo Night, etc.)
├── home/.gf/             # GF patterns for grep
└── agents/               # Claude Code agent configurations
```

### Custom Nuclei Templates

Located in `custom_nuclei_templates/`:
- `swagger-ui.yaml` - Swagger/OpenAPI detection
- `sap-netweaver-workflow.yaml` - SAP-specific checks
- `api-recon.yaml`, `api-recon-workflow.yaml` - API discovery
- `m4cddr-takeovers.yaml` - Subdomain takeover templates

## Development Workflow

### Typical Bug Bounty Recon Flow

```bash
# 1. Setup workspace
workspaceRecon example.com

# 2. Subdomain enumeration
wellSubRecon

# 3. Port scanning
naabuRecon
getalive

# 4. JS crawling
JScrawler
getjsurls
secretfinder

# 5. Vulnerability scanning
exposureNuc
XssScan
subtakeover
bypass4xx
```

### Adding New Tools

1. Update `setup/install_hacktools.sh` with installation logic
2. If tool needs path export, add to `config/zsh/env.zsh`
3. Create wrapper function in `config/zsh/functions.zsh` if needed
4. Test installation flow

### Modifying Paths

**Only edit** `config/zsh/env.zsh` - this is the single source of truth. Both `install_hacktools.sh` and `functions.zsh` source this file.

### Adding New Distribution

1. Create directory: `setup/<NewDistro>/`
2. Create scripts: `setup.sh`, `base.sh`, `apps.sh`, `terminal.sh`
3. Add menu option to `install.sh`
4. Ensure `setup.sh` sources `copy_dots.sh` at the end

## Key Architectural Principles

1. **Separation of Concerns** - Each script has single responsibility
2. **Centralized Configuration** - All paths in `config/zsh/env.zsh`
3. **Modular Design** - Scripts can be run independently (with dependencies met)
4. **Dependency Awareness** - System deps → Python env → Security tools
5. **Idempotent Operations** - Scripts check before installing (skip if exists)

## Important Files

- `install.sh` - Main entry point (menu-driven installer)
- `config/zsh/env.zsh` - **Central path configuration** (source of truth)
- `config/zsh/functions.zsh` - Bug bounty workflow functions
- `setup/install_hacktools.sh` - Security tools installation
- `setup/pyenv_install.sh` - Python environment setup
- `setup/copy_dots.sh` - Copies config files to home directory

## Common Patterns

### Error Handling in Functions
```bash
if [ ! -s "required_file" ]; then
    echo "${red}[-] required_file not found or empty.${reset}"
    return 1
fi
```

### File Flow Pattern
Functions expect intermediate files from previous steps:
- `domains` - Target domain(s)
- `clean.subdomains` - Resolved subdomains
- `ALLHTTP` - All live HTTP endpoints
- `200HTTP` - HTTP 200 responses
- `403HTTP` - Forbidden endpoints

### Color Coding
```bash
red=$(tput setaf 1)      # Errors
green=$(tput setaf 2)    # Success
yellow=$(tput setaf 3)   # Info
reset=$(tput sgr0)       # Reset
```
