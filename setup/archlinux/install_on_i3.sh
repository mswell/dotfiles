# install pacaur

echo "Using Pacaur as Arch package manager"
sudo pacman -Syu --noconfirm pacaur

echo "Installing base-dev libs"
sudo pacman -Syu --noconfirm git vim
sudo pacman -Syu --noconfirm base-devel

# Install apps

pacaur -S --noconfirm --needed papirus-icon-theme-git ncurses python-pip zsh xclip autojump docker-compose docker tlp tlp-rdw ttf-dejavu gvim

sudo pip install virtualenvwrapper jedi ipython pylint pydocstyle pipenv

pacaur -S --noconfirm --needed ctags curl neovim python-neovim git tree docker geckodriver go tlp tlp-rdw ttf-dejavu gvim powerline-fonts ttf-ancient-fonts the_silver_searcher tp_smapi acpi_call gimp xdg-utils xf86-video-intel
sleep 1
pacaur -S spotify zeal oh-my-zsh-git   la-capitaine-icon-theme  osx-arc-darker chromedriver google-chrome slack-desktop

echo "Installing useful Apps"

# install useful desktop apps
pacaur -S --noconfirm --noedit google-chrome slack-desktop termite ttf-vista-fonts wps-office inkscape etcher

pacman -S --noconfirm --needed $(pacman -Ss ttf | grep -v ^" " | awk '{print $1}') && fc-cache 

# software from 'normal' repositories
pacaur -S --noconfirm --needed darktable dconf-editor tmux htop
pacaur -S --noconfirm --needed evince evolution filezilla firefox
pacaur -S --noconfirm --needed gimp git
pacaur -S --noconfirm --needed gparted gpick grsync
pacaur -S --noconfirm --needed transmission-cli transmission-gtk
pacaur -S --noconfirm --needed vlc wget unclutter curl
echo "Install applications"
pacaur -S --noconfirm --needed  python-pip zsh xclip autojump docker-compose docker tlp tlp-rdw ttf-dejavu gvim

sudo pip install virtualenvwrapper jedi ipython pylint pydocstyle pipenv

echo "Start TLP"
sudo tlp start

# installation of zippers and unzippers
pacaur -S --noconfirm --needed unace unrar zip unzip sharutils  uudeview  arj cabextract file-roller

echo "Installing tools for developers"

# python and neovim dependencies
sudo pacman -Syu --noconfirm python python-setuptools
sudo easy_install pip
sudo pip install neovim
mkdir $HOME/.config/nvim

# install base packages
pacaur -S --noconfirm --noedit ctags ncurses emacs curl unzip neovim go tmux htop fzf xsel silver-searcher-git tree exa dconf ranger

# install spacemacs

git clone https://github.com/syl20bnr/spacemacs ~/.emacs.d
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
# Setup Rofi

mkdir -p $HOME/.config/rofi
mkdir -p $HOME/.local/share/rofi


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

# Install Zsh

sh -c "$(wget https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O -)"
echo "Now type \`chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
chsh -s $(which zsh)

git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/dracula/zsh.git
mv zsh/dracula.zsh-theme ${ZSH_CUSTOM:-~/.oh-my-zsh/themes}
rm -fr zsh

sudo chsh -s /usr/bin/zsh

echo "----------- ZSH -----------"
echo "Now type \`sudo chsh -s $(which zsh)\` to zsh becomes default."
echo "Logout and login to effective your changes."
# TLP and Docker
sudo tlp start
systemctl enable tlp.service
systemctl enable tlp-sleep.service
systemctl mask systemd-rfkill.service
systemctl start docker
systemctl enable docker
sudo usermod -aG docker $USER
su - $USER
