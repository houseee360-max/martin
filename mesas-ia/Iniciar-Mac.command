#!/bin/bash
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo
  echo "  No encuentro Python. Instálalo desde https://www.python.org/downloads/ y vuelve a abrir este archivo."
  open "https://www.python.org/downloads/" 2>/dev/null
  read -p "  Pulsa Enter para cerrar..." _
  exit 1
fi
if [ ! -f .venv/instalado.txt ]; then
  echo
  echo "  Primera vez: instalando lo necesario. Tarda unos minutos, no cierres la ventana..."
  echo
  python3 -m venv .venv || { read -p "  Falló. Pulsa Enter..." _; exit 1; }
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r requirements.txt || { echo "  Algo falló: haz una captura y envíamela."; read -p "  Pulsa Enter..." _; exit 1; }
  echo ok > .venv/instalado.txt
fi
echo
echo "  Arrancando Mesas IA con la webcam... (la primera vez descarga el modelo, 5 MB)"
.venv/bin/python -m mesas --presentacion "$@"
read -p "  Mesas IA se ha detenido. Pulsa Enter para cerrar..." _
