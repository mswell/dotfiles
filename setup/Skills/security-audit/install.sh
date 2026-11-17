#!/usr/bin/env bash
# Install this skill into a caller-selected skills directory.

set -euo pipefail

usage() {
    printf 'Usage: %s --path SKILLS_DIR\n' "$0"
}

fail() {
    printf 'Error: %s\n' "$1" >&2
    exit 1
}

if [[ "${1:-}" == '--help' || "${1:-}" == '-h' ]]; then
    usage
    exit 0
fi

if [[ $# -ne 2 || "$1" != '--path' || -z "$2" ]]; then
    usage >&2
    exit 2
fi

source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
[[ -f "$source_dir/SKILL.md" ]] || fail "SKILL.md is missing from $source_dir"

mkdir -p "$2"
install_parent="$(cd "$2" && pwd -P)"
target="$install_parent/security-audit"

case "$target/" in
    "$source_dir/"|"$source_dir/"*)
        fail 'Destination must be outside the source skill directory'
        ;;
esac

if [[ -e "$target" && ! -d "$target" || -L "$target" ]]; then
    fail "Destination is not a regular directory: $target"
fi

staging_dir="$(mktemp -d "$install_parent/.security-audit.stage.XXXXXX")"
cleanup() {
    if [[ -n "$staging_dir" && -d "$staging_dir" ]]; then
        rm -rf -- "$staging_dir"
    fi
}
trap cleanup EXIT

cp -R "$source_dir/." "$staging_dir/"
rm -rf -- "$staging_dir/tests"
find "$staging_dir" -type d -name '__pycache__' -prune -exec rm -rf -- {} +
for required in SKILL.md scripts/detect_project.py scripts/scan_secrets.py scripts/analyze_dependencies.py scripts/generate_report.py; do
    [[ -f "$staging_dir/$required" ]] || fail "Incomplete staged skill: $required"
done

if [[ -d "$target" ]] && diff -qr "$staging_dir" "$target" >/dev/null 2>&1; then
    printf 'Already installed: %s\n' "$target"
    exit 0
fi

backup=''
if [[ -d "$target" ]]; then
    backup="$install_parent/security-audit.backup.$(date +%Y%m%d%H%M%S).$$"
    [[ ! -e "$backup" ]] || fail "Backup path already exists: $backup"
    mv "$target" "$backup"
fi

if ! mv "$staging_dir" "$target"; then
    if [[ -n "$backup" ]]; then
        mv "$backup" "$target" || fail "Install failed; restore the prior skill from $backup"
    fi
    fail 'Could not activate staged skill'
fi
staging_dir=''

printf 'Installed: %s\n' "$target"
if [[ -n "$backup" ]]; then
    printf 'Previous installation preserved: %s\n' "$backup"
fi
