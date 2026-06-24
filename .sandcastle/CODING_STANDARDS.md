# Coding Standards

## Style

- Use snake_case for shell functions and variables
- Use UPPER_CASE for exported environment variables and constants
- Prefer `local` for function-scoped variables in bash/zsh
- Quote variables: `"$var"` not `$var`
- Use `[[ ]]` over `[ ]` for conditionals

## Testing

- Tests live in `tests/` directory
- Test runner: `bash tests/run.sh`
- Each module should have assertions proving its seam behavior
- Test names should describe expected behavior clearly

## Architecture

- Shared libraries in `setup/lib/` — sourced by setup scripts
- Central configuration in `config/zsh/env.zsh` — single source of truth for paths
- Functions in `config/zsh/functions.zsh` and `config/zsh/functions/`
- Idempotent operations — scripts check before installing
- One responsibility per script
