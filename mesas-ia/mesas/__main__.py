"""Punto de entrada:  python -m mesas --config config.json   |   python -m mesas --demo"""
import argparse

import uvicorn

from .servidor import Sistema, crear_app


def main():
    ap = argparse.ArgumentParser(description="Mesas IA: monitoreo de mesas con cámaras")
    ap.add_argument("--config", help="archivo de configuración (config.json)")
    ap.add_argument("--demo", action="store_true", help="restaurante simulado, sin cámaras")
    ap.add_argument("--velocidad", type=float, default=10, help="en demo: cuántas veces más rápido corre el tiempo")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--puerto", type=int, default=8000)
    a = ap.parse_args()
    if not a.demo and not a.config:
        ap.error("indica --config config.json, o usa --demo para probar sin cámaras")

    sistema = Sistema(a.config, a.demo, a.velocidad if a.demo else 1)
    sistema.iniciar()
    print(f"Panel: http://localhost:{a.puerto}   ·   Calibrar zonas: http://localhost:{a.puerto}/calibrar")
    uvicorn.run(crear_app(sistema), host=a.host, port=a.puerto, log_level="warning")


if __name__ == "__main__":
    main()
