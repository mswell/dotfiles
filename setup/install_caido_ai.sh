#!/usr/bin/env bash
# =============================================================================
# install_caido_ai.sh
# Instala o caido/skills oficial (Claude Code Agent Skills)
# =============================================================================

set -euo pipefail

# ── Cores ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "╔═══════════════════════════════════════════╗"
echo "║        Caido AI Setup — Bug Bounty        ║"
echo "║         caido/skills (official)            ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Dependências ───────────────────────────────────────────────────────────
info "Verificando dependências..."

check_cmd() {
    if ! command -v "$1" &>/dev/null; then
        die "'$1' não encontrado. Instale antes de continuar."
    fi
    success "$1 encontrado: $(command -v "$1")"
}

check_cmd git
check_cmd node

# pnpm ou npx como fallback
if command -v pnpm &>/dev/null; then
    PKG_RUNNER="pnpm dlx"
    success "pnpm encontrado"
elif command -v npx &>/dev/null; then
    PKG_RUNNER="npx"
    warn "pnpm não encontrado, usando npx como fallback"
else
    die "Nem pnpm nem npx encontrados. Instale Node.js/pnpm."
fi

echo ""

# ── 2. caido/skills (Claude Code Agent Skills) ────────────────────────────────
info "Instalando caido/skills para Claude Code..."

SKILLS_TARGET="$HOME/.claude/skills"
mkdir -p "$SKILLS_TARGET"

# Usa pnpx/npx para instalar via CLI do Agent Skills
if $PKG_RUNNER skills add caido/skills --skill='*' 2>&1 | tee /tmp/skills_install.log; then
    success "caido/skills instalado com sucesso"
else
    # Fallback: clone manual e copia os arquivos
    warn "CLI do skills falhou, tentando instalação manual..."

    TMP_SKILLS=$(mktemp -d)
    git clone --depth=1 https://github.com/caido/skills.git "$TMP_SKILLS" 2>/dev/null \
        || die "Falha ao clonar caido/skills"

    if [ -d "$TMP_SKILLS/skills/caido-mode" ]; then
        cp -r "$TMP_SKILLS/skills/caido-mode" "$SKILLS_TARGET/"
        success "caido-mode copiado para $SKILLS_TARGET"
    else
        warn "Estrutura inesperada no repo. Verifique $TMP_SKILLS manualmente."
    fi
    rm -rf "$TMP_SKILLS"
fi

echo ""
