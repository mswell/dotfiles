#!/bin/bash

# Local testing script for dotfiles
# Allows testing without modifying your system

set -euo pipefail

# Colors
red=$(tput setaf 1)
green=$(tput setaf 2)
yellow=$(tput setaf 3)
blue=$(tput setaf 4)
reset=$(tput sgr0)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ===================================
# Helper Functions
# ===================================

print_header() {
    echo ""
    echo "${blue}========================================${reset}"
    echo "${blue}  $1${reset}"
    echo "${blue}========================================${reset}"
    echo ""
}

print_success() {
    echo "${green}✓ $1${reset}"
}

print_error() {
    echo "${red}✗ $1${reset}"
}

print_warning() {
    echo "${yellow}⚠ $1${reset}"
}

# ===================================
# Test Options
# ===================================

show_menu() {
    clear
    echo "${blue}"
    cat << "EOF"
    ____        __  _____ __
   / __ \____  / /_/ __(_) /__  _____
  / / / / __ \/ __/ /_/ / / _ \/ ___/
 / /_/ / /_/ / /_/ __/ / /  __(__  )
/_____/\____/\__/_/ /_/_/\___/____/

 Testing Environment
EOF
    echo "${reset}"
    echo ""
    echo "Choose a testing method:"
    echo ""
    echo "  ${green}[1]${reset} Syntax validation (safe, no changes)"
    echo "  ${green}[2]${reset} Pre-flight checks only (safe, no changes)"
    echo "  ${green}[3]${reset} Test in Ubuntu Docker container"
    echo "  ${green}[4]${reset} Test in Arch Docker container"
    echo "  ${green}[5]${reset} Run full CI/CD tests locally"
    echo "  ${green}[6]${reset} Validate all shell scripts with ShellCheck"
    echo "  ${green}[7]${reset} Test modular functions loading"
    echo ""
    echo "  ${yellow}[0]${reset} Exit"
    echo ""
    read -p "Enter your choice: " choice
    echo ""
}

# ===================================
# Test Functions
# ===================================

# Test 1: Syntax validation
test_syntax() {
    print_header "Syntax Validation (Bash -n)"

    local errors=0
    local checked=0

    echo "Checking all .sh files..."
    while IFS= read -r script; do
        ((checked++))
        if bash -n "$script" 2>/dev/null; then
            print_success "$(basename "$script")"
        else
            print_error "$(basename "$script") has syntax errors"
            ((errors++))
        fi
    done < <(find setup -name "*.sh" -type f)

    echo ""
    if [ $errors -eq 0 ]; then
        print_success "All $checked scripts passed syntax validation!"
        return 0
    else
        print_error "$errors out of $checked scripts have syntax errors"
        return 1
    fi
}

# Test 2: Pre-flight checks
test_preflight() {
    print_header "Pre-flight Checks"

    export DOTFILES="$SCRIPT_DIR"

    if [ -f "setup/lib/preflight.sh" ]; then
        bash setup/lib/preflight.sh
    else
        print_error "setup/lib/preflight.sh not found"
        return 1
    fi
}

# Test 3: Ubuntu Docker
test_ubuntu_docker() {
    print_header "Testing in Ubuntu Docker Container"

    if ! command -v docker &>/dev/null; then
        print_error "Docker is not installed!"
        print_warning "Install Docker: https://docs.docker.com/get-docker/"
        return 1
    fi

    echo "${yellow}Building Ubuntu test container...${reset}"
    docker build -f Dockerfile.ubuntu -t dotfiles-ubuntu-test . || {
        print_error "Failed to build Docker image"
        return 1
    }

    print_success "Container built successfully!"
    echo ""
    echo "${blue}Starting interactive Ubuntu container...${reset}"
    echo "${yellow}Inside the container, you can run:${reset}"
    echo "  ./install.sh              # Run installation"
    echo "  bash setup/lib/preflight.sh  # Run pre-flight checks"
    echo "  exit                      # Exit container (no changes to host)"
    echo ""

    if docker run -it --rm dotfiles-ubuntu-test; then
        print_success "Container exited cleanly"
    else
        print_error "Container exited with error"
        echo ""
        echo "${yellow}Troubleshooting tips:${reset}"
        echo "  1. Check Docker is running: docker ps"
        echo "  2. Rebuild image: docker build -f Dockerfile.ubuntu -t dotfiles-ubuntu-test ."
        echo "  3. Check logs above for errors"
        return 1
    fi
}

# Test 4: Arch Docker
test_arch_docker() {
    print_header "Testing in Arch Linux Docker Container"

    if ! command -v docker &>/dev/null; then
        print_error "Docker is not installed!"
        print_warning "Install Docker: https://docs.docker.com/get-docker/"
        return 1
    fi

    echo "${yellow}Building Arch Linux test container...${reset}"
    docker build -f Dockerfile.arch -t dotfiles-arch-test . || {
        print_error "Failed to build Docker image"
        return 1
    }

    print_success "Container built successfully!"
    echo ""
    echo "${blue}Starting interactive Arch container...${reset}"
    echo "${yellow}Inside the container, you can run:${reset}"
    echo "  ./install.sh              # Run installation"
    echo "  bash setup/lib/preflight.sh  # Run pre-flight checks"
    echo "  exit                      # Exit container (no changes to host)"
    echo ""

    if docker run -it --rm dotfiles-arch-test; then
        print_success "Container exited cleanly"
    else
        print_error "Container exited with error"
        echo ""
        echo "${yellow}Troubleshooting tips:${reset}"
        echo "  1. Check Docker is running: docker ps"
        echo "  2. Rebuild image: docker build -f Dockerfile.arch -t dotfiles-arch-test ."
        echo "  3. Check logs above for errors"
        return 1
    fi
}

# Test 5: Full CI/CD locally
test_ci_local() {
    print_header "Running CI/CD Tests Locally"

    if command -v act &>/dev/null; then
        echo "${yellow}Running GitHub Actions workflow with 'act'...${reset}"
        act -j shellcheck
    else
        print_warning "'act' is not installed. Falling back to manual tests."
        echo ""
        test_syntax
        test_shellcheck
        test_modular_functions
    fi
}

# Test 6: ShellCheck validation
test_shellcheck() {
    print_header "ShellCheck Validation"

    if ! command -v shellcheck &>/dev/null; then
        print_error "ShellCheck is not installed!"
        print_warning "Install: sudo apt install shellcheck (Ubuntu) or brew install shellcheck (Mac)"
        return 1
    fi

    local errors=0
    local checked=0

    echo "Running ShellCheck on all scripts..."
    while IFS= read -r script; do
        ((checked++))
        if shellcheck "$script" 2>/dev/null; then
            print_success "$(basename "$script")"
        else
            print_error "$(basename "$script") has ShellCheck warnings"
            ((errors++))
        fi
    done < <(find setup -name "*.sh" -type f)

    echo ""
    if [ $errors -eq 0 ]; then
        print_success "All $checked scripts passed ShellCheck!"
        return 0
    else
        print_warning "$errors out of $checked scripts have ShellCheck warnings"
        return 0  # Don't fail on warnings
    fi
}

# Test 7: Modular functions
test_modular_functions() {
    print_header "Testing Modular Functions Loading"

    local functions_dir="config/zsh/functions"

    if [ ! -d "$functions_dir" ]; then
        print_error "Functions directory not found: $functions_dir"
        return 1
    fi

    echo "Checking function modules..."
    local modules=("utils.zsh" "recon.zsh" "scanning.zsh" "crawling.zsh" "vulns.zsh" "nuclei.zsh" "infra.zsh")
    local missing=0

    for module in "${modules[@]}"; do
        if [ -f "$functions_dir/$module" ]; then
            print_success "$module exists"

            # Check if file can be sourced without errors
            if bash -n "$functions_dir/$module" 2>/dev/null; then
                echo "  ${green}└─${reset} Syntax OK"
            else
                echo "  ${red}└─${reset} Syntax errors!"
                ((missing++))
            fi
        else
            print_error "$module is missing!"
            ((missing++))
        fi
    done

    echo ""
    if [ $missing -eq 0 ]; then
        print_success "All ${#modules[@]} function modules are present and valid!"

        # Test the loader
        if [ -f "config/zsh/functions.zsh" ]; then
            print_success "Loader script (functions.zsh) exists"

            # Count lines (should be small now)
            local lines=$(wc -l < config/zsh/functions.zsh)
            echo "  ${blue}└─${reset} Loader has $lines lines (was 574 before)"
        fi

        return 0
    else
        print_error "$missing modules have issues"
        return 1
    fi
}

# ===================================
# Main Menu Loop
# ===================================

main() {
    cd "$SCRIPT_DIR"

    while true; do
        show_menu

        case $choice in
            1)
                test_syntax
                read -p "Press Enter to continue..."
                ;;
            2)
                test_preflight
                read -p "Press Enter to continue..."
                ;;
            3)
                test_ubuntu_docker
                ;;
            4)
                test_arch_docker
                ;;
            5)
                test_ci_local
                read -p "Press Enter to continue..."
                ;;
            6)
                test_shellcheck
                read -p "Press Enter to continue..."
                ;;
            7)
                test_modular_functions
                read -p "Press Enter to continue..."
                ;;
            0)
                echo "${green}Exiting...${reset}"
                exit 0
                ;;
            *)
                print_error "Invalid option!"
                sleep 1
                ;;
        esac
    done
}

# Run main menu
main
