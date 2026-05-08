#!/usr/bin/env bash
# wpaperd-set.sh — Generate wpaperd config with per-output rotation workarounds
# Usage: wpaperd-set.sh <wallpaper-file-or-directory>

set -euo pipefail

SOURCE_PATH="${1:-}"
CONFIG_PATH="$HOME/.config/wpaperd/wallpaper.toml"
CACHE_ROOT="$HOME/.cache/wpaperd-rotated"

[[ -z "$SOURCE_PATH" || ! -e "$SOURCE_PATH" ]] && exit 1

# Hyprland + wpaperd currently render rotated portrait outputs upside down here.
# Detect those outputs dynamically and pre-rotate only their wallpaper assets.
declare -A OUTPUT_ROTATIONS=()

detect_output_rotations() {
    command -v hyprctl >/dev/null 2>&1 || return 0

    hyprctl monitors 2>/dev/null | awk '
        /^Monitor / { output=$2 }
        /^[[:space:]]*transform:/ {
            transform = $2 + 0
            if (transform == 1 || transform == 3 || transform == 5 || transform == 7) {
                printf "%s 180\n", output
            }
        }
    '
}

while read -r output degrees; do
    [[ -n "$output" && -n "$degrees" ]] || continue
    OUTPUT_ROTATIONS["$output"]="$degrees"
done < <(detect_output_rotations)

is_image_file() {
    local path="$1"
    case "${path,,}" in
        *.jpg|*.jpeg|*.png|*.webp|*.bmp|*.gif) return 0 ;;
        *) return 1 ;;
    esac
}

rotate_image() {
    local source="$1"
    local destination="$2"
    local degrees="$3"

    python3 - "$source" "$destination" "$degrees" <<'PY'
from pathlib import Path
from PIL import Image, ImageOps
import sys

source = Path(sys.argv[1]).expanduser()
destination = Path(sys.argv[2]).expanduser()
degrees = int(sys.argv[3]) % 360

destination.parent.mkdir(parents=True, exist_ok=True)

with Image.open(source) as image:
    image = ImageOps.exif_transpose(image)

    if degrees == 90:
        image = image.transpose(Image.Transpose.ROTATE_90)
    elif degrees == 180:
        image = image.transpose(Image.Transpose.ROTATE_180)
    elif degrees == 270:
        image = image.transpose(Image.Transpose.ROTATE_270)

    if destination.suffix.lower() in {'.jpg', '.jpeg'} and image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')

    image.save(destination)
PY
}

build_rotated_path() {
    local source="$1"
    local output="$2"
    local degrees="$3"
    local key="$(printf '%s' "$source:$degrees" | sha256sum | cut -d' ' -f1)"
    local target

    if [[ -d "$source" ]]; then
        target="$CACHE_ROOT/$output/$key"
        mkdir -p "$target"

        while IFS= read -r -d '' file; do
            is_image_file "$file" || continue
            local destination="$target/$(basename "$file")"
            if [[ ! -f "$destination" || "$file" -nt "$destination" ]]; then
                rotate_image "$file" "$destination" "$degrees"
            fi
        done < <(find "$source" -maxdepth 1 -type f -print0)
    else
        local ext="${source##*.}"
        target="$CACHE_ROOT/$output/$key.${ext}"
        if [[ ! -f "$target" || "$source" -nt "$target" ]]; then
            rotate_image "$source" "$target" "$degrees"
        fi
    fi

    printf '%s\n' "$target"
}

mkdir -p "$(dirname "$CONFIG_PATH")"

{
    echo "[default]"
    printf 'path = "%s"\n' "$SOURCE_PATH"
    echo 'mode = "stretch"'

    if [[ -d "$SOURCE_PATH" ]]; then
        echo 'duration = "30m"'
        echo 'sorting = "random"'
    fi

    for output in "${!OUTPUT_ROTATIONS[@]}"; do
        local_source="$SOURCE_PATH"

        if [[ -d "$SOURCE_PATH" ]]; then
            if ! find "$SOURCE_PATH" -maxdepth 1 -type f \( \
                -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.bmp' -o -iname '*.gif' \
            \) -print -quit | grep -q .; then
                continue
            fi
        elif ! is_image_file "$SOURCE_PATH"; then
            continue
        fi

        rotated_path="$(build_rotated_path "$local_source" "$output" "${OUTPUT_ROTATIONS[$output]}")"
        echo
        printf '["%s"]\n' "$output"
        printf 'path = "%s"\n' "$rotated_path"
    done
} > "$CONFIG_PATH"

pkill wpaperd 2>/dev/null || true
sleep 0.2
rm -f "$HOME/.local/state/wpaperd/wallpapers/"* 2>/dev/null || true
wpaperd -d
