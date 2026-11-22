#!/bin/bash
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "  No encuentro Python. Instálalo desde https://www.python.org/downloads/ y vuelve a abrir este archivo."
  open "https://www.python.org/downloads/" 2>/dev/null
  read -p "  Pulsa Enter para cerrar..." _
  exit 1
fi
if [ ! -f .venv/instalado.txt ]; then
  echo "  Primera vez: instalando lo necesario. Tarda unos minutos, no cierres la ventana..."
  python3 -m venv .venv || { read -p "  Falló. Pulsa Enter..." _; exit 1; }
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r requirements.txt || { echo "  Algo falló: haz una captura y envíamela."; read -p "  Pulsa Enter..." _; exit 1; }
  echo ok > .venv/instalado.txt
fi
while true; do
  echo "  Mesas IA en marcha. Minimiza esta ventana, pero NO la cierres."
  .venv/bin/python -m mesas --config config.json "$@"
  echo "  Mesas IA se detuvo. Vuelve a arrancar en 10 segundos (cierra la ventana para pararlo del todo)..."
  sleep 10
done
