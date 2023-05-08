# Created by Zap installer
[ -f "${XDG_DATA_HOME:-$HOME/.local/share}/zap/zap.zsh" ] && source "${XDG_DATA_HOME:-$HOME/.local/share}/zap/zap.zsh"
plug "zsh-users/zsh-autosuggestions"
plug "zap-zsh/supercharge"
plug "zap-zsh/zap-prompt"
plug "zsh-users/zsh-syntax-highlighting"
plug "chivalryq/zsh-autojump"
plug "zap-zsh/fzf"
plug "chivalryq/git-alias"
plug "zap-zsh/completions"
plug "zsh-users/zsh-history-substring-search"

plug "$HOME/.config/zsh/alias.zsh"
plug "$HOME/.config/zsh/functions.zsh"
plug "$HOME/.config/zsh/custom.zsh"


export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/var/lib/snapd/snap/bin:$HOME/.local/bin:$HOME/.cargo/bin"

export EDITOR='vim'
unalias gf

# go
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export PATH=$PATH:$GOROOT/bin:$GOPATH/bin

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

source $HOME/Tools/gf/gf-completion.zsh
bindkey -s "^f" "tmux-sessionizer\n"
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

export FZF_DEFAULT_OPTS=" \
--color=bg+:#313244,bg:#1e1e2e,spinner:#f5e0dc,hl:#f38ba8 \
--color=fg:#cdd6f4,header:#f38ba8,info:#cba6f7,pointer:#f5e0dc \
--color=marker:#f5e0dc,fg+:#cdd6f4,prompt:#cba6f7,hl+:#f38ba8"
