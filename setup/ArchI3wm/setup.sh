#!/bin/sh
set -e

export DOTFILES="$PWD"

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
source_script "$DOTFILES/setup/ArchI3wm/base.sh"
source_script "$DOTFILES/setup/ArchI3wm/apps.sh"
source_script "$DOTFILES/setup/ArchI3wm/fonts.sh"
source_script "$DOTFILES/setup/terminal.sh"
source_script "$DOTFILES/setup/copy_dots.sh"

echo "Arch with I3wm setup completed successfully!"
echo "Now run option [4] for dev environment (mise) and [3] for hacktools"
