# Path to your oh-my-zsh installation.
export ZSH=$HOME/.oh-my-zsh

# 256-color
export TERM="xterm-256color"

[ -f $HOME/.config/zsh/alias.zsh ] && source $HOME/.config/zsh/alias.zsh
[ -f $HOME/.config/zsh/custom.zsh ] && source $HOME/.config/zsh/custom.zsh
eval "$(starship init zsh)"
colorscript random

plugins=(git fzf asdf terraform node yarn extract tmux ruby zsh-autosuggestions virtualenvwrapper autojump docker golang sudo docker-compose zsh-syntax-highlighting)

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/var/lib/snapd/snap/bin:$HOME/.local/bin:$HOME/.cargo/bin"
# For WSL use this PATH

# export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/mnt/c/Windows/system32:$HOME/.local/bin:/mnt/c/Windows:/mnt/c/Windows/System32/Wbem:/mnt/c/Windows/System32/WindowsPowerShell/v1.0/:/mnt/c/Windows/System32/OpenSSH/:/mnt/c/Program Files/Git/cmd:/mnt/c/Users/wsilva/AppData/Local/Microsoft/WindowsApps:/snap/bin:$HOME/.cargo/bin"

source $ZSH/oh-my-zsh.sh
export EDITOR='vim'

# go
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export PATH=$PATH:$GOROOT/bin:$GOPATH/bin

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

export PATH=$PATH:$HOME/Projects/desec
source $HOME/Tools/gf/gf-completion.zsh
export PATH="$PATH:/home/mswell/.axiom/interact"
bindkey -s ^f "tmux-sessionizer\n"
export FZF_DEFAULT_OPTS=$FZF_DEFAULT_OPTS'
 --color=fg:#ebdbb2,bg:#1d2021,hl:#83a598
 --color=fg+:#fbf1c7,bg+:#282828,hl+:#458488
 --color=info:#afaf87,prompt:#cc241d,pointer:#b16286
 --color=marker:#8ec07c,spinner:#b16286,header:#b8bb26'

