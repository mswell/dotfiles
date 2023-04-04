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

alias zshconfig='nvim $HOME/.zshrc'
alias zshreload='source $HOME/.zshrc'
alias v='nvim'
alias vim='nvim'

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


