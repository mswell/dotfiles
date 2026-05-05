#!/bin/bash
LOCK="/tmp/screenshot.lock"

# Kill any stuck instance and release lock
if [ -f "$LOCK" ]; then
    pkill -f "grim.*screenshot" 2>/dev/null
    pkill -f slurp 2>/dev/null
    rm -f "$LOCK"
fi

touch "$LOCK"
trap 'rm -f "$LOCK"' EXIT

tmp=$(mktemp /tmp/screenshot_XXXXXX.png)
grimblast save area "$tmp" && swappy -f "$tmp"
rm -f "$tmp"
