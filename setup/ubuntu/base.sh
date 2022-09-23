#!/bin/sh

#--- Cores
red=`tput setaf 1`
green=`tput setaf 2`
yellow=`tput setaf 3`
reset=`tput sgr0`

#---- script

echo "${yellow}[+] Instalando base-dev libs ... ${reset}"
sudo apt install -y build-essential \
	            git \
		    vim \
		    xclip \
		    curl \
		    wget
sudo apt install -y python3 \
	            python3-pip \
		    build-essential \
		    gcc \
		    cmake \
		    ruby \
		    git \
		    curl \
		    libpcap-dev \
		    zip \
		    python3-dev \
		    pv \
		    dnsutils \
		    libssl-dev \
		    libffi-dev \
		    libxml2-dev \
		    libxslt1-dev \
		    zlib1g-dev \
		    jq \
		    apt-transport-https \
		    xvfb \
		    prips $DEBUG_STD
echo "${yellow}[*] Feito. ${reset}"
