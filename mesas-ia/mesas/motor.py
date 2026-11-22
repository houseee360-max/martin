"""Motor de estados de las mesas.

No sabe nada de cámaras: recibe por cada mesa cuántas personas (clientes),
cuánto personal y cuántos objetos (vajilla) se ven en su zona, con la hora,
y decide el estado, los cronómetros y las alertas. Por eso se puede probar
con datos simulados.
"""
from __future__ import annotations

import itertools
import statistics
import threading
from collections import deque
from dataclasses import dataclass, field

LIBRE = "LIBRE"
OCUPADA = "OCUPADA"  # clientes sentados, todavía sin la primera visita
ATENDIDA = "ATENDIDA"  # clientes sentados que ya recibieron una visita
POR_LIMPIAR = "POR_LIMPIAR"

SIN_ATENCION = "SIN_ATENCION"
REATENCION = "REATENCION"
FALTA_LIMPIAR = "FALTA_LIMPIAR"
FILA = "FILA"


def _duracion(s: float) -> str:
    return f"{int(s)} segundos" if s < 60 else f"{int(s // 60)} minutos"


@dataclass
class Muestra:
    t: float
    personas: int
    personal: int = 0
    objetos: int = 0


@dataclass
class Alerta:
    id: int
    tipo: str
    mesa: str | None
    mensaje: str
    detalle: str
    inicio: float
    fin: float | None = None
    vista: bool = False

    def a_dict(self) -> dict:
        return {
            "id": self.id,
            "tipo": self.tipo,
            "mesa": self.mesa,
            "mensaje": self.mensaje,
            "detalle": self.detalle,
            "inicio": self.inicio,
            "activa": self.fin is None,
            "vista": self.vista,
        }


@dataclass
class Mesa:
    id: str
    nombre: str
    capacidad: int = 4
    estado: str = LIBRE
    desde: float = 0.0  # inicio del estado actual
    sesion_inicio: float | None = None
    primera_visita: float | None = None
    ultima_visita: float | None = None
    visitas: int = 0
    historial: deque = field(default_factory=deque)
    extra_desde: float | None = None
    extra_contada: bool = False
    objetos_vistos: bool = False
    alertas: dict = field(default_factory=dict)  # tipo -> Alerta activa
    ultima_muestra: Muestra | None = None


class Motor:
    """Lleva el estado de todas las mesas y la fila de la entrada."""

    def __init__(self, cfg: dict, almacen=None, notificar=None):
        self.lock = threading.RLock()
        self.almacen = almacen
        self.notificar = notificar or (lambda alerta: None)
        self._ids = itertools.count(1)
        self.alertas: list[Alerta] = []
        self.mesas: dict[str, Mesa] = {}
        self.fila_hist: deque = deque()
        self.fila_alerta: Alerta | None = None
        self.fila_personas = 0
        self.ahora = 0.0
        self.recargar(cfg)

    # ------------------------------------------------------------------ config
    def recargar(self, cfg: dict) -> None:
        with self.lock:
            self.cfg = cfg
            self.T = cfg["tiempos"]
            self.modo_personal = cfg["personal"]["modo"] == "color"
            self.usa_objetos = bool(cfg["deteccion"].get("detectar_objetos"))
            nuevas = {}
            for m in cfg["mesas"]:
                mesa = self.mesas.get(m["id"]) or Mesa(id=m["id"], nombre=m["nombre"], desde=self.ahora)
                mesa.nombre = m["nombre"]
                mesa.capacidad = m.get("capacidad", 4)
                nuevas[m["id"]] = mesa
            self.mesas = nuevas

    # ------------------------------------------------------------- utilidades
    def _ventana(self, mesa: Mesa, t: float, segundos: float) -> list[Muestra] | None:
        """Muestras de los últimos `segundos`, o None si todavía no hay tanto historial."""
        if not mesa.historial or mesa.historial[0].t > t - segundos + 1.5:
            return None
        return [m for m in mesa.historial if m.t >= t - segundos]

    @staticmethod
    def _fraccion(muestras: list[Muestra], cond) -> float:
        return sum(1 for m in muestras if cond(m)) / len(muestras) if muestras else 0.0

    def _nueva_alerta(self, tipo: str, mesa: Mesa | None, mensaje: str, detalle: str, t: float) -> Alerta:
        alerta = Alerta(next(self._ids), tipo, mesa.id if mesa else None, mensaje, detalle, t)
        self.alertas.append(alerta)
        self.alertas = [a for a in self.alertas if a.fin is None or t - a.fin < 3600][-200:]
        if mesa is not None:
            mesa.alertas[tipo] = alerta
        if self.almacen:
            self.almacen.alerta_abierta(alerta)
        try:
            self.notificar(alerta)
        except Exception as e:  # una notificación fallida no debe parar el sistema
            print(f"[aviso] no se pudo notificar: {e}")
        return alerta

    def _cerrar_alerta(self, mesa: Mesa, tipo: str, t: float) -> None:
        alerta = mesa.alertas.pop(tipo, None)
        if alerta:
            alerta.fin = t
            if self.almacen:
                self.almacen.alerta_cerrada(alerta)

    def _cambiar(self, mesa: Mesa, estado: str, t: float) -> None:
        mesa.estado = estado
        mesa.desde = t
        mesa.extra_desde = None
        mesa.extra_contada = False

    # -------------------------------------------------------------- por mesa
    def observar(self, mesa_id: str, muestra: Muestra) -> None:
        """Agrega lo que la cámara ve ahora en la zona de una mesa."""
        with self.lock:
            mesa = self.mesas.get(mesa_id)
            if mesa is None:
                return
            mesa.historial.append(muestra)
            mesa.ultima_muestra = muestra
            limite = muestra.t - max(self.T["confirmar_ocupada_s"], self.T["confirmar_vacia_s"], 90) - 5
            while mesa.historial and mesa.historial[0].t < limite:
                mesa.historial.popleft()
            self.ahora = max(self.ahora, muestra.t)
            self._actualizar_mesa(mesa, muestra)

    def _hay_extra(self, mesa: Mesa, m: Muestra, t: float) -> bool:
        """¿Hay alguien que no es cliente sentado (mozo, limpieza) en la mesa ahora?"""
        if self.modo_personal:
            return m.personal > 0
        if mesa.estado == POR_LIMPIAR:
            return m.personas > 0
        # base = clientes sentados: solo muestras de esta visita (no las de la mesa vacía)
        desde = max(t - 60, mesa.sesion_inicio if mesa.sesion_inicio is not None else t - 60)
        recientes = [x.personas for x in mesa.historial if x.t >= desde]
        base = statistics.median_low(recientes) if recientes else 0
        return m.personas > base

    def _actualizar_mesa(self, mesa: Mesa, m: Muestra) -> None:
        t, T = m.t, self.T

        # visitas: alguien extra presente durante visita_min_s seguidos
        hubo_visita = False
        minimo = T["limpieza_min_s"] if mesa.estado == POR_LIMPIAR else T["visita_min_s"]
        if mesa.estado != LIBRE and self._hay_extra(mesa, m, t):
            if mesa.extra_desde is None:
                mesa.extra_desde = t
            if not mesa.extra_contada and t - mesa.extra_desde >= minimo:
                mesa.extra_contada = True
                hubo_visita = True
        else:
            mesa.extra_desde = None
            mesa.extra_contada = False

        if m.objetos > 0:
            mesa.objetos_vistos = True

        ocup = self._ventana(mesa, t, T["confirmar_ocupada_s"])
        ocupada = ocup is not None and self._fraccion(ocup, lambda x: x.personas > 0) >= 0.7
        vac = self._ventana(mesa, t, T["confirmar_vacia_s"])
        vacia = vac is not None and self._fraccion(vac, lambda x: x.personas == 0) >= 0.9

        if mesa.estado == LIBRE:
            if ocupada:
                self._iniciar_sesion(mesa, t - T["confirmar_ocupada_s"], t)

        elif mesa.estado in (OCUPADA, ATENDIDA):
            if hubo_visita:
                mesa.visitas += 1
                mesa.ultima_visita = t
                if mesa.primera_visita is None:
                    mesa.primera_visita = t
                self._cerrar_alerta(mesa, SIN_ATENCION, t)
                self._cerrar_alerta(mesa, REATENCION, t)
                if mesa.estado == OCUPADA:
                    self._cambiar(mesa, ATENDIDA, t)
                    mesa.extra_contada = True  # la visita en curso ya contó

            if vacia:
                self._terminar_sesion(mesa, t - T["confirmar_vacia_s"], t)
                return

            if mesa.estado == OCUPADA:
                espera = t - mesa.sesion_inicio
                if espera >= T["alerta_sin_atencion_s"] and SIN_ATENCION not in mesa.alertas:
                    self._nueva_alerta(
                        SIN_ATENCION, mesa, f"ALERTA · {mesa.nombre}",
                        f"Lleva {_duracion(espera)} sin atención", t,
                    )
            elif T["alerta_reatencion_s"] and mesa.ultima_visita is not None:
                sin_visita = t - mesa.ultima_visita
                if sin_visita >= T["alerta_reatencion_s"] and REATENCION not in mesa.alertas:
                    self._nueva_alerta(
                        REATENCION, mesa, f"Revisar · {mesa.nombre}",
                        f"Nadie pasó por la mesa en {_duracion(sin_visita)}", t,
                    )

        elif mesa.estado == POR_LIMPIAR:
            limpia_por_objetos = (
                self.usa_objetos and mesa.objetos_vistos and m.personas == 0
                and self._ventana(mesa, t, 10) is not None
                and all(x.objetos == 0 for x in self._ventana(mesa, t, 10))
            )
            if hubo_visita or limpia_por_objetos:
                self._cerrar_alerta(mesa, FALTA_LIMPIAR, t)
                if self.almacen:
                    self.almacen.limpieza(mesa.id, mesa.desde, t)
                self._cambiar(mesa, LIBRE, t)
                return
            if ocupada:  # se sentaron sin que la limpiaran
                self._cerrar_alerta(mesa, FALTA_LIMPIAR, t)
                self._iniciar_sesion(mesa, t - T["confirmar_ocupada_s"], t)
                return
            if t - mesa.desde >= T["alerta_limpieza_s"] and FALTA_LIMPIAR not in mesa.alertas:
                self._nueva_alerta(FALTA_LIMPIAR, mesa, f"ALERTA · {mesa.nombre}", "Libre, falta limpiar", t)

    def _iniciar_sesion(self, mesa: Mesa, inicio: float, t: float) -> None:
        self._cambiar(mesa, OCUPADA, t)
        mesa.desde = inicio
        mesa.sesion_inicio = inicio
        mesa.primera_visita = None
        mesa.ultima_visita = None
        mesa.visitas = 0
        mesa.objetos_vistos = False

    def _terminar_sesion(self, mesa: Mesa, fin: float, t: float) -> None:
        self._cerrar_alerta(mesa, SIN_ATENCION, t)
        self._cerrar_alerta(mesa, REATENCION, t)
        if self.almacen and mesa.sesion_inicio is not None:
            espera = None if mesa.primera_visita is None else mesa.primera_visita - mesa.sesion_inicio
            self.almacen.sesion(mesa.id, mesa.sesion_inicio, fin, espera, mesa.visitas)
        mesa.sesion_inicio = None
        # siempre pasa a "por limpiar"; si se detecta vajilla y luego desaparece,
        # la regla de objetos la libera sola (ver POR_LIMPIAR)
        self._cambiar(mesa, POR_LIMPIAR, fin)

    # ----------------------------------------------------------------- fila
    def observar_entrada(self, t: float, personas: int) -> None:
        with self.lock:
            self.ahora = max(self.ahora, t)
            self.fila_personas = personas
            self.fila_hist.append((t, personas))
            while self.fila_hist and self.fila_hist[0][0] < t - self.T["fila_confirmar_s"] - 5:
                self.fila_hist.popleft()
            ventana = [p for (tt, p) in self.fila_hist if tt >= t - self.T["fila_confirmar_s"]]
            cubierta = self.fila_hist and self.fila_hist[0][0] <= t - self.T["fila_confirmar_s"] + 1.5
            hay_fila = cubierta and min(ventana) >= self.T["fila_min_personas"]
            sin_fila = cubierta and max(ventana) < self.T["fila_min_personas"]
            if hay_fila and self.fila_alerta is None:
                pred = self.prediccion(personas)
                self.fila_alerta = self._nueva_alerta(
                    FILA, None, f"FILA EN ENTRADA · {personas} PERSONAS", pred["texto"], t
                )
            elif self.fila_alerta is not None:
                if sin_fila:
                    self.fila_alerta.fin = t
                    if self.almacen:
                        self.almacen.alerta_cerrada(self.fila_alerta)
                    self.fila_alerta = None
                else:
                    pred = self.prediccion(max(personas, 1))
                    self.fila_alerta.mensaje = f"FILA EN ENTRADA · {personas} PERSONAS"
                    self.fila_alerta.detalle = pred["texto"]

    def duracion_media(self, mesa_id: str) -> float:
        if self.almacen:
            d = self.almacen.duracion_media(mesa_id)
            if d:
                return d
        return self.T["duracion_media_defecto_s"]

    def prediccion(self, grupo: int = 1) -> dict:
        """Qué mesa se libera primero para un grupo de `grupo` personas."""
        with self.lock:
            candidatas = []
            for mesa in self.mesas.values():
                if mesa.estado == LIBRE:
                    resta = 0.0
                elif mesa.estado == POR_LIMPIAR:
                    resta = max(30.0, self.T["limpieza_estimada_s"] - (self.ahora - mesa.desde))
                else:
                    trans = self.ahora - (mesa.sesion_inicio or self.ahora)
                    resta = max(60.0, self.duracion_media(mesa.id) - trans) + self.T["limpieza_estimada_s"]
                candidatas.append((mesa.capacidad < grupo, resta, mesa))
            if not candidatas:
                return {"mesa": None, "segundos": None, "texto": "No hay mesas configuradas"}
            _, resta, mesa = min(candidatas, key=lambda c: (c[0], c[1]))
            if resta == 0:
                texto = f"{mesa.nombre} está libre"
            else:
                texto = f"Se libera primero: {mesa.nombre} (~{max(1, round(resta / 60))} min)"
            return {"mesa": mesa.id, "segundos": resta, "texto": texto}

    # -------------------------------------------------------------- consulta
    def marcar_vista(self, alerta_id: int) -> bool:
        with self.lock:
            for a in self.alertas:
                if a.id == alerta_id:
                    a.vista = True
                    return True
            return False

    def resumen(self) -> dict:
        with self.lock:
            t = self.ahora
            mesas = []
            for m in self.mesas.values():
                um = m.ultima_muestra
                mesas.append({
                    "id": m.id,
                    "nombre": m.nombre,
                    "capacidad": m.capacidad,
                    "estado": m.estado,
                    "segundos_estado": max(0, t - m.desde),
                    "segundos_sesion": None if m.sesion_inicio is None else max(0, t - m.sesion_inicio),
                    "espera_atencion": (
                        None if m.sesion_inicio is None
                        else (m.primera_visita or t) - m.sesion_inicio
                    ),
                    "visitas": m.visitas,
                    "personas": um.personas if um else 0,
                    "personal": um.personal if um else 0,
                    "objetos": um.objetos if um else 0,
                    "senal": um is not None and t - um.t < 10,
                    "alerta": bool(m.alertas),
                })
            ocupadas = sum(1 for m in self.mesas.values() if m.estado in (OCUPADA, ATENDIDA))
            return {
                "ahora": t,
                "mesas": mesas,
                "ocupadas": ocupadas,
                "total": len(self.mesas),
                "fila": {"personas": self.fila_personas, "prediccion": self.prediccion(max(1, self.fila_personas))},
                "alertas": [a.a_dict() for a in reversed(self.alertas) if a.fin is None],
            }
