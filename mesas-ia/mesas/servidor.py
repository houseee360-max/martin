"""Servidor web: panel en vivo, calibración de zonas, reporte y API."""
from __future__ import annotations

import asyncio
import copy
import io
import socket
import threading
import time
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse

from . import config as cfgmod
from . import notificar, reporte
from .almacen import Almacen
from .motor import Motor

WEB = Path(__file__).resolve().parent.parent / "web"

CONFIG_DEMO = {
    "restaurante": "Restaurante de demostración",
    "camaras": [],
    "mesas": [
        {"id": f"M{i}", "nombre": f"Mesa {i:02d}", "capacidad": c, "plano": p}
        for i, (c, p) in enumerate(
            [(4, [0.28, 0.2]), (4, [0.72, 0.2]), (2, [0.28, 0.5]),
             (4, [0.72, 0.5]), (6, [0.28, 0.8]), (4, [0.72, 0.8])], start=1)
    ],
    "deteccion": {"detectar_objetos": True},
    "base_datos": "demo.db",
}


def ip_local() -> str:
    """IP de este equipo en la wifi/red local (no envía nada por la red)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


class Sistema:
    def __init__(self, ruta_cfg: str | None, demo: bool, velocidad: float, fuente: str | None = None):
        self.ruta_cfg = ruta_cfg
        self.demo = demo
        self.cfg = cfgmod.cargar(ruta_cfg) if ruta_cfg else cfgmod.normalizar(CONFIG_DEMO)
        if fuente is not None and self.cfg["camaras"]:
            # solo en memoria: no se escribe en el archivo de configuración
            self.cfg["camaras"][0]["fuente"] = fuente
        self.almacen = Almacen(self.cfg["base_datos"])
        self.motor = Motor(self.cfg, self.almacen, notificar.crear(self.cfg["notificaciones"]))
        self.motor.ahora = time.time()
        for mesa in self.motor.mesas.values():
            mesa.desde = self.motor.ahora
        self.camaras = {}
        self.detector = None
        self.simulador = None
        if demo:
            from .simulador import Simulador, generar_historial

            generar_historial(self.almacen, self.cfg, time.time())
            self.simulador = Simulador(self.motor, self.cfg, velocidad)
            self.reloj = self.simulador.ahora
        else:
            self.reloj = time.time

    def iniciar(self):
        if self.simulador:
            self.simulador.start()
        elif self.cfg["camaras"]:
            from .vision import Camara, Detector

            print(f"Cargando modelo {self.cfg['deteccion']['modelo']}...")
            self.detector = Detector(self.cfg["deteccion"])
            for c in self.cfg["camaras"]:
                cam = Camara(c, self)
                self.camaras[c["id"]] = cam
                cam.start()
        threading.Thread(target=self._muestreo, daemon=True, name="muestreo").start()

    def _muestreo(self):
        """Guarda cuántas mesas hay ocupadas una vez por minuto (para el reporte)."""
        ultimo = None
        while True:
            t = self.reloj()
            minuto = int(t // 60)
            if minuto != ultimo:
                ultimo = minuto
                r = self.motor.resumen()
                self.almacen.muestra(minuto * 60, r["ocupadas"], r["total"], r["fila"]["personas"])
            time.sleep(0.5)

    def estado(self) -> dict:
        r = self.motor.resumen()
        r["ahora"] = self.reloj()
        r["restaurante"] = self.cfg["restaurante"]
        r["demo"] = self.demo
        r["plano"] = {m["id"]: m.get("plano") for m in self.cfg["mesas"]}
        r["camaras"] = [
            {"id": cid, "nombre": c.cfg["nombre"], "ok": c.ok, "error": c.error}
            for cid, c in self.camaras.items()
        ]
        return r


def crear_app(sistema: Sistema, puerto: int = 8000) -> FastAPI:
    app = FastAPI(title="Mesas IA")

    @app.get("/conectar")
    def conectar():
        return FileResponse(WEB / "conectar.html")

    @app.get("/api/conexion")
    def conexion():
        return {"base": f"http://{ip_local()}:{puerto}", "presentacion": sistema.ruta_cfg is not None and not sistema.demo}

    @app.get("/api/qr.svg")
    def qr(texto: str):
        import qrcode
        import qrcode.image.svg

        b = io.BytesIO()
        qrcode.make(texto, image_factory=qrcode.image.svg.SvgPathImage, border=2).save(b)
        return Response(b.getvalue(), media_type="image/svg+xml")

    @app.get("/")
    def panel():
        return FileResponse(WEB / "index.html")

    @app.get("/calibrar")
    def calibrar():
        return FileResponse(WEB / "calibrar.html")

    @app.get("/presentacion")
    def presentacion():
        return FileResponse(WEB / "presentacion.html")

    @app.post("/api/reiniciar")
    def reiniciar():
        sistema.motor.reiniciar()
        return {"ok": True}

    @app.get("/api/estado")
    def estado():
        return sistema.estado()

    @app.post("/api/alertas/{alerta_id}/vista")
    def vista(alerta_id: int):
        if not sistema.motor.marcar_vista(alerta_id):
            raise HTTPException(404, "No existe esa alerta")
        return {"ok": True}

    @app.get("/api/reporte")
    def ver_reporte(dias: int = 7):
        return reporte.generar(sistema.almacen, sistema.cfg, sistema.reloj(), dias)

    @app.get("/api/config")
    def ver_config():
        cfg = copy.deepcopy(sistema.cfg)
        notif = cfg.get("notificaciones") or {}
        if notif.get("telegram_token"):
            notif["telegram_token"] = "********"
        for c in cfg["camaras"]:  # no mostrar contraseñas de las cámaras
            c["fuente"] = "(oculta)"
        return cfg

    @app.put("/api/config/zonas")
    def guardar_zonas(datos: dict = Body(...)):
        """Guarda las mesas (polígonos, nombres, plano) y la zona de entrada."""
        if not sistema.ruta_cfg:
            raise HTTPException(400, "En modo demo no se guarda la configuración")
        nuevo = copy.deepcopy(sistema.cfg)
        nuevo["mesas"] = datos.get("mesas", nuevo["mesas"])
        nuevo["entrada"] = datos.get("entrada", nuevo.get("entrada"))
        try:
            nuevo = cfgmod.normalizar(nuevo)
        except ValueError as e:
            raise HTTPException(400, str(e))
        original = cfgmod.cargar(sistema.ruta_cfg)
        original["mesas"], original["entrada"] = nuevo["mesas"], nuevo["entrada"]
        cfgmod.guardar(sistema.ruta_cfg, original)
        sistema.cfg = nuevo
        sistema.motor.recargar(nuevo)
        return {"ok": True}

    @app.post("/api/notificaciones/prueba")
    def prueba_notif():
        return {"resultado": notificar.prueba(sistema.cfg["notificaciones"])}

    def _camara(cid):
        cam = sistema.camaras.get(cid)
        if cam is None:
            raise HTTPException(404, "No existe esa cámara")
        return cam

    @app.get("/api/camaras/{cid}/foto")
    def foto(cid: str, anotada: bool = False):
        cam = _camara(cid)
        jpeg = cam.jpeg_anotado if anotada else cam.jpeg_crudo
        if not jpeg:
            return JSONResponse({"error": cam.error or "todavía no hay imagen"}, status_code=503)
        return Response(jpeg, media_type="image/jpeg", headers={"Cache-Control": "no-store"})

    @app.get("/api/camaras/{cid}/video")
    async def video(cid: str):
        cam = _camara(cid)

        async def frames():
            ultimo = None
            while True:
                jpeg = cam.jpeg_anotado
                if jpeg and jpeg is not ultimo:
                    ultimo = jpeg
                    yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
                await asyncio.sleep(0.2)

        return StreamingResponse(frames(), media_type="multipart/x-mixed-replace; boundary=frame")

    return app
