"""Historial en SQLite: visitas de clientes, alertas y ocupación por minuto."""
from __future__ import annotations

import sqlite3
import threading
import time

ESQUEMA = """
CREATE TABLE IF NOT EXISTS sesiones (
    id INTEGER PRIMARY KEY,
    mesa TEXT NOT NULL,
    inicio REAL NOT NULL,
    fin REAL NOT NULL,
    espera_atencion REAL,      -- segundos hasta la primera visita (NULL si nunca la hubo)
    visitas INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS limpiezas (
    id INTEGER PRIMARY KEY,
    mesa TEXT NOT NULL,
    inicio REAL NOT NULL,      -- cuando se fueron los clientes
    fin REAL NOT NULL          -- cuando se limpió
);
CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY,
    tipo TEXT NOT NULL,
    mesa TEXT,
    mensaje TEXT,
    detalle TEXT,
    inicio REAL NOT NULL,
    fin REAL
);
CREATE TABLE IF NOT EXISTS muestras (
    t REAL PRIMARY KEY,
    ocupadas INTEGER NOT NULL,
    total INTEGER NOT NULL,
    fila INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS i_sesiones_inicio ON sesiones(inicio);
CREATE INDEX IF NOT EXISTS i_muestras_t ON muestras(t);
"""


class Almacen:
    def __init__(self, ruta: str):
        self.con = sqlite3.connect(ruta, check_same_thread=False)
        self.con.row_factory = sqlite3.Row
        self.lock = threading.Lock()
        self._ids_alerta: dict[int, int] = {}
        self._cache_duracion: dict[str, tuple[float, float | None]] = {}
        with self.lock:
            self.con.executescript(ESQUEMA)

    def _ejecutar(self, sql: str, params=()) -> sqlite3.Cursor:
        with self.lock:
            cur = self.con.execute(sql, params)
            self.con.commit()
            return cur

    def consultar(self, sql: str, params=()) -> list[sqlite3.Row]:
        with self.lock:
            return self.con.execute(sql, params).fetchall()

    # ------------------------------------------------------------ escritura
    def sesion(self, mesa, inicio, fin, espera, visitas):
        self._ejecutar(
            "INSERT INTO sesiones(mesa, inicio, fin, espera_atencion, visitas) VALUES (?,?,?,?,?)",
            (mesa, inicio, fin, espera, visitas),
        )
        self._cache_duracion.pop(mesa, None)

    def limpieza(self, mesa, inicio, fin):
        self._ejecutar("INSERT INTO limpiezas(mesa, inicio, fin) VALUES (?,?,?)", (mesa, inicio, fin))

    def alerta_abierta(self, a):
        cur = self._ejecutar(
            "INSERT INTO alertas(tipo, mesa, mensaje, detalle, inicio) VALUES (?,?,?,?,?)",
            (a.tipo, a.mesa, a.mensaje, a.detalle, a.inicio),
        )
        self._ids_alerta[a.id] = cur.lastrowid

    def alerta_cerrada(self, a):
        fila = self._ids_alerta.pop(a.id, None)
        if fila is not None:
            self._ejecutar("UPDATE alertas SET fin=?, mensaje=?, detalle=? WHERE id=?",
                           (a.fin, a.mensaje, a.detalle, fila))

    def muestra(self, t, ocupadas, total, fila):
        self._ejecutar("INSERT OR REPLACE INTO muestras(t, ocupadas, total, fila) VALUES (?,?,?,?)",
                       (t, ocupadas, total, fila))

    # -------------------------------------------------------------- lectura
    def duracion_media(self, mesa: str) -> float | None:
        """Duración media de las últimas 50 visitas a la mesa (cacheada 5 min)."""
        ahora = time.monotonic()
        cache = self._cache_duracion.get(mesa)
        if cache and ahora - cache[0] < 300:
            return cache[1]
        filas = self.consultar(
            "SELECT AVG(fin - inicio) AS d, COUNT(*) AS n FROM "
            "(SELECT fin, inicio FROM sesiones WHERE mesa=? ORDER BY inicio DESC LIMIT 50)",
            (mesa,),
        )
        valor = filas[0]["d"] if filas and filas[0]["n"] >= 3 else None
        self._cache_duracion[mesa] = (ahora, valor)
        return valor
