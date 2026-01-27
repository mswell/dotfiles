#!/bin/bash
# Script para instalar temas Gruvbox + Pop!_OS
# Execute com: bash ~/.config/hypr/install-gruvbox-themes.sh

set -e

echo "=== Instalando temas Gruvbox e Pop!_OS ==="
echo ""

# Instalar todos os temas de uma vez
yay -S --needed \
    gruvbox-material-gtk-theme-git \
    pop-gtk-theme \
    gruvbox-plus-icon-theme-git \
    pop-icon-theme \
    bibata-cursor-gruvbox-git \
    kvantum-theme-gruvbox-git

echo ""
echo "=== Instalação concluída! ==="
echo ""
echo "Verificando temas instalados..."
echo ""

echo "GTK Themes:"
ls /usr/share/themes/ | grep -iE "(gruvbox|pop)" || echo "  (nenhum encontrado)"

echo ""
echo "Icon Themes:"
ls /usr/share/icons/ | grep -iE "(gruvbox|pop)" || echo "  (nenhum encontrado)"

echo ""
echo "Kvantum Themes:"
ls /usr/share/Kvantum/ | grep -i gruvbox || echo "  (nenhum encontrado)"

echo ""
echo "Cursor Themes:"
ls /usr/share/icons/ | grep -i bibata-gruvbox || echo "  (nenhum encontrado)"

echo ""
echo "=== Recarregando Hyprland ==="
hyprctl reload

echo ""
echo "Pronto! Os temas foram configurados."
echo "Use 'nwg-look' ou 'lxappearance' para alternar entre temas se necessário."
