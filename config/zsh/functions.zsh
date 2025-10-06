#
# Bug Bounty Functions Loader
# This file sources all modular function files for better organization
#

# Determine the directory where this script is located
FUNCTIONS_DIR="${${(%):-%x}:A:h}/functions"

# Check if functions directory exists and source all modules
if [ -d "$FUNCTIONS_DIR" ]; then
    # Load modules in logical order
    source "$FUNCTIONS_DIR/utils.zsh"     # Utility and helper functions
    source "$FUNCTIONS_DIR/recon.zsh"     # Subdomain enumeration and discovery
    source "$FUNCTIONS_DIR/scanning.zsh"  # Port scanning and HTTP probing
    source "$FUNCTIONS_DIR/crawling.zsh"  # Web crawling and data collection
    source "$FUNCTIONS_DIR/vulns.zsh"     # Vulnerability scanning
    source "$FUNCTIONS_DIR/nuclei.zsh"    # Nuclei scanning workflows
    source "$FUNCTIONS_DIR/infra.zsh"     # Infrastructure and DNS
else
    echo "[WARN] Functions directory not found at: $FUNCTIONS_DIR"
    echo "[WARN] Bug bounty functions will not be available"
fi
