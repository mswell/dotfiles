#!/usr/bin/env bash
# =============================================================================
# install_skills.sh — Bug Bounty Skills
# Instala apenas as skills selecionadas: xp, tmux-pilot, security-audit
# =============================================================================

CLAUDE_SKILLS_DIR="$HOME/.claude/skills"
PI_SKILLS_DIR="$HOME/.pi/agent/skills"
SKILLS_DIR="$CLAUDE_SKILLS_DIR"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/Skills"

# Skills habilitadas para instalação
ENABLED_SKILLS=(xp tmux-pilot security-audit)

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

link_skill_to_pi() {
    local skill_name="$1"
    local claude_target="$CLAUDE_SKILLS_DIR/$skill_name"
    local pi_link="$PI_SKILLS_DIR/$skill_name"

    if [[ ! -e "$claude_target" ]]; then
        log_warn "Skill não encontrada para link no Pi: $claude_target"
        return 1
    fi

    mkdir -p "$PI_SKILLS_DIR"

    if [[ -L "$pi_link" ]] && [[ "$(readlink -f "$pi_link")" == "$(readlink -f "$claude_target")" ]]; then
        log_ok "Symlink Pi já correto: $pi_link"
        return 0
    fi

    if [[ -e "$pi_link" && ! -L "$pi_link" ]]; then
        log_warn "Já existe no Pi e não é symlink, preservando: $pi_link"
        return 1
    fi

    rm -f "$pi_link"
    ln -sfn "$claude_target" "$pi_link"
    log_ok "Symlink Pi: $pi_link -> $claude_target"
}

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo "${bold}${green}╔══════════════════════════════════════════════════╗${reset}"
echo "${bold}${green}║         Bug Bounty Skills — Setup                ║${reset}"
echo "${bold}${green}║    xp  +  tmux-pilot  +  security-audit          ║${reset}"
echo "${bold}${green}╚══════════════════════════════════════════════════╝${reset}"
echo ""

# ── Instalação das skills selecionadas ────────────────────────────────────────
log_info "Instalando skills: ${ENABLED_SKILLS[*]}"
echo ""

mkdir -p "$CLAUDE_SKILLS_DIR" "$PI_SKILLS_DIR"
log_ok "Claude skills directory: $CLAUDE_SKILLS_DIR"
log_ok "Pi skills directory: $PI_SKILLS_DIR"
echo ""

install_count=0
skip_count=0
fail_count=0

for skill_name in "${ENABLED_SKILLS[@]}"; do
    skill_dir="$SKILLS_SRC/$skill_name"

    echo "${yellow}---> Skill: $skill_name${reset}"

    if [[ ! -d "$skill_dir" ]]; then
        log_err "Diretório não encontrado: $skill_dir"
        ((fail_count++))
        echo ""
        continue
    fi

    if [[ -f "$skill_dir/install.sh" ]]; then
        if bash "$skill_dir/install.sh" --path "$SKILLS_DIR"; then
            log_ok "Instalado: $skill_name"
            link_skill_to_pi "$skill_name" || true
            ((install_count++))
        else
            log_err "Falhou: $skill_name"
            ((fail_count++))
        fi
    elif [[ -f "$skill_dir/SKILL.md" ]]; then
        mkdir -p "$SKILLS_DIR/$skill_name"
        cp -r "$skill_dir"/* "$SKILLS_DIR/$skill_name/"
        rm -f "$SKILLS_DIR/$skill_name/install.sh"
        log_ok "Copiado: $skill_name"
        link_skill_to_pi "$skill_name" || true
        ((install_count++))
    else
        log_warn "Sem SKILL.md, ignorando: $skill_name"
        ((skip_count++))
    fi

    echo ""
done

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
echo "  ${cyan}Claude skills dir :${reset} $CLAUDE_SKILLS_DIR"
echo "  ${cyan}Pi skills dir     :${reset} $PI_SKILLS_DIR"
echo ""
echo "${yellow}Próximos passos:${reset}"
echo "  1. Inicie o Claude Code: ${cyan}claude${reset}"
echo "  2. Use as skills normalmente"
echo ""
