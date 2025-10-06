# Correções para Testes em Docker

**Data:** 2025-10-06
**Problema:** `install.sh` executava mas não mostrava saída no Docker

## 🔍 Causa Raiz

O problema ocorria porque:

1. **$TERM não estava definido** no container → `tput` falhava
2. **`set -euo pipefail`** → qualquer erro parava o script silenciosamente
3. **`log_init` auto-executava** ao fazer source → podia falhar sem mensagem
4. **Cores do terminal** falhavam sem $TERM

## ✅ Correções Implementadas

### 1. Dockerfiles (Ubuntu e Arch)

**Adicionado:**
```dockerfile
ENV TERM=xterm-256color
```

**Benefício:** `tput` agora funciona corretamente.

---

### 2. install.sh

**Adicionado fallback para $TERM e tput:**
```bash
# Set TERM if not defined (for Docker/minimal environments)
export TERM="${TERM:-xterm}"

# Colors with fallback if tput fails
export red=$(tput setaf 1 2>/dev/null || echo "")
export green=$(tput setaf 2 2>/dev/null || echo "")
# ...
```

**Benefício:** Funciona mesmo sem terminal completo.

---

### 3. setup/lib/logging.sh

**Melhorias:**

a) **log_init com fallbacks:**
```bash
# Try /tmp if $HOME fails
if ! touch "$LOG_FILE" 2>/dev/null; then
    LOG_FILE="/tmp/dotfiles_install.log"
    if ! touch "$LOG_FILE" 2>/dev/null; then
        export LOG_FILE_DISABLED=1
        return 0
    fi
fi
```

b) **Auto-init com fallback robusto:**
```bash
if ! log_init 2>/dev/null; then
    # Fallback: create minimal logging functions
    log_info() { echo "[INFO] $*"; }
    log_warn() { echo "[WARN] $*"; }
    log_error() { echo "[ERROR] $*" >&2; }
    # ...
fi
```

c) **Comandos protegidos:**
```bash
echo "User: ${USER:-unknown}"
echo "Hostname: $(hostname 2>/dev/null || echo 'unknown')"
```

**Benefício:** Nunca falha silenciosamente.

---

### 4. setup/lib/preflight.sh

**Adicionado:**
```bash
export TERM="${TERM:-xterm}"
red=$(tput setaf 1 2>/dev/null || echo "")
# ...
```

**Benefício:** Funciona em qualquer ambiente.

---

### 5. test-local.sh

**Melhoradas mensagens de erro:**
```bash
if docker run -it --rm dotfiles-ubuntu-test; then
    print_success "Container exited cleanly"
else
    print_error "Container exited with error"
    echo "Troubleshooting tips:"
    # ...
fi
```

**Benefício:** Feedback claro quando algo falha.

---

## 🧪 Como Testar

### Opção 1: Rebuild e teste rápido

```bash
# Rebuild containers com as correções
docker build -f Dockerfile.ubuntu -t dotfiles-ubuntu-test .
docker build -f Dockerfile.arch -t dotfiles-arch-test .

# Testar Ubuntu
docker run -it --rm dotfiles-ubuntu-test

# Dentro do container:
./install.sh
# Deve mostrar o banner e menu agora! 🎉
```

### Opção 2: Via script de teste

```bash
./test-local.sh
# Escolher [3] para Ubuntu ou [4] para Arch
```

### Opção 3: Teste manual no container

```bash
docker run -it --rm dotfiles-arch-test bash

# Dentro do container:
export DOTFILES=/home/testuser/dotfiles
cd $DOTFILES

# Testar components individualmente:
bash setup/lib/preflight.sh  # Deve mostrar checks ✓
./install.sh                  # Deve mostrar menu

exit
```

---

## 📊 O que esperar agora

### ✅ Funcionando:

```
🛸         🌎  °    🌓  •    .°•      🚀 ✯
 __   __  _______  _     _  _______  ___      ___
|  |_|  ||       || | _ | ||       ||   |    |   |
...
[INFO] =========================================
[INFO]   Dotfiles Installation System Started
[INFO] =========================================
[INFO] Installation log: /tmp/dotfiles_install.log

========================================
  Pre-flight System Validation
========================================

✓ Not running as root
✓ Sudo access available
✓ Detected: Arch Linux
...

[1] - Ubuntu/Debian VPS
[2] - Archlinux with Hyprland
...
Choose your distro:
```

### ❌ Antes (problema):

```
[testuser@212d70e2b596 dotfiles]$ ./install.sh
[testuser@212d70e2b596 dotfiles]$ ← Nada aparecia!
```

---

## 🔧 Troubleshooting

### Se ainda não funcionar:

1. **Verificar Docker está rodando:**
   ```bash
   docker ps
   docker version
   ```

2. **Rebuild forçado (sem cache):**
   ```bash
   docker build --no-cache -f Dockerfile.arch -t dotfiles-arch-test .
   ```

3. **Testar sintaxe localmente:**
   ```bash
   bash -n install.sh
   bash -n setup/lib/logging.sh
   bash -n setup/lib/preflight.sh
   ```

4. **Testar com debug:**
   ```bash
   docker run -it --rm dotfiles-arch-test bash -x install.sh 2>&1 | less
   ```

5. **Verificar $TERM no container:**
   ```bash
   docker run -it --rm dotfiles-arch-test bash -c "echo \$TERM"
   # Deve mostrar: xterm-256color
   ```

---

## 📝 Resumo das Mudanças

| Arquivo | Mudança | Propósito |
|---------|---------|-----------|
| `Dockerfile.ubuntu` | `ENV TERM=xterm-256color` | Cores no terminal |
| `Dockerfile.arch` | `ENV TERM=xterm-256color` | Cores no terminal |
| `install.sh` | Fallback para tput | Funciona sem cores |
| `setup/lib/logging.sh` | Múltiplos fallbacks | Nunca falha silenciosamente |
| `setup/lib/preflight.sh` | Fallback para tput | Funciona sem cores |
| `test-local.sh` | Mensagens de erro | Feedback melhor |

---

## ✅ Validação

Todos os scripts validados:
- ✅ `install.sh` - Sintaxe OK
- ✅ `setup/lib/logging.sh` - Sintaxe OK
- ✅ `setup/lib/preflight.sh` - Sintaxe OK
- ✅ `test-local.sh` - Sintaxe OK

---

## 🚀 Próximos Passos

Após testar no Docker e confirmar que funciona:

1. **Pode usar com confiança** no sistema real
2. **Feedback:** Reporte se encontrar outros problemas
3. **Contribua:** Abra PR se tiver melhorias

---

**Correções por:** Claude Code
**Última atualização:** 2025-10-06
