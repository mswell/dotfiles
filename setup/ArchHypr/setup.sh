#!/bin/bash
set -e

# Get the absolute path to the directory where the script is located
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Set DOTFILES to the parent directory of the 'setup' directory, which is the project root
export DOTFILES=$(dirname "$(dirname "$SCRIPT_DIR")")

# Function to execute a script and check if it was successful
source_script() {
  local script_path="$1"
  echo "Sourcing $script_path"
  if source "$script_path"; then
    echo "Successfully sourced $script_path"
  else
    echo "Failed to source $script_path"
    exit 1
  fi
}

# Execute the configuration scripts
source_script "$DOTFILES/setup/ArchHypr/base.sh"
source_script "$DOTFILES/setup/ArchHypr/apps.sh"
source_script "$DOTFILES/setup/ArchHypr/fonts.sh"
source_script "$DOTFILES/setup/terminal.sh"
source_script "$DOTFILES/setup/copy_dots.sh"

echo "ArchHypr setup completed successfully!"
echo "Now run option [4] for dev environment (mise) and [3] for hacktools"
