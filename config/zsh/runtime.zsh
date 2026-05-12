# Runtime shell bootstrap helpers. Keep install-time work out of normal startup.

zsh_compose_path() {
  export PATH="/usr/sbin:/usr/bin:/usr/local/bin:/sbin:/bin:/usr/games:/usr/local/games:/var/lib/snapd/snap/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
  [ -d "$HOME/.pdtm/go/bin" ] && export PATH="$PATH:$HOME/.pdtm/go/bin"
  [ -d "$HOME/.opencode/bin" ] && export PATH="$HOME/.opencode/bin:$PATH"
}

zsh_bootstrap_zinit() {
  local zinit_home="${ZINIT_HOME:-${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git}"
  if [ ! -d "$zinit_home" ]; then
    mkdir -p "$(dirname "$zinit_home")"
    git clone https://github.com/zdharma-continuum/zinit.git "$zinit_home"
  fi
}

zsh_load_zinit_runtime() {
  ZINIT_HOME="${ZINIT_HOME:-${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git}"
  if [ -r "$ZINIT_HOME/zinit.zsh" ]; then
    source "$ZINIT_HOME/zinit.zsh"
    return 0
  fi

  if [ "${DOTFILES_ALLOW_RUNTIME_BOOTSTRAP:-0}" = "1" ]; then
    zsh_bootstrap_zinit && source "$ZINIT_HOME/zinit.zsh"
    return $?
  fi

  echo "[WARN] zinit is not installed. Run zsh_bootstrap_zinit or setup/terminal.sh to install plugins." >&2
  zinit() { return 0; }
  return 1
}

zsh_setup_go_path() {
  if command -v go >/dev/null 2>&1; then
    export GOPATH="$HOME/go"
    export PATH="$PATH:$GOPATH/bin"
  elif [ -d "/usr/local/go" ]; then
    export GOROOT=/usr/local/go
    export GOPATH="$HOME/go"
    export PATH="$PATH:$GOROOT/bin:$GOPATH/bin"
  fi
}

reload_theme() {
  [ -f "$HOME/.config/zsh/current-theme.zsh" ] && source "$HOME/.config/zsh/current-theme.zsh"
  [ -f "$HOME/.config/fzf/current-theme.sh" ] && source "$HOME/.config/fzf/current-theme.sh"
  zstyle ':fzf-tab:*' fzf-flags $(echo "$FZF_DEFAULT_OPTS")
  zle && zle reset-prompt
}
