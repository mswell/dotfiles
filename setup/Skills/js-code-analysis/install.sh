#!/bin/bash
#
# JS Code Analysis Skill Installer
# Installs the skill globally for Claude Code
#
# Usage: ./install.sh [--path /custom/path]
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SKILL_NAME="js-code-analysis"

DEFAULT_PATHS=(
    "$HOME/.claude/skills"
    "$HOME/.config/claude/skills"
    "$HOME/.local/share/claude/skills"
)

CUSTOM_PATH=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --path)
            CUSTOM_PATH="$2"
            shift 2
            ;;
        --help|-h)
            echo "JS Code Analysis Skill Installer"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --path PATH    Install to custom path"
            echo "  --help, -h     Show this help message"
            echo ""
            echo "Default paths (checked in order):"
            for p in "${DEFAULT_PATHS[@]}"; do
                echo "  - $p"
            done
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     JS Code Analysis Skill Installer           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "This skill requires Node.js for running analysis scripts."
    exit 1
fi

if ! command -v ast-grep &> /dev/null; then
    echo -e "${YELLOW}Warning: ast-grep is not installed globally.${NC}"
    echo "The skill will attempt to use 'npx ast-grep' instead."
fi

INSTALL_PATH=""

if [[ -n "$CUSTOM_PATH" ]]; then
    INSTALL_PATH="$CUSTOM_PATH"
    echo -e "${YELLOW}Using custom path: $INSTALL_PATH${NC}"
else
    for path in "${DEFAULT_PATHS[@]}"; do
        if [[ -d "$path" ]]; then
            INSTALL_PATH="$path"
            echo -e "${GREEN}Found existing skills directory: $INSTALL_PATH${NC}"
            break
        fi
    done
    
    if [[ -z "$INSTALL_PATH" ]]; then
        INSTALL_PATH="${DEFAULT_PATHS[0]}"
        echo -e "${YELLOW}Creating new skills directory: $INSTALL_PATH${NC}"
    fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SOURCE="$SCRIPT_DIR"

if [[ ! -f "$SKILL_SOURCE/SKILL.md" ]]; then
    if [[ -f "$SCRIPT_DIR/$SKILL_NAME/SKILL.md" ]]; then
        SKILL_SOURCE="$SCRIPT_DIR/$SKILL_NAME"
    else
        echo -e "${RED}Error: Cannot find SKILL.md${NC}"
        echo "Make sure you're running this script from the skill directory"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}Source:${NC} $SKILL_SOURCE"
echo -e "${BLUE}Target:${NC} $INSTALL_PATH/$SKILL_NAME"
echo ""

mkdir -p "$INSTALL_PATH"

if [[ -d "$INSTALL_PATH/$SKILL_NAME" ]]; then
    echo -e "${YELLOW}Skill already exists. Updating...${NC}"
    rm -rf "$INSTALL_PATH/$SKILL_NAME"
fi

echo -e "${BLUE}Installing skill files...${NC}"

cp -r "$SKILL_SOURCE" "$INSTALL_PATH/$SKILL_NAME"

rm -f "$INSTALL_PATH/$SKILL_NAME/install.sh"

if [[ -d "$INSTALL_PATH/$SKILL_NAME/scripts" ]]; then
    chmod +x "$INSTALL_PATH/$SKILL_NAME/scripts/"*.js 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}✓ Skill installed successfully!${NC}"
echo ""

echo -e "${BLUE}Verifying installation...${NC}"

REQUIRED_FILES=(
    "SKILL.md"
    "references/vulnerability-patterns.md"
    "references/escalation-guide.md"
    "references/h1-examples.md"
    "references/patterns/prototype-pollution.yaml"
    "references/patterns/idor.yaml"
    "references/patterns/ssrf.yaml"
    "references/patterns/command-injection.yaml"
    "references/patterns/nosql-injection.yaml"
    "scripts/analyze.js"
    "scripts/check_safety.js"
    "scripts/pattern_validator.js"
    "tests/fixtures/prototype-pollution.js"
    "tests/fixtures/idor.js"
    "tests/fixtures/ssrf.js"
    "tests/fixtures/command-injection.js"
    "tests/fixtures/nosql-injection.js"
)

ALL_OK=true
for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$INSTALL_PATH/$SKILL_NAME/$file" ]]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file (missing)"
        ALL_OK=false
    fi
done

echo ""

if $ALL_OK; then
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     Installation Complete!                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Skill installed to: ${BLUE}$INSTALL_PATH/$SKILL_NAME${NC}"
    echo ""
    echo -e "${YELLOW}Usage in Claude Code:${NC}"
    echo "  Ask Claude to perform a JavaScript code analysis on your project"
    echo "  Example: 'Analyze this JavaScript project for security vulnerabilities'"
    echo ""
    echo -e "${YELLOW}Manual script usage:${NC}"
    echo "  node $INSTALL_PATH/$SKILL_NAME/scripts/analyze.js /path/to/project"
    echo "  node $INSTALL_PATH/$SKILL_NAME/scripts/check_safety.js /path/to/project"
    echo ""
else
    echo -e "${RED}Installation may be incomplete. Please check the errors above.${NC}"
    exit 1
fi

echo -e "${BLUE}Tip:${NC} You can add the scripts to your PATH for easier access:"
echo "  export PATH=\"\$PATH:$INSTALL_PATH/$SKILL_NAME/scripts\""
echo ""
