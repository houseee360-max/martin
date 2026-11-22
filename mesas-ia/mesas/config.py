"""Carga y valida la configuración del sistema (config.json)."""
from __future__ import annotations

import copy
import json
from pathlib import Path

TIEMPOS_POR_DEFECTO = {
    # segundos con gente en la zona para dar la mesa por ocupada
    "confirmar_ocupada_s": 30,
    # segundos sin gente para dar la mesa por desocupada
    "confirmar_vacia_s": 45,
    # alerta si una mesa ocupada no recibe la primera visita en este tiempo
    "alerta_sin_atencion_s": 300,
    # alerta si una mesa ya atendida pasa este tiempo sin otra visita (0 = desactivada)
    "alerta_reatencion_s": 1200,
    # alerta si una mesa queda sucia este tiempo
    "alerta_limpieza_s": 120,
    # segundos que una persona extra (mozo) debe estar en la mesa para contar como visita
    "visita_min_s": 4,
    # segundos de presencia en una mesa sucia para darla por limpiada
    "limpieza_min_s": 8,
    # personas en la entrada para avisar de fila
    "fila_min_personas": 2,
    # segundos que la fila debe mantenerse para avisar
    "fila_confirmar_s": 15,
    # duración media de una visita de clientes cuando todavía no hay historial
    "duracion_media_defecto_s": 2700,
    # tiempo estimado de limpieza al predecir qué mesa se libera
    "limpieza_estimada_s": 120,
}

DETECCION_POR_DEFECTO = {
    "modelo": "yolo11n.pt",
    "confianza": 0.35,
    # "centro": centro de la caja de la persona; "pie": borde inferior
    "punto": "centro",
    "detectar_objetos": True,
    "dispositivo": None,
}

PERSONAL_POR_DEFECTO = {
    # "ninguno": un mozo es una persona extra que se acerca a la mesa
    # "color": el mozo se reconoce por el color del uniforme (rango HSV)
    "modo": "ninguno",
    "hsv_min": [0, 0, 0],
    "hsv_max": [180, 255, 60],
    "fraccion_min": 0.35,
}


def _completar(base: dict, valores: dict | None) -> dict:
    salida = copy.deepcopy(base)
    salida.update(valores or {})
    return salida


def normalizar(cfg: dict) -> dict:
    cfg = copy.deepcopy(cfg)
    cfg.setdefault("restaurante", "Mi restaurante")
    cfg.setdefault("camaras", [])
    cfg.setdefault("mesas", [])
    cfg.setdefault("entrada", None)
    cfg["tiempos"] = _completar(TIEMPOS_POR_DEFECTO, cfg.get("tiempos"))
    cfg["deteccion"] = _completar(DETECCION_POR_DEFECTO, cfg.get("deteccion"))
    cfg["personal"] = _completar(PERSONAL_POR_DEFECTO, cfg.get("personal"))
    cfg.setdefault("notificaciones", {})
    cfg.setdefault("mesas_por_mozo", 4)
    cfg.setdefault("base_datos", "mesas.db")
    cfg.setdefault("clave_panel", "")

    ids_camaras = {c["id"] for c in cfg["camaras"]}
    vistos = set()
    for i, m in enumerate(cfg["mesas"]):
        if "id" not in m:
            raise ValueError(f"La mesa número {i + 1} no tiene 'id'")
        if m["id"] in vistos:
            raise ValueError(f"Hay dos mesas con id '{m['id']}'")
        vistos.add(m["id"])
        m.setdefault("nombre", f"Mesa {m['id']}")
        m.setdefault("capacidad", 4)
        m.setdefault("poligono", [])
        if m.get("camara") is not None and m["camara"] not in ids_camaras:
            raise ValueError(f"La mesa '{m['id']}' usa la cámara '{m.get('camara')}', que no existe")
        for p in m["poligono"]:
            if not (0 <= p[0] <= 1 and 0 <= p[1] <= 1):
                raise ValueError(f"El polígono de '{m['id']}' debe usar coordenadas entre 0 y 1")
    for c in cfg["camaras"]:
        c.setdefault("fps_analisis", 2)
        c.setdefault("nombre", c["id"])
    return cfg


def cargar(ruta: str | Path) -> dict:
    with open(ruta, encoding="utf-8") as f:
        return normalizar(json.load(f))


def guardar(ruta: str | Path, cfg: dict) -> None:
    ruta = Path(ruta)
    tmp = ruta.with_suffix(".tmp")
    tmp.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(ruta)
