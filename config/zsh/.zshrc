# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
autoload -Uz compinit && compinit
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# ===================================================================
# LOAD ENVIRONMENT CONFIGURATION FIRST
# ===================================================================
if [ -f "$HOME/.config/zsh/env.zsh" ]; then
    source "$HOME/.config/zsh/env.zsh"
elif [ -f "$HOME/Projects/dotfiles/config/zsh/env.zsh" ]; then
    source "$HOME/Projects/dotfiles/config/zsh/env.zsh"
fi

if [ -f "$HOME/.config/zsh/runtime.zsh" ]; then
    source "$HOME/.config/zsh/runtime.zsh"
elif [ -f "$HOME/Projects/dotfiles/config/zsh/runtime.zsh" ]; then
    source "$HOME/Projects/dotfiles/config/zsh/runtime.zsh"
fi

typeset -f zsh_compose_path >/dev/null || zsh_compose_path() { export PATH="$HOME/.local/bin:$PATH"; }
typeset -f zsh_load_zinit_runtime >/dev/null || zsh_load_zinit_runtime() { zinit() { return 0; }; return 1; }
typeset -f zsh_setup_go_path >/dev/null || zsh_setup_go_path() { return 0; }
typeset -f reload_theme >/dev/null || reload_theme() { return 0; }

zsh_compose_path
zsh_load_zinit_runtime || true

# Add in Powerlevel10k and plugins. If zinit is missing, zsh_load_zinit_runtime
# installs a no-op zinit function instead of cloning during shell startup.
zinit ice depth=1; zinit light romkatv/powerlevel10k
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-completions
zinit light zsh-users/zsh-autosuggestions
zinit light Aloxaf/fzf-tab
zinit snippet OMZL::git.zsh
zinit snippet OMZP::git
zinit snippet OMZP::sudo
zinit snippet OMZP::archlinux
zinit snippet OMZP::aws
zinit snippet OMZP::kubectl
zinit snippet OMZP::kubectx
zinit snippet OMZP::command-not-found

[ -f "$HOME/.config/zsh/alias.zsh" ] && source "$HOME/.config/zsh/alias.zsh"
[ -f "$HOME/.config/zsh/custom.zsh" ] && source "$HOME/.config/zsh/custom.zsh"
[ -f "$HOME/.config/zsh/functions.zsh" ] && source "$HOME/.config/zsh/functions.zsh"

# >>> mise initialization >>>
export PATH="$HOME/.local/bin:$PATH"
command -v mise >/dev/null 2>&1 && eval "$(mise activate zsh)"
command -v mise >/dev/null 2>&1 && eval "$(mise completion zsh)"
# <<< mise initialization <<<

export EDITOR='vim'
zsh_setup_go_path

[ -f "$HOME/Tools/gf/gf-completion.zsh" ] && source "$HOME/Tools/gf/gf-completion.zsh"
bindkey -s ^f "tmux-sessionizer\n"

zinit cdreplay -q

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

# ZSH theme colors (p10k + autosuggest) — synced with Hyprland theme
[[ -f ~/.config/zsh/current-theme.zsh ]] && source ~/.config/zsh/current-theme.zsh

# Trap SIGUSR1 to dynamically reload themes in running shells
trap 'reload_theme' USR1

# Keybindings
bindkey -e
bindkey '^p' history-search-backward
bindkey '^n' history-search-forward
bindkey '^[w' kill-region

# History — preserve existing user history across dotfiles sync.
# Keep these overridable so machine-local additions below the shim can tune them.
: ${HISTFILE:=$HOME/.zsh_history}
: ${HISTSIZE:=100000}
: ${SAVEHIST:=100000}
setopt appendhistory
setopt sharehistory
setopt extended_history
setopt hist_ignore_space
setopt hist_ignore_dups
setopt hist_find_no_dups
setopt hist_reduce_blanks
# Avoid destructive dedupe/truncation surprises: hist_ignore_all_dups and
# hist_save_no_dups remove older duplicate entries from the persisted file.

# Completion styling
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
zstyle ':completion:*' menu no
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'ls --color $realpath'
zstyle ':fzf-tab:complete:__zoxide_z:*' fzf-preview 'ls --color $realpath'

# Shell integrations
command -v fzf >/dev/null 2>&1 && eval "$(fzf --zsh)"
[[ -f ~/.config/fzf/current-theme.sh ]] && source ~/.config/fzf/current-theme.sh
zstyle ':fzf-tab:*' fzf-flags $(echo "$FZF_DEFAULT_OPTS")

export WORKON_HOME="$HOME/.ve"
export PROJECT_HOME="$HOME/Projects"

# zoxide — must be last
command -v zoxide >/dev/null 2>&1 && eval "$(zoxide init --cmd cd zsh)"
