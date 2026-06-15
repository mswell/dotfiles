#!/usr/bin/env bash
#
# browser-tools Skill Installer
# Installs the skill and runs `npm install` for its puppeteer-core deps.
# Cross-platform (Linux/macOS).
#
# Usage: ./install.sh [--path /custom/skills/dir]
#

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

SKILL_NAME="browser-tools"

DEFAULT_PATHS=(
    "$HOME/.claude/skills"
    "$HOME/.config/claude/skills"
    "$HOME/.local/share/claude/skills"
)

CUSTOM_PATH=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --path) CUSTOM_PATH="$2"; shift 2 ;;
        --help|-h)
            echo "browser-tools Skill Installer"
            echo "Usage: $0 [--path PATH]"
            exit 0 ;;
        *) echo -e "${RED}Unknown option: $1${NC}"; exit 1 ;;
    esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       browser-tools Skill Installer            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Determine installation path
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

if [[ ! -f "$SKILL_SOURCE/SKILL.md" ]]; then
    echo -e "${RED}Error: Cannot find SKILL.md in $SKILL_SOURCE${NC}"
    exit 1
fi

TARGET="$INSTALL_PATH/$SKILL_NAME"
echo -e "${BLUE}Source:${NC} $SKILL_SOURCE"
echo -e "${BLUE}Target:${NC} $TARGET"
echo ""

mkdir -p "$INSTALL_PATH"

# Preserve existing node_modules to avoid a full reinstall when updating.
if [[ -d "$TARGET" ]]; then
    echo -e "${YELLOW}Skill already exists. Updating (preserving node_modules)...${NC}"
    find "$TARGET" -maxdepth 1 -mindepth 1 ! -name 'node_modules' -exec rm -rf {} +
fi

mkdir -p "$TARGET"
for f in "$SKILL_SOURCE"/*.js "$SKILL_SOURCE"/SKILL.md "$SKILL_SOURCE"/package.json "$SKILL_SOURCE"/.gitignore; do
    [[ -e "$f" ]] && cp "$f" "$TARGET"/
done
rm -f "$TARGET/install.sh"
chmod +x "$TARGET"/*.js 2>/dev/null || true

# Install npm deps (puppeteer-core etc.)
if command -v npm >/dev/null 2>&1; then
    echo -e "${BLUE}Installing npm dependencies...${NC}"
    ( cd "$TARGET" && npm install --no-audit --no-fund ) \
        && echo -e "${GREEN}✓ npm dependencies installed${NC}" \
        || { echo -e "${RED}✗ npm install failed${NC}"; exit 1; }
else
    echo -e "${YELLOW}[!] npm not found — run 'npm install' in $TARGET manually${NC}"
fi

echo ""
echo -e "${GREEN}✓ browser-tools installed to: $TARGET${NC}"
echo ""
echo -e "${YELLOW}Notes:${NC}"
echo "  • Requires a Chrome/Chromium/Brave/Edge browser installed."
echo "  • Arch: sudo pacman -S chromium   (or install google-chrome)"
echo "  • Start with: $TARGET/browser-start.js [--profile]"
echo ""
