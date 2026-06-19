#!/usr/bin/env bash
# web-browser Skill Installer
# Installs the skill and runs npm install for its CDP helper script deps.

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

SKILL_NAME="web-browser"
DEFAULT_PATHS=(
    "$HOME/.claude/skills"
    "$HOME/.config/claude/skills"
    "$HOME/.local/share/claude/skills"
)

CUSTOM_PATH=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --path) CUSTOM_PATH="$2"; shift 2 ;;
        --help|-h)
            echo "web-browser Skill Installer"
            echo "Usage: $0 [--path PATH]"
            exit 0 ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        web-browser Skill Installer             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

INSTALL_PATH=""
if [[ -n "$CUSTOM_PATH" ]]; then
    INSTALL_PATH="$CUSTOM_PATH"
else
    for path in "${DEFAULT_PATHS[@]}"; do
        [[ -d "$path" ]] && { INSTALL_PATH="$path"; break; }
    done
    [[ -z "$INSTALL_PATH" ]] && INSTALL_PATH="${DEFAULT_PATHS[0]}"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SOURCE="$SCRIPT_DIR"
TARGET="$INSTALL_PATH/$SKILL_NAME"

echo -e "${BLUE}Source:${NC} $SKILL_SOURCE"
echo -e "${BLUE}Target:${NC} $TARGET"
echo ""

[[ -f "$SKILL_SOURCE/SKILL.md" ]] || { echo -e "${RED}Error: Cannot find SKILL.md in $SKILL_SOURCE${NC}"; exit 1; }

mkdir -p "$INSTALL_PATH"

if [[ -d "$TARGET" ]]; then
    echo -e "${YELLOW}Skill already exists. Updating (preserving scripts/node_modules)...${NC}"
    find "$TARGET" -mindepth 1 -maxdepth 1 ! -name 'scripts' -exec rm -rf {} +
    if [[ -d "$TARGET/scripts" ]]; then
        find "$TARGET/scripts" -mindepth 1 -maxdepth 1 ! -name 'node_modules' -exec rm -rf {} +
    fi
fi

mkdir -p "$TARGET"
( cd "$SKILL_SOURCE" && tar --exclude='./scripts/node_modules' --exclude='./node_modules' --exclude='./install.sh' -cf - . ) | ( cd "$TARGET" && tar -xf - )
chmod +x "$TARGET"/scripts/*.js 2>/dev/null || true

if [[ -f "$TARGET/scripts/package.json" ]]; then
    if command -v npm >/dev/null 2>&1; then
        echo -e "${BLUE}Installing npm dependencies...${NC}"
        ( cd "$TARGET/scripts" && npm install --no-audit --no-fund ) \
            && echo -e "${GREEN}✓ npm dependencies installed${NC}" \
            || { echo -e "${RED}✗ npm install failed${NC}"; exit 1; }
    else
        echo -e "${YELLOW}[!] npm not found — run 'npm install' in $TARGET/scripts manually${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✓ web-browser installed to: $TARGET${NC}"
echo ""
echo -e "${YELLOW}Notes:${NC}"
echo "  • Requires Chrome/Chromium installed."
echo "  • Start with: $TARGET/scripts/start.js [--profile]"
echo ""
