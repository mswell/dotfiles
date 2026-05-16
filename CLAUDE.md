# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `mswell/dotfiles`, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.

## Overview

This is a comprehensive dotfiles management system for automated Linux development environment setup. It supports multiple Linux distributions (Ubuntu, Arch Linux), with Hyprland as the primary desktop target, and includes security/pentesting tools for bug bounty hunting and security research.

## Core Commands

### Initial Setup
```bash
./install.sh  # Interactive menu with 8 setup options
```

**Menu Options:**
- `[1]` - Ubuntu/Debian VPS (servers, web development)
- `[2]` - Arch Linux VPS (servers, CLI-only, no GUI)
- `[3]` - Arch Linux + Hyprland (modern desktop, Wayland)
- `[4]` - Install Hacktools (security testing, CTF, bug bounty)
- `[5]` - Install Dev Environment (mise: Python + Node.js + pnpm)
- `[6]` - Arch Linux WSL (Windows Subsystem for Linux)
- `[7]` - Claude for Bug Bounty (Skills + Agents + Caido AI)
- `[8]` - Install Pi Coding Agent + Restore Pi Config

### Dependency Chain

**Critical:** Scripts must be run in the correct order:
1. Run distro-specific setup first (option 1, 2, 3, or 6) - installs system dependencies
2. Run dev environment installation (option 5) - sets up Python + Node.js + pnpm via mise
3. Run hacktools installation (option 4) - installs security tools

**Do not run devenv or hacktools before system setup** - they depend on system packages being installed first.

## Architecture

### Shared Libraries (`setup/lib/`)

Common functionality is extracted into shared libraries to eliminate duplication:

- `common.sh` - Universal library (all variants): DOTFILES detection, colors, `source_script()`
- `arch.sh` - Arch-specific library: `install_pacman()`, `install_yay()`, `ensure_yay()`, `arch_base_setup()`, `setup_bat_theme()`, `setup_nvim_dir()`, `install_fonts()`
- `shell_utils.sh` - Shell management: `change_shell_to_zsh()`
- `logging.sh` - Structured logging system (used by `install.sh`)
- `preflight.sh` - Pre-flight validation checks (used by `install.sh`)

### Modular Design

Each distribution has its own setup directory with specialized scripts:

**Ubuntu** (`setup/ubuntu/`):
- `setup.sh` - Orchestrator that sources all other scripts
- `base.sh` - System dependencies (build-essential, git, curl, etc.)
- `devel.sh` - Development tools (neovim, virtualenvwrapper)
- `apps.sh` - Applications (Docker, cargo tools, etc.)

**Arch Linux** (`setup/ArchHypr/`, `setup/ArchWSL/`, `setup/ArchVPS/`):
- `setup.sh` - Orchestrator (sources `lib/common.sh` for `source_script()`)
- `base.sh` - Base system via `arch_base_setup()` + variant-specific extras
- `apps.sh` - Variant-specific packages (uses shared `install_yay()`/`install_pacman()`)
- `fonts.sh` - Font installation via shared `install_fonts()` (Hyprland flow)

**Shared scripts** (used by all variants):
- `setup/terminal.sh` - TPM installation + shell change to zsh
- `setup/copy_dots.sh` - Copies config files to home directory

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

### Development Environment (setup/devenv_install.sh)

Uses **mise** (ex-rtx) - unified version manager replacing pyenv, asdf, nvm:

- Installs mise via official installer
- Installs latest Python, Node.js, and pnpm versions reported by `mise latest` at install time
- Versions can be pinned with env overrides: `PYTHON_VERSION=3.12.7 NODE_VERSION=22 PNPM_VERSION=10 ./setup/devenv_install.sh`
- Sets up virtualenv: `tools<python-major.minor>` with poetry, ipython, pytest, black, ruff, mypy
- Creates global `~/.tool-versions` file
- Configures directories: `~/.ve` (virtualenvs), `~/Projects` (projects)

**Key commands:**
```bash
mise list                    # List installed versions
mise install python@3.13     # Install specific version
mise use --global python@3.12  # Set global version
mise use python@3.11         # Set project-local version
```

### Go Installation (setup/install_golang.sh)

**Distribution-specific approach:**

**Arch Linux** - Uses pacman (package manager):
- Go installed automatically in `base.sh` via `pacman -S go`
- Location: `/usr/bin/go`
- Updates managed automatically by pacman
- No manual intervention needed
- Prevents version conflicts between manual and system installations

**Ubuntu/Debian** - Uses manual installation:
- Executed via `setup/ubuntu/setup.sh`
- Downloads latest Go version from golang.org
- Installs to `/usr/local/go`
- Adds `/usr/local/go/bin` to PATH in `~/.profile`
- Always gets the latest Go version

**Path Detection** (`config/zsh/.zshrc`):
- Automatically detects Go installation location
- Prioritizes system package manager installation (pacman/apt)
- Falls back to manual installation if found
- Sets GOPATH to `$HOME/go` and adds `$GOPATH/bin` to PATH

**Migration for Arch Users:**
- If you have existing manual Go installation causing version conflicts
- Run: `./setup/migrate_go_arch.sh`
- This script will:
  1. Remove manual installation from `/usr/local/go`
  2. Install Go via pacman
  3. Clean up Go cache
  4. Guide you to reinstall Go tools

**Note:** `install_hacktools.sh` automatically detects Go in both locations and falls back to manual installation only if Go is not found anywhere.

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

### Desktop Theme System (Hyprland only)

Three themes — **wellpunk-dark**, **wellpunk-light**, **tokyonight** — cycle via `SUPER+SHIFT+T`. All components read a single source of truth and switch atomically.

**How it works:**
- `~/.config/hypr/current-theme` — plain text file holding the active theme name
- `theme-switch.sh` — updates the file and creates symlinks/restarts services for each component
- Each component has a `themes/` directory with one file per theme; a `current-*` symlink points at the active one

**Per-component integration:**

| Component | Mechanism |
|-----------|-----------|
| Hyprland / Hyprlock | `ln -sf themes/$THEME.conf colors.conf` → `source colors.conf` |
| Kitty | `ln -sf themes/$THEME.conf current-theme.conf` + `kill -SIGUSR1` |
| Waybar | `ln -sf themes/$THEME.css themes/current.css` + `pkill -SIGUSR2` |
| Walker | `sed -i` config.toml + service restart |
| tmux | `ln -sf themes/$THEME.conf current-theme.conf` + `tmux source-file` |
| fzf | `ln -sf themes/$THEME.sh current-theme.sh` (sourced by .zshrc) |
| ZSH / p10k | `ln -sf themes/$THEME.zsh current-theme.zsh` (sourced after p10k) |
| Neovim | Reads `current-theme` at startup in `colorscheme.lua` |
| Mako | `sed -i` config directly + `makoctl reload` |
| GTK 2/3/4 | `.gtkrc-2.0` + `settings.ini` overwrite + `gsettings` + `hyprctl setcursor` |
| Kvantum | `ln -sf themes/$THEME.kvconfig kvantum.kvconfig` |
| bat | `ln -sf themes/$THEME.conf config` |
| git-delta | `ln -sf themes/$THEME.gitconfig current-theme.gitconfig` via `.gitconfig` include |
| Wallpaper | `wpaperd` pointed at `backgrounds/$THEME/` |

**Adding a new theme:**
1. Create `config/hypr/themes/<name>.conf` (Hyprland/Hyprlock color vars)
2. Create `config/kitty/themes/<name>.conf`
3. Create `config/waybar/themes/<name>.css`
4. Create `config/walker/themes/<name>/style.css`
5. Create `config/tmux/themes/<name>.conf`
6. Create `config/fzf/themes/<name>.sh`
7. Create `config/zsh/themes/<name>.zsh` (p10k + autosuggestion colors)
8. Create `config/Kvantum/themes/<name>.kvconfig`
9. Create `config/bat/themes/<name>.conf` and `config/git/themes/<name>.gitconfig`
10. Add wallpapers to `config/hypr/backgrounds/<name>/`
11. Add the theme name to the `THEMES` array in `theme-switch.sh`
12. Add the name to the `colorscheme` map in `config/nvim/lua/plugins/colorscheme.lua`

**Power menu** (`SUPER+ESC`): `config/hypr/scripts/power-menu.sh` pipes options to `walker --dmenu` (Lock / Suspend / Logout / Restart / Shutdown). Walker has no built-in power provider; this is the correct Omarchy pattern.

## Configuration Structure

```
config/
├── zsh/
│   ├── env.zsh           # Central path configuration (source of truth)
│   ├── functions.zsh     # Bug bounty workflow functions
│   ├── alias.zsh         # Shell aliases
│   ├── custom.zsh        # Custom workflows
│   └── themes/           # p10k + autosuggestion colors per theme
├── nvim/
│   └── lua/plugins/
│       └── colorscheme.lua  # reads current-theme at startup
├── hypr/
│   ├── hyprland.conf
│   ├── hyprlock.conf     # Omarchy style: blurred screenshot, centered input only
│   ├── themes/           # wellpunk-dark.conf, wellpunk-light.conf, tokyonight.conf
│   ├── backgrounds/      # per-theme wallpaper directories
│   └── scripts/
│       ├── theme-switch.sh  # syncs all components on theme change
│       └── power-menu.sh    # walker dmenu power menu
├── kitty/themes/
├── waybar/themes/
├── walker/themes/
├── tmux/themes/
├── fzf/themes/
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
2. Create `setup.sh` with `SCRIPT_DIR`/`DOTFILES` detection + `source lib/common.sh`
3. Create `base.sh` sourcing `lib/arch.sh` (Arch) or `lib/common.sh` (other)
4. Create `apps.sh` with variant-specific packages
5. Add menu option to `install.sh`
6. Ensure `setup.sh` sources `setup/terminal.sh` and `setup/copy_dots.sh` at the end

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
- `config/hypr/scripts/theme-switch.sh` - **Theme system orchestrator** (syncs all components)
- `config/hypr/scripts/power-menu.sh` - Walker dmenu power menu
- `config/nvim/lua/plugins/colorscheme.lua` - Dynamic Neovim colorscheme (reads current-theme)
- `setup/lib/common.sh` - **Shared library** (colors, DOTFILES detection, source_script)
- `setup/lib/arch.sh` - **Arch shared library** (pacman/yay helpers, base setup, fonts)
- `setup/install_hacktools.sh` - Security tools installation
- `setup/devenv_install.sh` - Dev environment setup (mise: Python + Node.js + pnpm)
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
