"""Lectura de cámaras y detección de personas y vajilla con YOLO."""
from __future__ import annotations

import os
import sys
import threading
import time

os.environ.setdefault("OPENCV_LOG_LEVEL", "OFF")  # sin avisos técnicos de OpenCV en la ventana
import cv2  # noqa: E402
import numpy as np

from .motor import ATENDIDA, LIBRE, OCUPADA, POR_LIMPIAR, Muestra

PERSONA = 0
# clases COCO de vajilla y comida que delatan una mesa sin levantar
VAJILLA = [39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55]

# colores BGR por estado
COLORES = {
    LIBRE: (94, 197, 34),
    OCUPADA: (68, 68, 239),
    ATENDIDA: (60, 60, 200),
    POR_LIMPIAR: (11, 158, 245),
}


class Detector:
    """Un modelo YOLO compartido entre cámaras."""

    def __init__(self, cfg_det: dict):
        from ultralytics import YOLO

        self.cfg = cfg_det
        self.modelo = YOLO(cfg_det["modelo"])
        self.lock = threading.Lock()

    def detectar(self, frame):
        clases = [PERSONA] + (VAJILLA if self.cfg.get("detectar_objetos") else [])
        with self.lock:
            r = self.modelo.predict(
                frame, classes=clases, conf=self.cfg["confianza"], verbose=False,
                device=self.cfg.get("dispositivo"),
            )[0]
        cajas = r.boxes.xyxy.cpu().numpy().astype(int) if len(r.boxes) else np.zeros((0, 4), int)
        cls = r.boxes.cls.cpu().numpy().astype(int) if len(r.boxes) else np.zeros(0, int)
        personas = [tuple(c) for c, k in zip(cajas, cls) if k == PERSONA]
        objetos = [tuple(c) for c, k in zip(cajas, cls) if k != PERSONA]
        return personas, objetos


def es_personal(frame, caja, cfg_pers: dict) -> bool:
    """El mozo se reconoce por el color del torso (uniforme)."""
    x1, y1, x2, y2 = caja
    alto, ancho = y2 - y1, x2 - x1
    tx1, tx2 = x1 + int(ancho * 0.2), x2 - int(ancho * 0.2)
    ty1, ty2 = y1 + int(alto * 0.2), y1 + int(alto * 0.55)
    torso = frame[max(ty1, 0):max(ty2, 0), max(tx1, 0):max(tx2, 0)]
    if torso.size == 0:
        return False
    hsv = cv2.cvtColor(torso, cv2.COLOR_BGR2HSV)
    mascara = cv2.inRange(hsv, np.array(cfg_pers["hsv_min"]), np.array(cfg_pers["hsv_max"]))
    return mascara.mean() / 255 >= cfg_pers["fraccion_min"]


def _punto(caja, modo):
    x1, y1, x2, y2 = caja
    return ((x1 + x2) / 2, y2 if modo == "pie" else (y1 + y2) / 2)


def _fuente(valor):
    if isinstance(valor, int) or (isinstance(valor, str) and valor.isdigit()):
        return int(valor), False
    es_archivo = isinstance(valor, str) and os.path.isfile(valor)
    return valor, es_archivo


class Camara(threading.Thread):
    def __init__(self, cam_cfg: dict, sistema):
        super().__init__(daemon=True, name=f"camara-{cam_cfg['id']}")
        self.cfg = cam_cfg
        self.sistema = sistema
        self.ok = False
        self.error = ""
        self.jpeg_crudo: bytes | None = None
        self.jpeg_anotado: bytes | None = None
        self.tamano = None
        self._parar = threading.Event()

    def parar(self):
        self._parar.set()

    def run(self):
        fuente, es_archivo = _fuente(self.cfg["fuente"])
        cap = None
        ultimo_analisis = 0.0
        while not self._parar.is_set():
            if cap is None or not cap.isOpened():
                if isinstance(fuente, int) and sys.platform == "win32":
                    cap = cv2.VideoCapture(fuente, cv2.CAP_DSHOW)  # abre la webcam más rápido en Windows
                else:
                    cap = cv2.VideoCapture(fuente)
                if not cap.isOpened():
                    self.ok = False
                    self.error = (
                        "no encuentro la webcam (¿está conectada, o la está usando otra app como Zoom o Teams?)"
                        if isinstance(fuente, int) else "no se pudo conectar con la cámara (revisa la dirección)"
                    )
                    time.sleep(5)
                    continue
                fps_video = cap.get(cv2.CAP_PROP_FPS) or 25
            t0 = time.time()
            leido, frame = cap.read()
            if not leido:
                if es_archivo:  # vídeo de prueba: vuelve a empezar
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                self.ok, self.error = False, "se perdió la señal"
                cap.release()
                cap = None
                time.sleep(3)
                continue
            self.ok, self.error = True, ""
            self.tamano = (frame.shape[1], frame.shape[0])
            ahora = time.time()
            if ahora - ultimo_analisis >= 1 / self.cfg["fps_analisis"]:
                ultimo_analisis = ahora
                try:
                    self.analizar(frame, ahora)
                except Exception as e:
                    self.error = f"error al analizar: {e}"
                    print(f"[{self.cfg['id']}] {self.error}")
            if es_archivo:  # reproducir a velocidad real
                time.sleep(max(0, 1 / fps_video - (time.time() - t0)))
        if cap is not None:
            cap.release()

    def analizar(self, frame, t: float):
        cfg = self.sistema.cfg
        alto, ancho = frame.shape[:2]
        escala = np.array([ancho, alto], dtype=np.float32)
        zonas = []  # (id, polígono en píxeles, es_entrada)
        for m in cfg["mesas"]:
            if m.get("camara") == self.cfg["id"] and len(m["poligono"]) >= 3:
                zonas.append((m["id"], (np.array(m["poligono"], np.float32) * escala).astype(np.int32), False))
        entrada = cfg.get("entrada")
        if entrada and entrada.get("camara") == self.cfg["id"] and len(entrada.get("poligono", [])) >= 3:
            zonas.append(("__entrada__", (np.array(entrada["poligono"], np.float32) * escala).astype(np.int32), True))

        personas, objetos = self.sistema.detector.detectar(frame)
        modo_color = cfg["personal"]["modo"] == "color"
        cuenta = {z[0]: {"personas": 0, "personal": 0, "objetos": 0} for z in zonas}
        marcas = []

        def zona_de(punto):
            dentro = [z for z in zonas if cv2.pointPolygonTest(z[1], punto, False) >= 0]
            if not dentro:
                return None
            # si cae en varias zonas, la del centro más cercano
            return min(dentro, key=lambda z: np.linalg.norm(z[1].mean(axis=0) - punto))[0]

        for caja in personas:
            p = _punto(caja, cfg["deteccion"]["punto"])
            staff = modo_color and es_personal(frame, caja, cfg["personal"])
            z = zona_de(p)
            if z is not None:
                cuenta[z]["personal" if staff else "personas"] += 1
            marcas.append((caja, "mozo" if staff else "persona"))
        for caja in objetos:
            z = zona_de(_punto(caja, "centro"))
            if z is not None and z != "__entrada__":
                cuenta[z]["objetos"] += 1
            marcas.append((caja, "objeto"))

        motor = self.sistema.motor
        for zid, c in cuenta.items():
            if zid == "__entrada__":
                motor.observar_entrada(t, c["personas"])
            else:
                motor.observar(zid, Muestra(t, c["personas"], c["personal"], c["objetos"]))

        self.jpeg_crudo = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])[1].tobytes()
        self.jpeg_anotado = self._dibujar(frame.copy(), zonas, marcas)

    def _dibujar(self, img, zonas, marcas) -> bytes:
        estados = {m["id"]: m for m in self.sistema.motor.resumen()["mesas"]}
        capa = img.copy()
        for zid, poli, es_entrada in zonas:
            if es_entrada:
                color, texto = (220, 160, 40), f"ENTRADA · {self.sistema.motor.fila_personas}"
            else:
                e = estados.get(zid, {})
                color = COLORES.get(e.get("estado"), (128, 128, 128))
                texto = f"{e.get('nombre', zid)} · {e.get('estado', '').replace('_', ' ')}"
                if e.get("segundos_sesion") is not None:
                    s = int(e["segundos_sesion"])
                    texto += f" · {s // 60:02d}:{s % 60:02d}"
            cv2.fillPoly(capa, [poli], color)
            cv2.polylines(img, [poli], True, color, 2)
            x, y = poli.min(axis=0)
            cv2.putText(img, texto, (int(x) + 4, int(y) + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3)
            cv2.putText(img, texto, (int(x) + 4, int(y) + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        img = cv2.addWeighted(capa, 0.25, img, 0.75, 0)
        for (x1, y1, x2, y2), tipo in marcas:
            color = {"persona": (255, 255, 255), "mozo": (255, 200, 0), "objeto": (0, 220, 255)}[tipo]
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 1 if tipo == "objeto" else 2)
        return cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 75])[1].tobytes()
