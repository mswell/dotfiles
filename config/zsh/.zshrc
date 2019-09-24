# Path to your oh-my-zsh installation.
export ZSH=$HOME/.oh-my-zsh

# 256-color
export TERM="xterm-256color"

# THEME
# ZSH_THEME="dracula"
ZSH_THEME="spaceship"

DISABLE_UNTRACKED_FILES_DIRTY="true"

plugins=(git node yarn extract tmux ruby zsh-autosuggestions virtualenvwrapper autojump  docker go sudo docker-compose zsh-syntax-highlighting)

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games"

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
fd(){
    findomain -o -t $1
}

am(){
    amass enum --passive -d $1 -json $1.json
    jq .name $1.json | sed "s/\"//g" | httprobe  | tee -a $1-domains.txt
}
certspotter(){
    curl -s https://certspotter.com/api/v0/certs\?domain\=$1 | jq '.[].dns_names[]' | sed "s/\"//g" | sed "s/\*\.//g" | sort -u | grep $1
}
crtsh(){
curl -s https://crt.sh/?q=%.$1  | sed "s/<\/\?[^>]\+>//g" | grep $1
}
dirsearch(){
    cd $HOME/tools/dirsearch
    python3 dirsearch.py -x 502,503 -u $1 -e $2 -t 200 -H 'X-FORWARDER-FOR: 127.0.0.1'
}
