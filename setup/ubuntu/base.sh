#!/bin/bash

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

red=`tput setaf 1`
green=`tput setaf 2`
yellow=`tput setaf 3`
reset=`tput sgr0`


echo "${yellow}[+] Install base-dev libs ... ${reset}"
# Combined package installation (removed duplicates: build-essential, git)
sudo apt install -y \
	build-essential \
	git \
	vim \
	xclip \
	curl \
	fzf \
	wget \
	python3 \
	python3-pip \
	gcc \
	cmake \
	ruby \
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
	prips ${DEBUG_STD:+$DEBUG_STD}
echo "${yellow}[*] Done. ${reset}"
