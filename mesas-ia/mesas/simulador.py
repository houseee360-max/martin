"""Restaurante simulado para probar el sistema sin cámaras (modo --demo).

Genera lo mismo que generarían las cámaras: cuántas personas hay en la zona de
cada mesa (clientes + mozo) y en la entrada. El motor no sabe que es simulado.
"""
from __future__ import annotations

import math
import random
import threading
import time
from datetime import datetime

from .motor import Muestra


class _MesaSim:
    def __init__(self, cfg):
        self.id = cfg["id"]
        self.capacidad = cfg.get("capacidad", 4)
        self.clientes = 0
        self.sucia = False
        self.objetos = 0
        self.salida = 0.0
        self.proxima_visita = None  # (inicio, fin)
        self.visitas_hechas = 0
        self.limpieza = None  # (inicio, fin)


class Simulador(threading.Thread):
    def __init__(self, motor, cfg, velocidad: float = 1.0, semilla: int | None = None):
        super().__init__(daemon=True, name="simulador")
        self.motor = motor
        self.cfg = cfg
        self.velocidad = velocidad
        self.rng = random.Random(semilla)
        self.t = time.time()
        self.mesas = [_MesaSim(m) for m in cfg["mesas"]]
        self.fila: list[int] = []  # tamaños de grupos esperando
        self._parar = threading.Event()

    def ahora(self) -> float:
        return self.t

    def parar(self):
        self._parar.set()

    def run(self):
        while not self._parar.is_set():
            pasos = max(1, round(self.velocidad))
            for _ in range(pasos):
                self.paso(1.0)
            time.sleep(max(0.05, pasos / self.velocidad))

    # ------------------------------------------------------------------ mundo
    def _sentar(self, m: _MesaSim, grupo: int):
        t, r = self.t, self.rng
        m.clientes = grupo
        m.salida = t + r.uniform(20, 55) * 60
        # 1 de cada 4 mesas espera más de 5 minutos al mozo (para ver la alerta)
        espera = r.uniform(5.5, 8) * 60 if r.random() < 0.25 else r.uniform(40, 200)
        m.proxima_visita = (t + espera, t + espera + r.uniform(20, 50))
        m.visitas_hechas = 0
        m.objetos = 0

    def paso(self, dt: float):
        self.t += dt
        t, r = self.t, self.rng

        for m in self.mesas:
            libre_y_limpia = m.clientes == 0 and not m.sucia
            if libre_y_limpia:
                if self.fila:
                    self._sentar(m, self.fila.pop(0))
                elif r.random() < 1 / 420:  # llega un grupo directo a la mesa
                    self._sentar(m, r.randint(1, m.capacidad))
            elif m.clientes and t >= m.salida:
                m.clientes = 0
                m.sucia = True
                m.proxima_visita = None
                # a veces tardan en limpiar (alerta "falta limpiar")
                demora = r.uniform(2.5, 4) * 60 if r.random() < 0.3 else r.uniform(20, 90)
                m.limpieza = (t + demora, t + demora + r.uniform(15, 40))
            elif m.sucia and m.limpieza and t >= m.limpieza[1]:
                m.sucia = False
                m.objetos = 0
                m.limpieza = None
            if m.clientes and m.proxima_visita and t >= m.proxima_visita[1]:
                m.visitas_hechas += 1
                m.objetos = r.randint(2, 2 + m.clientes * 2)
                ini = t + r.uniform(6, 14) * 60
                m.proxima_visita = (ini, ini + r.uniform(15, 40))

        # la gente de la entrada: más grupos cuando el local está lleno
        if not any(m.clientes == 0 and not m.sucia for m in self.mesas) and r.random() < 1 / 300:
            self.fila.append(r.randint(2, 4))
        if self.fila and r.random() < 1 / 1500:  # alguien se cansa y se va
            self.fila.pop(0)

        # lo que "vería" la cámara (con algún fallo de detección ocasional)
        for m in self.mesas:
            personas = m.clientes
            if m.proxima_visita and m.proxima_visita[0] <= t < m.proxima_visita[1]:
                personas += 1  # mozo
            if m.limpieza and m.limpieza[0] <= t < m.limpieza[1]:
                personas += 1  # quien limpia
            if personas and r.random() < 0.04:
                personas -= 1
            self.motor.observar(m.id, Muestra(t, personas, 0, m.objetos if (m.clientes or m.sucia) else 0))
        self.motor.observar_entrada(t, sum(self.fila))


def generar_historial(almacen, cfg, hasta: float, dias: int = 7, semilla: int = 7) -> None:
    """Llena la base con una semana inventada para que el reporte tenga datos."""
    if almacen.consultar("SELECT COUNT(*) AS n FROM muestras")[0]["n"] > 0:
        return
    r = random.Random(semilla)
    mesas = cfg["mesas"]
    total = len(mesas)

    def demanda(ts):
        d = datetime.fromtimestamp(ts)
        h = d.hour + d.minute / 60
        fin_de_semana = 1.25 if d.weekday() >= 4 else 1.0
        almuerzo = math.exp(-((h - 13.5) ** 2) / 1.2)
        cena = math.exp(-((h - 21.3) ** 2) / 1.5)
        abierto = 12 <= h < 16 or 19.5 <= h < 24
        return min(1.0, (0.85 * almuerzo + 0.95 * cena) * fin_de_semana) if abierto else 0.0

    paso = 300
    inicio = hasta - dias * 86400
    t = inicio - inicio % paso
    sesiones, muestras, limpiezas = [], [], []
    ocupada_hasta = {m["id"]: 0.0 for m in mesas}
    while t < hasta:
        dem = demanda(t)
        for m in mesas:
            if ocupada_hasta[m["id"]] <= t and r.random() < dem * 0.35:
                dur = r.uniform(30, 70) * 60
                espera = r.uniform(1, 4) * 60 if r.random() > 0.2 * (1 + dem) else r.uniform(5, 10) * 60
                sesiones.append((m["id"], t, t + dur, espera, r.randint(2, 5)))
                limpieza = r.uniform(1, 5) * 60
                limpiezas.append((m["id"], t + dur, t + dur + limpieza))
                ocupada_hasta[m["id"]] = t + dur + limpieza
        ocupadas = sum(1 for v in ocupada_hasta.values() if v > t and dem > 0)
        fila = r.randint(1, 6) if ocupadas == total and dem > 0.8 else 0
        muestras.append((t, ocupadas, total, fila))
        t += paso
    with almacen.lock:
        almacen.con.executemany(
            "INSERT INTO sesiones(mesa, inicio, fin, espera_atencion, visitas) VALUES (?,?,?,?,?)", sesiones)
        almacen.con.executemany("INSERT INTO limpiezas(mesa, inicio, fin) VALUES (?,?,?)", limpiezas)
        almacen.con.executemany("INSERT OR REPLACE INTO muestras(t, ocupadas, total, fila) VALUES (?,?,?,?)", muestras)
        almacen.con.commit()
