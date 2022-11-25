# Path to your oh-my-zsh installation.
export ZSH=$HOME/.oh-my-zsh

# 256-color
export TERM="xterm-256color"

[ -f $HOME/.config/zsh/functions.zsh ] && source $HOME/.config/zsh/functions.zsh
eval "$(starship init zsh)"
colorscript random
# THEME
# ZSH_THEME="dracula"
# Set name of the theme to load --- if set to "random", it will
# load a random theme each time oh-my-zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
# ZSH_THEME="spaceship"

plugins=(git fzf asdf terraform node yarn extract tmux ruby zsh-autosuggestions virtualenvwrapper autojump docker golang sudo docker-compose zsh-syntax-highlighting)

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/var/lib/snapd/snap/bin:$HOME/.local/bin:$HOME/.cargo/bin"
# For WSL use this PATH

# export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/mnt/c/Windows/system32:$HOME/.local/bin:/mnt/c/Windows:/mnt/c/Windows/System32/Wbem:/mnt/c/Windows/System32/WindowsPowerShell/v1.0/:/mnt/c/Windows/System32/OpenSSH/:/mnt/c/Program Files/Git/cmd:/mnt/c/Users/wsilva/AppData/Local/Microsoft/WindowsApps:/snap/bin:$HOME/.cargo/bin"

source $ZSH/oh-my-zsh.sh
export EDITOR='vim'

alias zshconfig="vim ~/.zshrc"
alias ohmyzsh="vim ~/.oh-my-zsh"
alias tree="tree -C"
alias sshold="ssh -oKexAlgorithms=+diffie-hellman-group1-sha1"

# python aliases
alias rmpyc='find . -name "__pycache__" -delete -or -iname "*.pyc" -delete'
alias venv='python3 -m venv'
alias serve='python3 -m http.server'
alias pydoc='python3 -m pydoc'
alias pytime='python3 -m timeit'
alias pyprof='python3 -m profile'
alias jcat='python3 -m json.tool'
alias cal='python3 -m calendar'
alias py2path='python2 -m site'
alias py3path='python3 -m site'
alias bytecode='python3 -m dis'
alias web='python3 -m webbrowser'
alias inspect='python3 -m inspect'
alias tokenize='python3 -m tokenize'
alias zipy='python3 -m zipfile'

# go
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export PATH=$PATH:$GOROOT/bin:$GOPATH/bin

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

export PATH=$PATH:$HOME/Projects/desec
alias zshconfig='nvim $HOME/.zshrc'
alias zshreload='source $HOME/.zshrc'
alias v='nvim'
alias vim='nvim'
unalias gf

source $HOME/Tools/gf/gf-completion.zsh

# alias for gron
alias norg="gron --ungron"
alias ungron="gron --ungron"

# alias for keyboard layout
alias keyus='setxkbmap -layout us -variant intl'
alias keybr='setxkbmap -model thinkpad60 -layout br'

# change ls for lsd
alias ls='lsd'
alias l='ls -l'
alias la='ls -a'
alias lla='ls -la'
alias lt='ls --tree'

# alias for bashtop
alias top='bashtop'

# for axiom
export PATH="$PATH:/home/mswell/.axiom/interact"
alias upall="yay -Syu --noconfirm"
#get fastest mirrors in your neighborhood
alias mirror="sudo reflector -f 30 -l 30 --number 10 --verbose --save /etc/pacman.d/mirrorlist"
alias mirrord="sudo reflector --latest 50 --number 20 --sort delay --save /etc/pacman.d/mirrorlist"
alias mirrors="sudo reflector --latest 50 --number 20 --sort score --save /etc/pacman.d/mirrorlist"
alias mirrora="sudo reflector --latest 50 --number 20 --sort age --save /etc/pacman.d/mirrorlist"
alias nmirrorlist="sudo nano /etc/pacman.d/mirrorlist"

alias mirrorx="sudo reflector --age 6 --latest 20  --fastest 20 --threads 5 --sort rate --protocol https --save /etc/pacman.d/mirrorlist"
# pacman or pm
alias pacman='sudo pacman --color auto'
alias update='sudo pacman -Syyu'
# Fix dual monitors in home XMONAD
alias dualhome="xlayoutdisplay -p HDMI-A-0 -o HDMI-A-0 -o eDP"

bindkey -s ^f "tmux-sessionizer\n"
# alias code='/mnt/c/Users/mswel/AppData/Local/Programs/Microsoft\ VS\ Code/bin/code'

export FZF_DEFAULT_OPTS='--color=fg:#f8f8f2,bg:#282a36,hl:#bd93f9 --color=fg+:#f8f8f2,bg+:#44475a,hl+:#bd93f9 --color=info:#ffb86c,prompt:#50fa7b,pointer:#ff79c6 --color=marker:#ff79c6,spinner:#ffb86c,header:#6272a4'
