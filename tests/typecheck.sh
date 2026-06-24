#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)
cd "$ROOT"

find . \
  \( -path './.git' -o -path './node_modules' -o -path './.pi' -o -path './.sandcastle' -o -path './.sisyphus' \) -prune -o \
  -type f -name '*.sh' -print0 |
  xargs -0 -n1 bash -n

# These zsh modules are intentionally kept bash-parseable for local validation.
bash -n config/zsh/env.zsh config/zsh/runtime.zsh config/zsh/functions/pipeline.zsh

python3 -m compileall -q mongodb tests
