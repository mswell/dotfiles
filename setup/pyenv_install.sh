# The definitive guide to setup my Python workspace with ubuntu and ZSH
# Author: Henrique Bastos <henrique@bastos.net>
# Modified by Wellington Moraes <wellpunk@gmail.com>

PY3=3.13.2
PY2=2.7.18
PY3TOOLS="poetry ipython waypaper pytest black flake8 pylint requests colorama virtualenvwrapper"
PY2TOOLS="rename"

VENVS=~/.ve
PROJS=~/Projects

# Função para verificar se um comando existe
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Função para adicionar ao .zshrc se não existir
add_to_zshrc() {
  grep -qxF "$1" "$HOME/.zshrc" || echo "$1" >>"$HOME/.zshrc"
}

# Instal Pyenv
install_pyenv() {
  git clone https://github.com/pyenv/pyenv.git ~/.pyenv
  export PYENV_ROOT="$HOME/.pyenv"
  export PATH="$PYENV_ROOT/bin:$PATH"
  add_to_zshrc 'export PYENV_ROOT="$HOME/.pyenv"'
  add_to_zshrc 'export PATH="$PYENV_ROOT/bin:$PATH"'
}

# Instala plugins do Pyenv
install_pyenv_plugins() {
  git clone https://github.com/pyenv/pyenv-virtualenv.git $(pyenv root)/plugins/pyenv-virtualenv
  git clone https://github.com/pyenv/pyenv-update.git $(pyenv root)/plugins/pyenv-update
}

# Configura diretórios de projetos e virtualenvs
setup_directories() {
  mkdir -p $VENVS
  mkdir -p $PROJS
  add_to_zshrc 'export WORKON_HOME=~/.ve'
  add_to_zshrc 'export PROJECT_HOME=~/Projects'
}

# Configura inicialização do Pyenv no .zshrc
setup_pyenv_init() {
  add_to_zshrc 'eval "$(pyenv init -)"'
  add_to_zshrc 'eval "$(pyenv init --path)"'
  add_to_zshrc 'if which pyenv-virtualenv-init > /dev/null; then eval "$(pyenv virtualenv-init -)"; fi'
}

# Inicializa Pyenv
initialize_pyenv() {
  eval "$(pyenv init -)"
  eval "$(pyenv init --path)"
  if command_exists pyenv-virtualenv-init; then
    eval "$(pyenv virtualenv-init -)"
  fi
}

# Instala versões do Python
install_python_versions() {
  pyenv install $PY3
  pyenv install $PY2
}

# Prepara ambientes virtuais
prepare_virtualenvs() {
  pyenv virtualenv $PY3 tools39
  pyenv virtualenv $PY2 tools27
  ~/.pyenv/versions/$PY3/bin/pip install --upgrade pip
  ~/.pyenv/versions/$PY2/bin/pip install --upgrade pip
  ~/.pyenv/versions/tools39/bin/pip install --upgrade pip
  ~/.pyenv/versions/tools27/bin/pip install --upgrade pip
}

# Instala ferramentas Python3
install_python3_tools() {
  ~/.pyenv/versions/tools39/bin/pip install $PY3TOOLS
  ~/.pyenv/versions/tools39/bin/pip install virtualenvwrapper
  add_to_zshrc 'export VIRTUALENVWRAPPER_PYTHON=$(which python3)'
  add_to_zshrc 'source ~/.pyenv/versions/tools39/bin/virtualenvwrapper.sh'
}

# Instala ferramentas Python2
install_python2_tools() {
  ~/.pyenv/versions/tools27/bin/pip install $PY2TOOLS
}

# Protege diretórios lib dos interpretadores globais
protect_lib_dirs() {
  chmod -R -w ~/.pyenv/versions/$PY2/lib/
  chmod -R -w ~/.pyenv/versions/$PY3/lib/
}

# Configura ordem do PATH
setup_path_order() {
  pyenv global $PY3 $PY2 tools39 tools27
}

# Verifica se tudo está instalado corretamente
check_installation() {
  pyenv which python | grep -q "$PY3" && echo "✓ $PY3"
  pyenv which python2 | grep -q "$PY2" && echo "✓ $PY2"
  pyenv which rename | grep -q "tools27" && echo "✓ tools27"
}

# Executa todas as funções
main() {
  install_pyenv
  install_pyenv_plugins
  setup_directories
  setup_pyenv_init
  initialize_pyenv
  install_python_versions
  prepare_virtualenvs
  install_python3_tools
  install_python2_tools
  protect_lib_dirs
  setup_path_order
  check_installation
  echo "Done! Restart the terminal."
}

main
