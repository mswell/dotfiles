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
        die "'$1' não encontrado. Instale antes de continuar (rode a opção 5 primeiro)."
    fi
    success "$1 encontrado: $(command -v "$1")"
}

check_cmd git
check_cmd node
check_cmd npm

# Garante pnpm globalmente (necessário para `pnpm dlx skills add`)
if command -v pnpm &>/dev/null; then
    success "pnpm encontrado: $(command -v pnpm)"
else
    warn "pnpm não encontrado — instalando via npm..."
    npm install -g pnpm || die "Falha ao instalar pnpm via npm"
    # Recarrega PATH para encontrar o binário recém-instalado
    export PATH="$(npm root -g)/../bin:$PATH"
    command -v pnpm &>/dev/null || die "pnpm instalado mas não encontrado no PATH"
    success "pnpm instalado: $(command -v pnpm)"
fi

PKG_INSTALL="pnpm install --frozen-lockfile"

echo ""

# ── 2. caido/skills (Claude Code Agent Skills) ────────────────────────────────
# ~/.claude/skills/ é o diretório GLOBAL do Claude Code (disponível em qualquer projeto).
# Usamos ~/.agents/skills/caido-mode como fonte e criamos symlink global para lá.
info "Instalando caido/skills para Claude Code (global)..."

AGENTS_SKILLS_DIR="$HOME/.agents/skills"
AGENTS_CAIDO="$AGENTS_SKILLS_DIR/caido-mode"
GLOBAL_SKILLS_DIR="$HOME/.claude/skills"
GLOBAL_LINK="$GLOBAL_SKILLS_DIR/caido-mode"

mkdir -p "$AGENTS_SKILLS_DIR" "$GLOBAL_SKILLS_DIR"

# Clona/atualiza a skill em ~/.agents/skills/caido-mode
if [ -d "$AGENTS_CAIDO/.git" ]; then
    info "Atualizando caido/skills existente..."
    git -C "$AGENTS_CAIDO" pull --ff-only || warn "Não foi possível atualizar — continuando com versão atual"
else
    TMP_SKILLS=$(mktemp -d)
    trap 'rm -rf "$TMP_SKILLS"' EXIT

    info "Clonando caido/skills..."
    git clone --depth=1 https://github.com/caido/skills.git "$TMP_SKILLS" \
        || die "Falha ao clonar caido/skills"

    if [ ! -d "$TMP_SKILLS/skills/caido-mode" ]; then
        die "Estrutura inesperada no repo caido/skills (skills/caido-mode não encontrado)"
    fi

    rm -rf "$AGENTS_CAIDO"
    cp -r "$TMP_SKILLS/skills/caido-mode" "$AGENTS_CAIDO"
fi

success "caido-mode disponível em $AGENTS_CAIDO"

# Cria symlink global (substitui symlink antigo, preserva se já aponta correto)
if [ -L "$GLOBAL_LINK" ] && [ "$(readlink -f "$GLOBAL_LINK")" = "$(readlink -f "$AGENTS_CAIDO")" ]; then
    success "Symlink global já correto: $GLOBAL_LINK"
else
    rm -f "$GLOBAL_LINK"
    ln -sf "$AGENTS_CAIDO" "$GLOBAL_LINK"
    success "Symlink global criado: $GLOBAL_LINK → $AGENTS_CAIDO"
fi

info "Instalando dependências Node.js..."
(cd "$AGENTS_CAIDO" && $PKG_INSTALL) \
    || die "Falha ao instalar dependências em $AGENTS_CAIDO"

success "caido/skills instalado com sucesso (global)"

echo ""
