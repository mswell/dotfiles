# Dotfiles - Sistema de Gerenciamento de Ambiente de Desenvolvimento

Um sistema abrangente e modular para configuração automatizada de ambientes de desenvolvimento Linux, com suporte a múltiplas distribuições e window managers.

<p align="center">
	<img src="https://raw.githubusercontent.com/mswell/dotfiles/master/images/dotfile.png" alt="Dotfiles Management System" style="max-width:100%;">
</p>

## 📋 Visão Geral

Este projeto oferece uma solução completa para setup de ambientes de desenvolvimento, incluindo:

- **Múltiplas distribuições Linux** (Ubuntu, Arch Linux)
- **Vários window managers** (Hyprland, i3wm, Qtile)
- **Ferramentas de desenvolvimento** (Python, Go, Neovim)
- **Ferramentas de segurança** (pentest/hacking tools)
- **Configurações otimizadas** para terminal e editores
- **Templates customizados** para reconnaissance e security testing

## 🚀 Instalação

### Pré-requisitos
- Sistema Linux (Ubuntu 20.04+, Arch Linux)
- Git
- curl
- sudo (para instalação de pacotes do sistema)

### Instalação Rápida

```bash
git clone https://github.com/mswell/dotfiles.git
cd dotfiles
./install.sh
```

## 📊 Menu de Instalação

O script `install.sh` oferece 7 opções principais:

| Opção | Descrição | Destino |
|-------|-----------|---------|
| **[1] Ubuntu VPS** | Setup completo para Ubuntu Server | Servidores, desenvolvimento web |
| **[2] Archlinux com Hyprland** | Arch Linux + Wayland + Hyprland | Desktop moderno, Wayland |
| **[3] Install Hacktools** | Ferramentas de pentest/segurança | Security testing, CTF |
| **[4] Install Pyenv** | Ambiente Python com pyenv | Desenvolvimento Python |
| **[5] Archlinux com i3wm** | Arch Linux + i3 Window Manager | Desktop tiling, X11 |
| **[6] Archlinux WSL** | Arch Linux no Windows Subsystem | WSL, desenvolvimento cruzado |
| **[7] Archlinux DE** | Arch Linux + Desktop Environment | Ambiente desktop tradicional |

## 🏗️ Arquitetura do Sistema

### Estrutura Modular
Cada distribuição tem seu próprio diretório de setup com scripts especializados:

```
setup/
├── ubuntu/          # Scripts Ubuntu (base.sh, devel.sh, apps.sh, terminal.sh)
├── ArchHypr/        # Arch + Hyprland (base.sh, apps.sh, fonts.sh, terminal.sh)
├── ArchI3wm/        # Arch + i3wm (base.sh, apps.sh, fonts.sh, terminal.sh)
├── ArchWSL/         # Arch WSL (base.sh, apps.sh, terminal.sh)
└── ArchDE/          # Arch Desktop Environment (base.sh, apps.sh, fonts.sh, terminal.sh)
```

### Scripts Especializados
- **`pyenv_install.sh`**: Gerenciamento de versões Python
- **`install_golang.sh`**: Instalação do Go
- **`install_hacktools.sh`**: Ferramentas de segurança
- **`terminal.sh`**: Configuração de terminal
- **`copy_dots.sh`**: Cópia de arquivos de configuração

## 🛠️ Funcionalidades Incluídas

### Desenvolvimento
- **Python**: pyenv para múltiplas versões
- **Go**: Instalação e configuração
- **Neovim**: Editor moderno com Lua
- **Git**: Configurações otimizadas
- **Tmux**: Multiplexador de terminal

### Terminal & Shell
- **ZSH**: Shell com Powerlevel10k
- **Kitty**: Terminal GPU-accelerated
- **WezTerm**: Terminal moderno
- **Ghostty**: Terminal Wayland-native
- **Fish**: Shell alternativa

### Window Managers
- **Hyprland**: Wayland compositor
- **i3wm**: Tiling window manager
- **Qtile**: Window manager Python
- **Waybar**: Status bar para Wayland

### Ferramentas de Segurança
- **Nuclei**: Scanner de vulnerabilidades
- **Custom templates**: Templates personalizados
- **Recon tools**: Ferramentas de reconnaissance
- **MongoDB integration**: Database para resultados

### Temas & Aparência
- **Catppuccin**: Tema moderno
- **Tokyo Night**: Tema dark
- **Cyberdream**: Tema cyberpunk
- **Oxocarbon**: Tema minimalista

## 📁 Estrutura de Configuração

```
config/
├── zsh/              # Configurações ZSH
│   ├── functions.zsh    # Funções personalizadas
│   ├── alias.zsh        # Aliases
│   ├── custom.zsh       # Configurações customizadas
│   └── .zshrc           # Arquivo principal
├── kitty/            # Temas Kitty
├── wezterm/          # Configurações WezTerm
├── hypr/             # Configuração Hyprland
├── i3/               # Configuração i3wm
├── nvim/             # Configuração Neovim
└── themes/           # Temas adicionais
```

## 🔧 Configurações ZSH

### Arquivos de Função
- **[`functions.zsh`](./config/zsh/functions.zsh)**: Funções utilitárias
- **[`custom.zsh`](./config/zsh/custom.zsh)**: Fluxos de trabalho personalizados
- **[`alias.zsh`](./config/zsh/alias.zsh)**: Aliases para produtividade

## 📖 Guia de Uso

### Setup Ubuntu VPS (Opção 1)
Ideal para servidores e desenvolvimento web:
```bash
./install.sh # Escolher opção 1
```

### Setup Arch Linux com Hyprland (Opção 2)
Desktop moderno com Wayland:
```bash
./install.sh # Escolher opção 2
```

### Instalação de Ferramentas de Segurança (Opção 3)
```bash
./install.sh # Escolher opção 3
```

### Ambiente Python (Opção 4)
```bash
./install.sh # Escolher opção 4
```

## 🎯 Bug Bounty Recon Toolkit

Este dotfiles inclui um **toolkit completo de reconhecimento** para bug bounty hunters, com funções ZSH modulares que automatizam o fluxo de recon.

### Fluxo de Reconhecimento

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           RECON WORKFLOW                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  workspaceRecon "target.com"   ← Cria workspace: target.com/YYYY-MM-DD/  │
│         │                                                                │
│         ▼                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    SUBDOMAIN ENUMERATION                           │  │
│  │  subdomainenum     → subfinder, amass, crt.sh → dnsx resolve       │  │
│  │  subPermutation    → alterx + puredns (permutations)               │  │
│  │  Output: clean.subdomains                                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│         │                                                                │
│         ▼                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                        PORT SCANNING                               │  │
│  │  naabuRecon        → Top 100 ports scan                            │  │
│  │  naabuFullPorts    → Full port range (excl. common)                │  │
│  │  Output: naabuScan                                                 │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│         │                                                                │
│         ▼                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                        HTTP PROBING                                │  │
│  │  getalive          → httpx probe, categoriza por status code       │  │
│  │  Output: ALLHTTP, 200HTTP, 403HTTP, Without404                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│         │                                                                │
│         ▼                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                       CRAWLING & DATA                              │  │
│  │  crawler           → gospider, waybackurls, gau, katana            │  │
│  │  JScrawler         → JavaScript file discovery                     │  │
│  │  getjsurls         → JS URL extraction + validation                │  │
│  │  secretfinder      → Secrets in JS files                           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│         │                                                                │
│         ▼                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    VULNERABILITY SCANNING                          │  │
│  │  Nuclei Scans      → exposureNuc, GitScan, XssScan, nucTakeover    │  │
│  │  xsshunter         → Multi-tool XSS detection                      │  │
│  │  bypass4xx         → 403/401 bypass attempts                       │  │
│  │  prototypefuzz     → Prototype pollution testing                   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Funções Disponíveis

#### 🔍 Subdomain Enumeration (`functions/recon.zsh`)

| Função | Descrição | Input | Output |
|--------|-----------|-------|--------|
| `workspaceRecon <domain>` | Cria workspace organizado por data | domain | `domain/YYYY-MM-DD/` |
| `wellSubRecon` | Pipeline completo de subdomain enum | `domains` | `clean.subdomains` |
| `subdomainenum` | Enum passivo (subfinder, amass, crt.sh) | `domains` | `all.subdomains`, `clean.subdomains` |
| `subPermutation` | Gera permutações com alterx + puredns | `clean.subdomains` | `permutations.txt` |
| `subtakeover` | Detecta subdomain takeover | `clean.subdomains` | `subtakeover.txt` |

#### 🌐 Port Scanning & HTTP Probing (`functions/scanning.zsh`)

| Função | Descrição | Input | Output |
|--------|-----------|-------|--------|
| `naabuRecon` | Port scan top 100 portas | `clean.subdomains` | `naabuScan` |
| `naabuFullPorts` | Port scan completo | `clean.subdomains` | `full_ports.txt` |
| `getalive` | HTTP probe + categorização | `naabuScan` | `ALLHTTP`, `200HTTP`, `403HTTP` |
| `screenshot` | Screenshots com aquatone | `ALLHTTP` | `aqua_out/` |

#### 🕷️ Crawling & Data Collection (`functions/crawling.zsh`)

| Função | Descrição | Input | Output |
|--------|-----------|-------|--------|
| `crawler` | Multi-tool crawler | `Without404` | `crawlerResults.txt` |
| `JScrawler` | Descobre arquivos JS | `200HTTP` | `crawlJS`, `JSroot/` |
| `getjsurls` | Extrai e valida URLs JS | `crawlerResults.txt` | `js_livelinks.txt` |
| `secretfinder` | Busca secrets em JS | `js_livelinks.txt` | `js_secrets_result` |
| `getdata` | Salva todas as responses | `ALLHTTP` | `AllHttpData/` |

#### ⚡ Nuclei Workflows (`functions/nuclei.zsh`)

| Função | Descrição | Tags/Template |
|--------|-----------|---------------|
| `exposureNuc` | Detecta exposições | `exposure` |
| `GitScan` | Detecta .git exposto | `git` |
| `XssScan` | Scan XSS | `xss` |
| `nucTakeover` | Subdomain takeover | `takeover` |
| `graphqldetect` | Detecta endpoints GraphQL | `graphql-detect` |
| `swaggerUIdetect` | Detecta Swagger UI | `swagger` |
| `APIRecon` | Recon de APIs | custom workflow |
| `OpenRedirectScan` | Open redirect | `redirect` |
| `lfiScan` | LFI vulnerabilities | `lfi` |

#### 🔓 Vulnerability Scanning (`functions/vulns.zsh`)

| Função | Descrição | Input | Output |
|--------|-----------|-------|--------|
| `xsshunter` | XSS multi-scanner (airixss, freq, xsstrike) | `domains` | `airixss.txt`, `FreqXSS.txt` |
| `bypass4xx` | Bypass 403/401 | `403HTTP` | `4xxbypass.txt` |
| `prototypefuzz` | Prototype pollution | `ALLHTTP` | notifications |
| `Corstest` | CORS misconfiguration | `roots` | `CORSHTTP` |
| `smuggling` | HTTP Request Smuggling | `hosts` | `smuggler_op.txt` |
| `fufdir <url>` | Directory fuzzing | URL | stdout |
| `fufapi <url>` | API endpoint fuzzing | URL | stdout |

#### 🛠️ Utilities (`functions/utils.zsh`)

| Função | Descrição |
|--------|-----------|
| `getfreshresolvers` | Baixa lista atualizada de resolvers DNS |
| `getalltxt` | Baixa wordlist all.txt do jhaddix |
| `certspotter <domain>` | Busca subdomains via CertSpotter |
| `crtsh <domain>` | Busca subdomains via crt.sh |
| `ipinfo <ip>` | Informações de IP via ipinfo.io |

### Workflows Prontos (`custom.zsh`)

```bash
# Recon completo automatizado
wellRecon

# Recon com foco em APIs
newRecon

# Apenas Nuclei scans
wellNuclei
```

### Exemplo de Uso

```bash
# 1. Setup workspace
workspaceRecon example.com

# 2. Subdomain enumeration completo (inclui permutations)
wellSubRecon

# 3. Port scan + HTTP probe
naabuRecon
getalive

# 4. Crawling e coleta de JS
crawler
getjsurls
secretfinder

# 5. Vulnerability scanning
exposureNuc
XssScan
nucTakeover
bypass4xx
```

## 🔒 Segurança e Hacking Tools

O sistema inclui uma vasta coleção de ferramentas para:
- **Web Application Security**
- **Network Reconnaissance**
- **Vulnerability Assessment**
- **Penetration Testing**
- **Custom Nuclei Templates**

## 🛠️ Personalização

### Adicionando Novas Distribuições
1. Criar diretório em `setup/`
2. Adicionar scripts base.sh, apps.sh, terminal.sh
3. Atualizar menu em install.sh
4. Documentar mudanças

### Modificando Configurações
- Editar arquivos em `config/`
- Scripts de setup copiam automaticamente
- Testar mudanças antes de commitar

## 🌐 Idiomas / Languages

- [English](./README_EN.md) - English version
- [Português (Brasileiro)](./README.md) - Versão em português

## 🤝 Contribuição / Contributing

1. Fork o projeto / Fork the project
2. Criar branch para feature (`git checkout -b feature/AmazingFeature`) / Create a feature branch
3. Commit mudanças (`git commit -m 'Add some AmazingFeature'`) / Commit your changes
4. Push branch (`git push origin feature/AmazingFeature`) / Push to the branch
5. Abrir Pull Request / Open a Pull Request

## 📝 Licença

Este projeto está sob licença MIT. Veja o arquivo [`LICENSE`](./LICENSE) para mais detalhes.

## 👤 Autor

**Wellington Moraes**

---

<h6 align="center">
	<a href="https://raw.githubusercontent.com/mswell/dotfiles/master/LICENSE">MIT</a>
	© 2024
	Wellington Moraes
</h6>