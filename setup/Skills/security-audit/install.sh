#!/bin/bash
#
# Security Audit Skill Installer
# Installs the skill globally for Claude Code
#
# Usage: ./install.sh [--path /custom/path]
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Skill name
SKILL_NAME="security-audit"

# Default installation paths (in order of preference)
DEFAULT_PATHS=(
    "$HOME/.claude/skills"
    "$HOME/.config/claude/skills"
    "$HOME/.local/share/claude/skills"
)

# Parse arguments
CUSTOM_PATH=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --path)
            CUSTOM_PATH="$2"
            shift 2
            ;;
        --help|-h)
            echo "Security Audit Skill Installer"
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
echo -e "${BLUE}║     Security Audit Skill Installer             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Determine installation path
INSTALL_PATH=""

if [[ -n "$CUSTOM_PATH" ]]; then
    INSTALL_PATH="$CUSTOM_PATH"
    echo -e "${YELLOW}Using custom path: $INSTALL_PATH${NC}"
else
    # Check existing paths
    for path in "${DEFAULT_PATHS[@]}"; do
        if [[ -d "$path" ]]; then
            INSTALL_PATH="$path"
            echo -e "${GREEN}Found existing skills directory: $INSTALL_PATH${NC}"
            break
        fi
    done
    
    # If no existing path, use first default
    if [[ -z "$INSTALL_PATH" ]]; then
        INSTALL_PATH="${DEFAULT_PATHS[0]}"
        echo -e "${YELLOW}Creating new skills directory: $INSTALL_PATH${NC}"
    fi
fi

# Get script directory (where the skill files are)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SOURCE="$SCRIPT_DIR"

# Check if we're running from the skill directory or from a parent
if [[ ! -f "$SKILL_SOURCE/SKILL.md" ]]; then
    # Maybe we're in a dist or parent directory
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

# Create installation directory
mkdir -p "$INSTALL_PATH"

# Check if skill already exists
if [[ -d "$INSTALL_PATH/$SKILL_NAME" ]]; then
    echo -e "${YELLOW}Skill already exists. Updating...${NC}"
    rm -rf "$INSTALL_PATH/$SKILL_NAME"
fi

# Copy skill files
echo -e "${BLUE}Installing skill files...${NC}"

cp -r "$SKILL_SOURCE" "$INSTALL_PATH/$SKILL_NAME"

# Remove install script from installed location (not needed there)
rm -f "$INSTALL_PATH/$SKILL_NAME/install.sh"

# Make scripts executable
if [[ -d "$INSTALL_PATH/$SKILL_NAME/scripts" ]]; then
    chmod +x "$INSTALL_PATH/$SKILL_NAME/scripts/"*.py 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}✓ Skill installed successfully!${NC}"
echo ""

# Verify installation
echo -e "${BLUE}Verifying installation...${NC}"

REQUIRED_FILES=(
    "SKILL.md"
    "references/stride-methodology.md"
    "references/vulnerability-patterns.md"
    "references/cwe-mapping.md"
    "scripts/detect_project.py"
    "scripts/scan_secrets.py"
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
    echo "  Ask Claude to perform a security audit on your project"
    echo "  Example: 'Run a security audit on this codebase'"
    echo ""
    echo -e "${YELLOW}Manual script usage:${NC}"
    echo "  python3 $INSTALL_PATH/$SKILL_NAME/scripts/detect_project.py /path/to/project"
    echo "  python3 $INSTALL_PATH/$SKILL_NAME/scripts/scan_secrets.py /path/to/project"
    echo "  python3 $INSTALL_PATH/$SKILL_NAME/scripts/analyze_dependencies.py /path/to/project"
    echo ""
else
    echo -e "${RED}Installation may be incomplete. Please check the errors above.${NC}"
    exit 1
fi

# Optional: Add to PATH hint
echo -e "${BLUE}Tip:${NC} You can add the scripts to your PATH for easier access:"
echo "  export PATH=\"\$PATH:$INSTALL_PATH/$SKILL_NAME/scripts\""
echo ""
