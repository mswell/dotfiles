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
check_cmd npm

# pnpm preferido para instalar deps; npm como fallback
if command -v pnpm &>/dev/null; then
    PKG_INSTALL="pnpm install --frozen-lockfile"
    success "pnpm encontrado"
elif command -v npm &>/dev/null; then
    PKG_INSTALL="npm install"
    warn "pnpm não encontrado, usando npm como fallback"
else
    die "Nem pnpm nem npm encontrados. Instale Node.js."
fi

echo ""

# ── 2. caido/skills (Claude Code Agent Skills) ────────────────────────────────
# O CLI `skills add` instala em .agents/skills/ relativo ao CWD, ignorando
# qualquer path customizado. Por isso usamos git clone direto no destino certo.
info "Instalando caido/skills para Claude Code..."

SKILLS_TARGET="$HOME/.claude/skills"
CAIDO_TARGET="$SKILLS_TARGET/caido-mode"
mkdir -p "$SKILLS_TARGET"

TMP_SKILLS=$(mktemp -d)
trap 'rm -rf "$TMP_SKILLS"' EXIT

info "Clonando caido/skills..."
git clone --depth=1 https://github.com/caido/skills.git "$TMP_SKILLS" \
    || die "Falha ao clonar caido/skills"

if [ ! -d "$TMP_SKILLS/skills/caido-mode" ]; then
    die "Estrutura inesperada no repo caido/skills (skills/caido-mode não encontrado)"
fi

rm -rf "$CAIDO_TARGET"
cp -r "$TMP_SKILLS/skills/caido-mode" "$CAIDO_TARGET"
success "caido-mode copiado para $CAIDO_TARGET"

info "Instalando dependências Node.js..."
(cd "$CAIDO_TARGET" && $PKG_INSTALL) \
    || die "Falha ao instalar dependências em $CAIDO_TARGET"

success "caido/skills instalado com sucesso em $CAIDO_TARGET"

echo ""
