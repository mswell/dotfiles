# Install apps
pacaur -S ctags ncurses curl tmux neovim python-neovim python-pip zsh xclip phantomjs git termite autojump tree docker-compose docker geckodriver go tlp tlp-rdw ttf-dejavu gvim powerline-fonts ttf-ancient-fonts the_silver_searcher tp_smapi acpi_call gimp xdg-utils xf86-video-intel
sleep 1
pacaur -S spotify zeal oh-my-zsh-git  papirus-icon-theme-git la-capitaine-icon-theme  osx-arc-darker chromedriver google-chrome slack-desktop
# Set zsh to default shell
chsh -s $(which zsh)
# Install python apps
sudo pip install --upgrade virtualenvwrapper flake8-bugbear jedi ipython  bandit pylint pydocstyle pipenv radon autopep8 isort
mkdir -p $HOME/.config/nvim
# Copy dotfiles
cp ../../config/zsh/.zshrc $HOME/
cp ../../config/git/.gitconfig $HOME/
cp ../../config/tmux/.tmux.conf $HOME/
cp ../../config/nvim/init.vim $HOME/.config/nvim
cp ../../config/nvim/local_init.vim $HOME/.config/nvim
cp ../../config/nvim/local_bundles.vim $HOME/.config/nvim
cp ../../config/vim/.vimrc $HOME/
cp ../../config/vim/.vimrc.local $HOME/
cp ../../config/vim/.vimrc.local.bundles $HOME/
sleep 1
git clone https://github.com/tmux-plugins/tpm $HOME/.tmux/plugins/tpm
cd ~
tmux source $HOME/.tmux.conf
# Install fonts
mkdir -p $HOME/.local/share/fonts
cd $HOME/.local/share/fonts && curl -fLo "Knack Regular Nerd Font Complete Mono.ttf" https://github.com/ryanoasis/nerd-fonts/blob/master/patched-fonts/Hack/Regular/complete/Hack%20Regular%20Nerd%20Font%20Complete%20Mono.ttf
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
# TLP and Docker
sudo tlp start
systemctl enable tlp.service
systemctl enable tlp-sleep.service
systemctl mask systemd-rfkill.service
systemctl start docker
systemctl enable docker
sudo usermod -aG docker $USER
su - $USER
