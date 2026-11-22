"""Punto de entrada:  python -m mesas --config config.json   |   python -m mesas --demo"""
import argparse
import shutil
import threading
import webbrowser
from pathlib import Path

import uvicorn

from . import notificar
from .servidor import Sistema, crear_app, ip_local

RAIZ = Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser(description="Mesas IA: monitoreo de mesas con cámaras")
    ap.add_argument("--config", help="archivo de configuración (config.json)")
    ap.add_argument("--demo", action="store_true", help="restaurante simulado, sin cámaras")
    ap.add_argument("--presentacion", action="store_true",
                    help="demostración en vivo con la webcam o el móvil: tiempos cortos y pantalla de presentación")
    ap.add_argument("--fuente", help="cámara a usar: 0 = webcam, 1 = otra cámara USB, o la URL del móvil/cámara IP")
    ap.add_argument("--velocidad", type=float, default=10, help="en demo: cuántas veces más rápido corre el tiempo")
    ap.add_argument("--sin-navegador", action="store_true", help="no abrir el navegador al arrancar")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--puerto", type=int, default=8000)
    a = ap.parse_args()
    if a.presentacion and not a.config:
        # copia de trabajo para que calibrar no modifique la plantilla
        a.config = str(RAIZ / "presentacion.json")
        if not Path(a.config).exists():
            shutil.copy(RAIZ / "config.presentacion.json", a.config)
    if a.config and not Path(a.config).exists() and Path(a.config).name == "config.json":
        # primera vez en el restaurante: configuración vacía, se completa desde /instalar
        shutil.copy(RAIZ / "config.inicial.json", a.config)
    if not a.demo and not a.config:
        ap.error("indica --config config.json, --presentacion para una demo en vivo, o --demo para probar sin cámaras")

    sistema = Sistema(a.config, a.demo, a.velocidad if a.demo else 1, a.fuente)
    sistema.iniciar()
    red = f"http://{ip_local()}:{a.puerto}"
    print()
    print("  Mesas IA funcionando.")
    print(f"  En este ordenador:   http://localhost:{a.puerto}/conectar")
    print(f"  Desde el móvil (misma wifi):   {red}")
    print("  Para pararlo, cierra esta ventana.")
    print()
    if not a.demo and not a.presentacion:
        notificar.mensaje(sistema.cfg["notificaciones"],
                          f"✅ Mesas IA está en marcha en {sistema.cfg['restaurante']}.\nPanel: {red}")
    if not a.sin_navegador:
        pagina = "instalar" if not a.demo and not sistema.cfg["camaras"] else "conectar"
        threading.Timer(2.5, lambda: webbrowser.open(f"http://localhost:{a.puerto}/{pagina}")).start()
    uvicorn.run(crear_app(sistema, a.puerto), host=a.host, port=a.puerto, log_level="warning")


if __name__ == "__main__":
    main()
