#!/usr/bin/env bash
# =============================================================================
# install_skills.sh — Claude for Bug Bounty
# Instala todas as Skills locais + Caido AI (skills + MCP server)
# =============================================================================

SKILLS_DIR="$HOME/.claude/skills"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/Skills"

# Colors
green=$(tput setaf 2 2>/dev/null || echo "")
yellow=$(tput setaf 3 2>/dev/null || echo "")
red=$(tput setaf 1 2>/dev/null || echo "")
cyan=$(tput setaf 6 2>/dev/null || echo "")
bold=$(tput bold 2>/dev/null || echo "")
reset=$(tput sgr0 2>/dev/null || echo "")

log_ok()   { echo "${green}[+]${reset} $*"; }
log_warn() { echo "${yellow}[!]${reset} $*"; }
log_err()  { echo "${red}[-]${reset} $*"; }
log_info() { echo "${cyan}[*]${reset} $*"; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo "${bold}${green}╔══════════════════════════════════════════════════╗${reset}"
echo "${bold}${green}║         Claude for Bug Bounty — Setup            ║${reset}"
echo "${bold}${green}║  Local Skills  +  Agents  +  Caido AI (MCP)     ║${reset}"
echo "${bold}${green}╚══════════════════════════════════════════════════╝${reset}"
echo ""

# ── Fase 1: Skills locais ─────────────────────────────────────────────────────
log_info "Fase 1/2 — Instalando Skills locais..."
echo ""

mkdir -p "$SKILLS_DIR"
log_ok "Skills directory: $SKILLS_DIR"
echo ""

install_count=0
skip_count=0
fail_count=0

for skill_dir in "$SKILLS_SRC"/*/; do
    skill_name=$(basename "$skill_dir")

    # AgentsSkillsBugBounty tem script próprio — tratado depois
    if [[ "$skill_name" == "AgentsSkillsBugBounty" ]]; then
        continue
    fi

    echo "${yellow}---> Skill: $skill_name${reset}"

    if [[ -f "$skill_dir/install.sh" ]]; then
        if bash "$skill_dir/install.sh" --path "$SKILLS_DIR"; then
            log_ok "Instalado: $skill_name"
            ((install_count++))
        else
            log_err "Falhou: $skill_name"
            ((fail_count++))
        fi
    elif [[ -f "$skill_dir/SKILL.md" ]]; then
        mkdir -p "$SKILLS_DIR/$skill_name"
        cp -r "$skill_dir"* "$SKILLS_DIR/$skill_name/"
        rm -f "$SKILLS_DIR/$skill_name/install.sh"
        log_ok "Copiado: $skill_name"
        ((install_count++))
    else
        log_warn "Sem SKILL.md, ignorando: $skill_name"
        ((skip_count++))
    fi

    echo ""
done

# Hybrid Agents (AgentsSkillsBugBounty)
agents_setup="$SKILLS_SRC/AgentsSkillsBugBounty/setup-hybrid-bugbounty.sh"
if [[ -f "$agents_setup" ]]; then
    echo "${yellow}---> Agents: AgentsSkillsBugBounty${reset}"
    if bash "$agents_setup"; then
        log_ok "Instalado: AgentsSkillsBugBounty"
        ((install_count++))
    else
        log_err "Falhou: AgentsSkillsBugBounty"
        ((fail_count++))
    fi
    echo ""
fi

# ── Fase 2: Caido AI (skills + MCP server) ────────────────────────────────────
echo "${bold}${green}────────────────────────────────────────────────────${reset}"
log_info "Fase 2/2 — Instalando Caido AI (skills + MCP server)..."
echo ""

CAIDO_INSTALLER="$SCRIPT_DIR/install_caido_ai.sh"

if [[ ! -f "$CAIDO_INSTALLER" ]]; then
    log_err "install_caido_ai.sh não encontrado em $SCRIPT_DIR"
    ((fail_count++))
else
    if bash "$CAIDO_INSTALLER"; then
        log_ok "Caido AI instalado com sucesso"
        ((install_count++))
    else
        log_err "Falha na instalação do Caido AI"
        ((fail_count++))
    fi
fi

# ── Resumo ────────────────────────────────────────────────────────────────────
echo ""
echo "${bold}${green}╔══════════════════════════════════════════════════╗${reset}"
echo "${bold}${green}║               Instalação concluída!              ║${reset}"
echo "${bold}${green}╚══════════════════════════════════════════════════╝${reset}"
echo ""
echo "  Skills instaladas  : ${green}$install_count${reset}"
[[ $skip_count -gt 0 ]] && echo "  Ignoradas          : ${yellow}$skip_count${reset}"
[[ $fail_count -gt 0 ]] && echo "  Falhas             : ${red}$fail_count${reset}"
echo ""
echo "  ${cyan}Skills dir :${reset} $SKILLS_DIR"
echo "  ${cyan}Agents dir :${reset} $HOME/.claude/agents"
echo "  ${cyan}MCP binary :${reset} $HOME/.local/bin/caido-mcp-server"
echo "  ${cyan}Claude cfg :${reset} $HOME/.claude.json"
echo ""
echo "${yellow}Próximos passos:${reset}"
echo "  1. Abra o Caido e capture requests do alvo"
echo "  2. Inicie o Claude Code: ${cyan}claude${reset}"
echo "  3. Use as skills de bug bounty normalmente"
echo ""
