#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)
cd "$ROOT"

bash tests/test_shell_modules.sh
bash tests/test_recon_pipeline.sh
python3 -m unittest tests/test_mongodb_core.py
