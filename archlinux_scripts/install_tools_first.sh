pacaur -R google-chromium

echo "Install applications"
pacaur -S papirus-icon-theme-git ant-dracula-gtk-theme chromedriver rofi google-chrome slack-desktop go git-core ctags ncurses curl spotify python-pip zsh xclip phantomjs git autojump tree docker-compose docker geckodriver tlp tlp-rdw ttf-dejavu gvim powerline-fonts ttf-ancient-fonts the_silver_searcher xfce4-clipman-plugin

echo "Start TLP"
sudo tlp start

echo "Start and enable docker"
systemctl start docker
systemctl enable docker
sudo usermod -aG docker $USER

sudo pip install virtualenvwrapper flake8-bugbear jedi ipython  bandit pylint pydocstyle pipenv radon


echo "Docker compose"
pacaur -S docker-compose
