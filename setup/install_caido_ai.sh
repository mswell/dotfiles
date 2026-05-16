#!/usr/bin/env bash
# =============================================================================
# install_caido_ai.sh
# Instala o caido/skills oficial usando o fluxo padrão do projeto upstream.
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
echo "║         caido/skills (official)           ║"
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

check_cmd node
check_cmd npm

# O README oficial do caido/skills usa pnpm dlx skills add caido/skills --skill='*' -g
if command -v pnpm &>/dev/null; then
    success "pnpm encontrado: $(command -v pnpm)"
else
    warn "pnpm não encontrado — instalando via npm..."
    npm install -g pnpm || die "Falha ao instalar pnpm via npm"
    export PATH="$(npm root -g)/../bin:$PATH"
    command -v pnpm &>/dev/null || die "pnpm instalado mas não encontrado no PATH"
    success "pnpm instalado: $(command -v pnpm)"
fi

echo ""

# ── 2. caido/skills pelo instalador oficial ───────────────────────────────────
info "Instalando caido/skills pelo comando oficial..."

# -g instala globalmente para Claude Code em ~/.claude/skills.
# Tentamos -y primeiro para setup não interativo; se a CLI não suportar, usamos stdin yes.
if pnpm dlx skills add caido/skills --skill='*' -g -y; then
    success "caido/skills instalado via pnpm dlx skills"
else
    warn "Instalação com -y falhou; tentando confirmação por stdin..."
    yes | pnpm dlx skills add caido/skills --skill='*' -g \
        || die "Falha ao instalar caido/skills pelo comando oficial"
    success "caido/skills instalado via pnpm dlx skills"
fi

# ── 3. Symlink para Pi ────────────────────────────────────────────────────────
CLAUDE_SKILLS_DIR="$HOME/.claude/skills"
PI_SKILLS_DIR="$HOME/.pi/agent/skills"

mkdir -p "$PI_SKILLS_DIR"

link_skill_to_pi() {
    local skill_name="$1"
    local claude_target="$CLAUDE_SKILLS_DIR/$skill_name"
    local pi_link="$PI_SKILLS_DIR/$skill_name"

    if [ ! -e "$claude_target" ]; then
        warn "Skill não encontrada no Claude após instalação: $claude_target"
        return 1
    fi

    if [ -L "$pi_link" ] && [ "$(readlink -f "$pi_link")" = "$(readlink -f "$claude_target")" ]; then
        success "Symlink Pi já correto: $pi_link"
        return 0
    fi

    if [ -e "$pi_link" ] && [ ! -L "$pi_link" ]; then
        warn "Já existe no Pi e não é symlink, preservando: $pi_link"
        return 0
    fi

    rm -f "$pi_link"
    ln -sfn "$claude_target" "$pi_link"
    success "Symlink Pi criado: $pi_link → $claude_target"
}

# Hoje o repo oficial instala caido-mode; se adicionar mais skills caido-* no futuro,
# espelha todas automaticamente para o Pi.
found_caido_skill=0
shopt -s nullglob
for skill_path in "$CLAUDE_SKILLS_DIR"/caido-* "$CLAUDE_SKILLS_DIR"/caido_mode "$CLAUDE_SKILLS_DIR"/caido-mode; do
    [ -e "$skill_path" ] || continue
    found_caido_skill=1
    link_skill_to_pi "$(basename "$skill_path")" || true
done
shopt -u nullglob

if [ "$found_caido_skill" -eq 0 ]; then
    warn "Nenhuma skill caido-* encontrada em $CLAUDE_SKILLS_DIR após instalação."
fi

success "caido/skills instalado com sucesso para Claude Code e Pi"
echo ""
