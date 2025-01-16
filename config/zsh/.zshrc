# 256-color
export TERM="xterm-256color"

[ -f $HOME/.config/zsh/alias.zsh ] && source $HOME/.config/zsh/alias.zsh
[ -f $HOME/.config/zsh/custom.zsh ] && source $HOME/.config/zsh/custom.zsh
eval "$(starship init zsh)"


export PATH="/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/var/lib/snapd/snap/bin:$HOME/.local/bin:/usr/local/bin:$HOME/.cargo/bin"

# ATTENTION !! if you use WSL, please change windows user on PATH export

# export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/usr/lib/wsl/lib:/mnt/c/Windows/system32:/mnt/c/Windows:/mnt/c/Windows/System32/Wbem:/mnt/c/Windows/System32/WindowsPowerShell/v1.0/:/mnt/c/Windows/System32/OpenSSH/:/mnt/c/Program Files/NVIDIA Corporation/NVIDIA NvDLISR:/mnt/c/Program Files (x86)/NVIDIA Corporation/PhysX/Common:/mnt/c/Users/mswel/AppData/Local/Microsoft/WindowsApps:/mnt/c/Users/mswel/AppData/Local/Programs/Microsoft VS Code/bin:$HOME/.local/bin:$HOME/.cargo/bin"


export EDITOR='vim'

# go
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export PATH=$PATH:$GOROOT/bin:$GOPATH/bin

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

source $HOME/Tools/gf/gf-completion.zsh
bindkey -s ^f "tmux-sessionizer\n"

source ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh
source ~/.zsh/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

export FZF_DEFAULT_OPTS=" \
--color=bg+:#313244,bg:#1e1e2e,spinner:#f5e0dc,hl:#f38ba8 \
--color=fg:#cdd6f4,header:#f38ba8,info:#cba6f7,pointer:#f5e0dc \
--color=marker:#f5e0dc,fg+:#cdd6f4,prompt:#cba6f7,hl+:#f38ba8"

HISTFILE=~/.zsh_history
HISTSIZE=10000
SAVEHIST=10000
setopt appendhistory
