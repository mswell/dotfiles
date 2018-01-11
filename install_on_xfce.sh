# Install apps
pacaur -S ctags ncurses curl spotify tmux neovim python-neovim python-pip zsh xclip phantomjs git termite autojump tree oh-my-zsh-git docker-compose docker geckodriver go tlp tlp-rdw ttf-dejavu vim gvim powerline-fonts ttf-ancient-fonts the_silver_searcher xfce4-clipman-plugin tp_smapi acpi_call gimp xfce4-whiskermenu-plugin xdg-utils xf86-video-intel papirus-icon-theme-git gtk-arc-flatabulous-theme-git chromedriver google-chrome slack-desktop git-core
# Set zsh to default shell
chsh -s $(which zsh)
# TLP and Docker
sudo tlp start
systemctl enable tlp.service
systemctl enable tlp-sleep.service
systemctl mask systemd-rfkill.service
systemctl start docker
systemctl enable docker
sudo usermod -aG docker $USER
su - $USER
# Copy xfce terminal config
cp terminalrc $HOME/.config/xfce4/terminal
# Install python apps
sudo pip install --upgrade virtualenvwrapper flake8-bugbear jedi ipython  bandit pylint pydocstyle pipenv radon autopep8 isort
mkdir -p ~/.config/nvim
# Copy dotfiles
cp .zshrc ~/
cp .gitconfig ~/
cp .tmux.conf ~/
cp init.vim ~/.config/nvim
cp local_init.vim ~/.config/nvim
cp local_bundles.vim ~/.config/nvim
cp .vimrc ~/
cp .vimrc.local ~/
cp .vimrc.local.bundles ~/
sleep 1
git clone https://github.com/tmux-plugins/tpm $HOME/.tmux/plugins/tpm
cd ~
tmux source $HOME/.tmux.conf
# Install fonts
mkdir -p ~/.local/share/fonts
cd ~/.local/share/fonts && curl -fLo "Knack Regular Nerd Font Complete Mono.ttf" https://raw.githubusercontent.com/ryanoasis/nerd-fonts/master/patched-fonts/Hack/Regular/complete/Knack%20Regular%20Nerd%20Font%20Complete%20Mono.ttf
# Setup GO
cd ~
mkdir -p go
mkdir -p go/{src,bin}
go get -u github.com/golang/dep/cmd/dep
go get -u github.com/derekparker/delve/cmd/dlv
go get -u github.com/kardianos/govendor
go get -u golang.org/x/tools/cmd/present
go get -u github.com/alecthomas/gometalinter
gometalinter -i
