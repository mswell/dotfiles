# Guia de Testes - Dotfiles

Este documento explica como testar as mudanças no dotfiles **sem alterar seu sistema**.

## 🎯 Opções de Teste

### 1️⃣ **Script de Teste Interativo (RECOMENDADO)**

O jeito mais fácil - menu interativo com todas as opções:

```bash
./test-local.sh
```

**Menu:**
- `[1]` Validação de sintaxe (100% seguro)
- `[2]` Pre-flight checks (100% seguro)
- `[3]` Testar em container Ubuntu
- `[4]` Testar em container Arch Linux
- `[5]` Rodar testes CI/CD localmente
- `[6]` Validar com ShellCheck
- `[7]` Testar funções modulares

---

### 2️⃣ **Testes Rápidos (Sem Docker)**

#### Validar sintaxe de todos os scripts:
```bash
# Verifica se há erros de sintaxe
find setup -name "*.sh" -exec bash -n {} \;
```

#### Rodar pre-flight checks:
```bash
export DOTFILES=$PWD
bash setup/lib/preflight.sh
```

#### Verificar estrutura modular:
```bash
# Deve mostrar 7 arquivos
ls -la config/zsh/functions/
```

#### ShellCheck (se instalado):
```bash
# Ubuntu/Debian
sudo apt install shellcheck

# Rodar em todos os scripts
find setup -name "*.sh" -exec shellcheck {} \;
```

---

### 3️⃣ **Teste em Docker (Isolamento Total)**

#### Opção A: Ubuntu Container

```bash
# Construir imagem
docker build -f Dockerfile.ubuntu -t dotfiles-test .

# Rodar container interativo
docker run -it --rm dotfiles-test

# Dentro do container:
./install.sh              # Testar instalação
bash setup/lib/preflight.sh  # Validações
exit                      # Sair (nada salvo)
```

#### Opção B: Arch Linux Container

```bash
# Construir imagem
docker build -f Dockerfile.arch -t dotfiles-arch-test .

# Rodar container interativo
docker run -it --rm dotfiles-arch-test

# Dentro do container: mesmo que acima
```

#### Opção C: Docker Compose (ambos)

```bash
# Ubuntu
docker-compose run --rm ubuntu-test

# Arch Linux
docker-compose run --rm arch-test
```

**Vantagens:**
- ✅ Isolamento completo do sistema host
- ✅ Pode testar instalação completa
- ✅ Ao sair, tudo é descartado
- ✅ Pode testar múltiplas vezes

---

### 4️⃣ **Validações Específicas**

#### Testar logging system:
```bash
export DOTFILES=$PWD
export LOG_FILE=/tmp/test.log

# Source logging lib
source setup/lib/logging.sh

# Testar funções
log_info "Teste de INFO"
log_warn "Teste de WARNING"
log_error "Teste de ERROR"

# Ver log
cat /tmp/test.log
```

#### Testar funções modulares (ZSH):
```bash
# Requer zsh instalado
zsh

# Carregar função loader
source config/zsh/functions.zsh

# Verificar se funções foram carregadas
type subdomainenum  # Deve mostrar a função
type getalive       # Deve mostrar a função
```

#### Validar que env.zsh funciona:
```bash
export DOTFILES=$PWD
source config/zsh/env.zsh

# Verificar variáveis
echo $TOOLS_PATH
echo $LISTS_PATH
echo $RECON_PATH
```

---

### 5️⃣ **CI/CD Local com Act**

Se você tem [`act`](https://github.com/nektos/act) instalado:

```bash
# Instalar act (GitHub Actions local)
# Ubuntu/Debian
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# macOS
brew install act

# Rodar workflow de CI
act -j shellcheck        # Só ShellCheck
act -j test-ubuntu       # Testes Ubuntu
act                      # Todos os jobs
```

---

## 🔍 Checklist de Validação

Antes de usar no sistema real, verifique:

- [ ] **Sintaxe OK:** `bash -n setup/**/*.sh` sem erros
- [ ] **ShellCheck OK:** Sem erros críticos
- [ ] **Funções modulares:** 7 arquivos em `config/zsh/functions/`
- [ ] **Pre-flight funciona:** `bash setup/lib/preflight.sh` passa
- [ ] **Logging funciona:** Log file criado em `/tmp/test.log`
- [ ] **Docker funciona:** Container sobe e install.sh roda

---

## 🐛 Troubleshooting

### install.sh não mostra nada no Docker?

**Problema:** O script executa mas não mostra saída.

**Causa:** Falta de `$TERM` ou problemas com `tput`.

**Solução (já implementada):**
- Dockerfiles agora definem `ENV TERM=xterm-256color`
- Scripts têm fallbacks para `tput`
- Logging tem fallback se falhar

**Para testar após correção:**
```bash
# Rebuild containers
docker build -f Dockerfile.ubuntu -t dotfiles-ubuntu-test .
docker build -f Dockerfile.arch -t dotfiles-arch-test .

# Testar novamente
./test-local.sh
# Escolher [3] ou [4]
```

### Docker não instalado?
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
# Logout e login novamente
```

### ShellCheck não instalado?
```bash
# Ubuntu/Debian
sudo apt install shellcheck

# macOS
brew install shellcheck

# Arch
sudo pacman -S shellcheck
```

### Zsh não instalado (para testar funções)?
```bash
# Ubuntu/Debian
sudo apt install zsh

# Arch
sudo pacman -S zsh
```

---

## 📊 Testes Automatizados (GitHub Actions)

Ao fazer push/PR, GitHub Actions roda automaticamente:

```
✓ ShellCheck
✓ Testes Ubuntu (22.04, 24.04)
✓ Testes Arch Linux
✓ Validação de URLs
✓ Security scan
✓ Code quality
```

Ver status: https://github.com/mswell/dotfiles/actions

---

## 🎓 Exemplo de Sessão de Teste Completa

```bash
# 1. Validação rápida (30 segundos)
./test-local.sh
# Escolher opção [1] - Sintaxe
# Escolher opção [7] - Funções modulares

# 2. Teste em Docker (5 minutos)
./test-local.sh
# Escolher opção [3] - Ubuntu Docker

# Dentro do container:
./install.sh
# Escolher opção [1] - Ubuntu VPS
# Observar pré-flight checks
# Observar logging
# Ctrl+C se quiser parar
exit

# 3. Verificar logs (no host)
cat ~/.dotfiles_install.log  # Se rodou fora do Docker
```

---

## ✅ Quando Está Seguro Usar no Sistema Real

Você pode usar no sistema real quando:

1. ✅ Todos os testes de sintaxe passam
2. ✅ ShellCheck não mostra erros críticos
3. ✅ Pre-flight checks funcionam
4. ✅ Testou em Docker sem problemas
5. ✅ Funções modulares carregam corretamente
6. ✅ Logging está funcionando

---

## 🆘 Em Caso de Problemas

Se algo der errado no teste:

1. **Logs:** Verifique `~/.dotfiles_install.log`
2. **Verbose:** `export LOG_LEVEL=DEBUG` antes de rodar
3. **Docker:** Use container para isolar problema
4. **Rollback:** Git está limpo? `git status`

---

## 📚 Referências

- [Docker Docs](https://docs.docker.com/)
- [ShellCheck Wiki](https://github.com/koalaman/shellcheck/wiki)
- [Act (GitHub Actions local)](https://github.com/nektos/act)
- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Mudanças implementadas

---

**Última atualização:** 2025-10-06
