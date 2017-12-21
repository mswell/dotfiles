#!/bin/sh

pacaur -S termite
mkdir $HOME/.config/termite
cp ../termite_config $HOME/.config/termite/config
