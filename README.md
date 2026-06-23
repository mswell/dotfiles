# dotfiles

Personal development environment for Arch Linux + Hyprland, focused on security research and bug bounty hunting.

<p align="center">
  <img src="https://raw.githubusercontent.com/mswell/dotfiles/master/images/dotfile.png" alt="dotfiles" style="max-width:100%;">
</p>

## Overview

Automated setup for a minimal, consistent Linux environment with:

- **Arch Linux + Hyprland** as the primary desktop target
- **Vantablack / White / Tokyo Night** three-theme system synced across all components
- **LazyVim** with Omarchy-style dynamic colorschemes
- **Bug bounty toolkit** with full automated recon workflow
- Support for Ubuntu VPS, WSL, and headless Arch variants

## Install

```bash
git clone https://github.com/mswell/dotfiles.git
cd dotfiles
./install.sh
```

## Setup Options

| Option | Description |
|--------|-------------|
| [1] Ubuntu VPS | Servers and web development |
| [2] Arch VPS | CLI-only, no GUI |
| [3] Arch + Hyprland | Primary desktop (Wayland) |
| [4] Hacktools | Security tools, CTF, bug bounty |
| [5] Dev Environment | Python + Node.js + pnpm via mise |
| [6] Arch WSL | Windows Subsystem for Linux |
| [7] Claude for Bug Bounty | AI skills + Caido integration |
| [8] Install Pi Coding Agent | Pi install + config restore |

**Order matters:** run system setup (1/2/3/6) before dev env (5) or hacktools (4).

Dev env versions default to `mise latest` at install time. Pin when needed:
```bash
PYTHON_VERSION=3.12.7 NODE_VERSION=22 PNPM_VERSION=10 ./setup/devenv_install.sh
```

## Desktop

Minimal Wayland setup inspired by [Omarchy](https://github.com/basecamp/omarchy):

- **Theme**: `SUPER+SHIFT+T` cycles wellpunk-dark → wellpunk-light → tokyonight, syncing Hyprland, Kitty, Waybar, Walker, tmux, fzf, ZSH prompt, and Neovim
- **Launcher**: Walker (`SUPER+A`)
- **Power menu**: Walker dmenu (`SUPER+ESC`) — Lock / Suspend / Logout / Restart / Shutdown
- **Lock screen**: Hyprlock — blurred screenshot background, minimal centered input field
- **Notifications**: Mako
- **Status bar**: Waybar
- **Terminal**: Kitty

### Key Bindings

| Key | Action |
|-----|--------|
| `SUPER+Return` | Terminal |
| `SUPER+A` | App launcher (Walker) |
| `SUPER+ESC` | Power menu |
| `SUPER+SHIFT+L` | Lock screen |
| `SUPER+SHIFT+T` | Cycle theme (wellpunk-dark → wellpunk-light → tokyonight) |
| `SUPER+CTRL+W` | Next wallpaper |
| `SUPER+V` | Clipboard history |

## Shell & Editor

- **ZSH** with Powerlevel10k — prompt and autosuggestion colors sync with the active theme
- **Neovim** config installed from [`mswell/nvim`](https://github.com/mswell/nvim)
- **tmux** with theme-synced status bar
- **fzf** with per-theme color config

## Pi Coding Agent Harness

This repo also backs up my sanitized Pi Coding Agent configuration, including a custom `pi-harness` extension.

`pi-harness` is a project-local memory and workflow layer for Pi. It stores durable state in `.pi/harness/` inside each project so the agent does not depend only on the live conversation context.

It helps Pi:

- keep stable project context across restarts and compaction;
- create and track active tasks;
- follow the **PREVC** workflow: Planning, Review, Execution, Validation, Confirmation;
- record durable decisions and validation evidence;
- maintain task contracts and plans;
- keep operational notes, handoffs, and future ideas/backlog;
- write append-only JSONL traces for auditability;
- generate a deterministic `summary.md` before Pi compaction.

Useful commands:

```text
/harness status
/harness task <title>
/harness phase <P|R|E|V|C>
/harness decision <text>
/harness evidence <text>
/harness note <text>
/harness idea <text>
/harness summary
/harness done
```

The harness is general-purpose engineering workflow support. It complements experiment-focused tools like `pi-autoresearch`, but it is meant for any refactor, bugfix, research task, or implementation session.

Sanitized Pi files live under:

```text
config/pi/
```

Secrets, sessions, tokens, cookies, OAuth material, and authentication files are intentionally excluded.

## Bug Bounty Toolkit

ZSH functions for automated recon. Each step produces files consumed by the next.

### Workflow

```
workspaceRecon <domain>
  └── wellSubRecon          # subfinder + amass + crt.sh + DNS resolution
      └── naabuRecon        # top-100 port scan
          └── getalive      # HTTP probe → ALLHTTP / 200HTTP / 403HTTP
              └── crawler   # gospider + waybackurls + gau + katana
                  └── JScrawler / secretfinder / exposureNuc / XssScan
```

### Recon Functions

| Function | Description | Output |
|----------|-------------|--------|
| `workspaceRecon <domain>` | Creates dated workspace | `domain/YYYY-MM-DD/` |
| `wellSubRecon` | Full subdomain pipeline | `clean.subdomains` |
| `subdomainenum` | Passive enum (subfinder, amass, crt.sh) | `all.subdomains` |
| `subPermutation` | Permutations via alterx + puredns | `permutations.txt` |
| `naabuRecon` | Top-100 port scan | `naabuScan` |
| `naabuFullPorts` | Full port range scan | `full_ports.txt` |
| `getalive` | HTTP probe, categorized by status | `ALLHTTP`, `200HTTP`, `403HTTP` |
| `crawler` | Multi-tool crawler | `crawlerResults.txt` |
| `JScrawler` | JS file discovery | `crawlJS`, `JSroot/` |
| `secretfinder` | Secret scanning in JS files | `js_secrets_result` |
| `xsshunter` | XSS detection (airixss, freq, xsstrike) | `airixss.txt`, `FreqXSS.txt` |
| `bypass4xx` | 403/401 bypass attempts | `4xxbypass.txt` |
| `prototypefuzz` | Prototype pollution testing | — |
| `subtakeover` | Subdomain takeover detection | `subtakeover.txt` |
| `exposureNuc` | Nuclei exposure scan | — |
| `XssScan` | Nuclei XSS scan | — |
| `nucTakeover` | Nuclei takeover scan | — |

Security tools installed via option [4]: nuclei, httpx, subfinder, naabu, katana, ffuf, amass, and others from ProjectDiscovery.

## Configuration Structure

```
config/
├── zsh/
│   ├── env.zsh              # central path config (source of truth)
│   ├── functions.zsh        # bug bounty recon functions
│   ├── themes/              # p10k + autosuggestion colors per theme
│   └── .zshrc
├── hypr/
│   ├── hyprland.lua
│   ├── hyprlock.conf
│   ├── themes/              # wellpunk-dark.conf + wellpunk-light.conf + tokyonight.conf
│   └── scripts/
│       ├── theme-switch.sh  # syncs all components on theme change
│       └── power-menu.sh    # walker dmenu power menu
├── nvim/                    # legacy/local reference; installer clones https://github.com/mswell/nvim
├── kitty/themes/
├── waybar/themes/
├── walker/
└── tmux/themes/
```

## Inspiration

Desktop configuration inspired by [Omarchy](https://github.com/basecamp/omarchy) by DHH / Basecamp — theme system architecture, Walker integration, Hyprlock style, and Neovim colorschemes (`bjarneo/vantablack.nvim`, `bjarneo/white.nvim`).

## License

MIT — Wellington Moraes
