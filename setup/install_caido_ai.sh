#!/usr/bin/env bash
# =============================================================================
# install_caido_ai.sh
# Instala o caido/skills (Claude Code) e o caido-mcp-server (Go binary)
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

# ── Config padrão (sobrescreva via env) ───────────────────────────────────────
CAIDO_URL="${CAIDO_URL:-http://127.0.0.1:8080}"
MCP_INSTALL_DIR="${MCP_INSTALL_DIR:-$HOME/.local/bin}"
MCP_REPO="https://github.com/c0tton-fluff/caido-mcp-server.git"
MCP_BIN="caido-mcp-server"
CLAUDE_CONFIG="${CLAUDE_CONFIG:-$HOME/.claude.json}"

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "╔═══════════════════════════════════════════╗"
echo "║        Caido AI Setup — Bug Bounty        ║"
echo "║   caido/skills  +  caido-mcp-server       ║"
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
check_cmd go
check_cmd node
check_cmd jq

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

# ── 3. caido-mcp-server (Go binary) ──────────────────────────────────────────
info "Compilando caido-mcp-server..."

mkdir -p "$MCP_INSTALL_DIR"
TMP_MCP=$(mktemp -d)

git clone --depth=1 "$MCP_REPO" "$TMP_MCP" \
    || die "Falha ao clonar $MCP_REPO"

pushd "$TMP_MCP" > /dev/null

info "Rodando go build..."
go build -o "$MCP_INSTALL_DIR/$MCP_BIN" . \
    || die "Falha no go build. Verifique sua versão do Go (requer >= 1.21)."

popd > /dev/null
rm -rf "$TMP_MCP"

chmod +x "$MCP_INSTALL_DIR/$MCP_BIN"
success "Binário instalado em $MCP_INSTALL_DIR/$MCP_BIN"

# Garante que o diretório está no PATH
if [[ ":$PATH:" != *":$MCP_INSTALL_DIR:"* ]]; then
    warn "$MCP_INSTALL_DIR não está no PATH"
    echo "  Adicione ao seu ~/.bashrc ou ~/.zshrc:"
    echo -e "  ${CYAN}export PATH=\"\$PATH:$MCP_INSTALL_DIR\"${NC}"
fi

echo ""

# ── 4. Configura ~/.claude.json (MCP server entry) ────────────────────────────
info "Configurando MCP server em $CLAUDE_CONFIG..."

if [ ! -f "$CLAUDE_CONFIG" ]; then
    echo '{}' > "$CLAUDE_CONFIG"
    info "Arquivo $CLAUDE_CONFIG criado"
fi

if ! jq empty "$CLAUDE_CONFIG" 2>/dev/null; then
    die "$CLAUDE_CONFIG contém JSON inválido. Corrija manualmente antes de continuar."
fi

UPDATED=$(jq \
    --arg bin "$MCP_INSTALL_DIR/$MCP_BIN" \
    --arg url "$CAIDO_URL" \
    '
    .mcpServers //= {} |
    .mcpServers.caido = {
        "command": $bin,
        "args": ["serve"],
        "env": {
            "CAIDO_URL": $url
        }
    }
    ' "$CLAUDE_CONFIG")

echo "$UPDATED" > "$CLAUDE_CONFIG"
success "Entrada 'caido' adicionada em mcpServers"

echo ""

# ── 5. Autenticação via loginAsGuest (token local) ───────────────────────────
info "Configurando autenticação do caido-mcp-server..."
echo ""

TOKEN_DIR="$HOME/.caido-mcp"
TOKEN_FILE="$TOKEN_DIR/token.json"
mkdir -p "$TOKEN_DIR"
chmod 700 "$TOKEN_DIR"

# Tenta loginAsGuest direto na instância local (não depende de WebSocket)
info "Tentando loginAsGuest na instância Caido em $CAIDO_URL..."
GUEST_RESPONSE=$(/usr/bin/curl -sf --max-time 5 -X POST "$CAIDO_URL/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query":"mutation { loginAsGuest { token { accessToken expiresAt } error { ... on GuestAuthenticationError { code } } } }"}' 2>/dev/null || true)

GUEST_TOKEN=$(echo "$GUEST_RESPONSE" | /usr/bin/python3 -c "
import json,sys
d = json.load(sys.stdin)
t = d.get('data',{}).get('loginAsGuest',{}).get('token')
if t and t.get('accessToken'):
    print(t['accessToken'] + '|' + t.get('expiresAt','2099-01-01T00:00:00Z'))
" 2>/dev/null || true)

if [ -n "$GUEST_TOKEN" ]; then
    ACCESS_TOKEN="${GUEST_TOKEN%|*}"
    EXPIRES_AT="${GUEST_TOKEN#*|}"
    printf '{\n  "accessToken": "%s",\n  "refreshToken": "",\n  "expiresAt": "%s"\n}\n' \
        "$ACCESS_TOKEN" "$EXPIRES_AT" > "$TOKEN_FILE"
    chmod 600 "$TOKEN_FILE"
    success "Token de guest obtido e salvo em $TOKEN_FILE (expira: $EXPIRES_AT)"
    warn "Token de guest expira em ~7 dias. Rode este script novamente para renovar."
else
    warn "loginAsGuest falhou. Caido não está rodando ou guests não estão habilitados."
    warn "Inicie o Caido e rode: curl -X POST $CAIDO_URL/graphql -H 'Content-Type: application/json' -d '{\"query\":\"mutation { loginAsGuest { token { accessToken expiresAt } } }\"}'"
fi

echo ""

# ── 6. Teste de conectividade ──────────────────────────────────────────────────
info "Testando conectividade com Caido em $CAIDO_URL..."
if curl -sf --max-time 3 "$CAIDO_URL" &>/dev/null; then
    success "Caido acessível em $CAIDO_URL"
else
    warn "Caido não está respondendo em $CAIDO_URL — inicie antes de usar o MCP."
fi

echo ""
