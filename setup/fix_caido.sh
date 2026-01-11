#!/bin/bash

# Script para corrigir o Caido no Hyprland + Nvidia
# Força o uso do XWayland para evitar janelas invisíveis e mantém aceleração de GPU

DESKTOP_DIR="$HOME/.local/share/applications"
FILE_PATH="$DESKTOP_DIR/caido.desktop"

echo "Instalando correção para o Caido..."

# Garante que o diretório existe
mkdir -p "$DESKTOP_DIR"

# Cria o arquivo .desktop modificado
cat <<EOF > "$FILE_PATH"
[Desktop Entry]
Name=Caido
Exec=env -u ELECTRON_OZONE_PLATFORM_HINT WAYLAND_DISPLAY="" caido %U
Terminal=false
Type=Application
Icon=caido
StartupWMClass=Caido
Comment=Official desktop application for Caido (Hyprland Fix)
Categories=Network;
EOF

chmod +x "$FILE_PATH"

echo "--------------------------------------------------"
echo "Sucesso! O atalho foi criado em:"
echo "$FILE_PATH"
echo "Agora você pode abrir o Caido normalmente pelo seu menu (rofi/tofi/wofi)."
echo "--------------------------------------------------"
