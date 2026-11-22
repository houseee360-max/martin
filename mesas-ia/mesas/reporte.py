"""Reporte semanal: horas pico, tiempos de atención y mozos recomendados."""
from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime

DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]


def generar(almacen, cfg: dict, hasta: float, dias: int = 7) -> dict:
    desde = hasta - dias * 86400
    por_mozo = max(1, int(cfg.get("mesas_por_mozo", 4)))
    total_mesas = len(cfg["mesas"])

    # ocupación media por día de la semana y hora
    ocup = defaultdict(list)
    fila = defaultdict(list)
    for r in almacen.consultar("SELECT t, ocupadas, fila FROM muestras WHERE t BETWEEN ? AND ?", (desde, hasta)):
        d = datetime.fromtimestamp(r["t"])
        ocup[(d.weekday(), d.hour)].append(r["ocupadas"])
        fila[(d.weekday(), d.hour)].append(r["fila"])

    celdas = []
    for (dia, hora), valores in sorted(ocup.items()):
        media = sum(valores) / len(valores)
        maximo = max(valores)
        celdas.append({
            "dia": dia,
            "dia_nombre": DIAS[dia],
            "hora": hora,
            "ocupadas_media": round(media, 2),
            "ocupadas_max": maximo,
            "fila_media": round(sum(fila[(dia, hora)]) / len(fila[(dia, hora)]), 2),
            # se dimensiona con el pico de la hora, no con la media
            "mozos_recomendados": max(1, math.ceil(maximo / por_mozo)) if maximo else 0,
        })

    picos = sorted(celdas, key=lambda c: c["ocupadas_media"], reverse=True)[:5]

    ses = almacen.consultar(
        "SELECT mesa, inicio, fin, espera_atencion, visitas FROM sesiones WHERE inicio BETWEEN ? AND ?",
        (desde, hasta),
    )
    esperas = [s["espera_atencion"] for s in ses if s["espera_atencion"] is not None]
    duraciones = [s["fin"] - s["inicio"] for s in ses]
    sin_atender = sum(1 for s in ses if s["espera_atencion"] is None)

    por_mesa = defaultdict(lambda: {"visitas": 0, "duracion": 0.0, "esperas": []})
    for s in ses:
        pm = por_mesa[s["mesa"]]
        pm["visitas"] += 1
        pm["duracion"] += s["fin"] - s["inicio"]
        if s["espera_atencion"] is not None:
            pm["esperas"].append(s["espera_atencion"])
    mesas = []
    nombres = {m["id"]: m["nombre"] for m in cfg["mesas"]}
    for mid, pm in sorted(por_mesa.items()):
        mesas.append({
            "mesa": mid,
            "nombre": nombres.get(mid, mid),
            "clientes": pm["visitas"],
            "duracion_media_min": round(pm["duracion"] / pm["visitas"] / 60, 1),
            "espera_media_min": round(sum(pm["esperas"]) / len(pm["esperas"]) / 60, 1) if pm["esperas"] else None,
        })

    alertas = defaultdict(int)
    for a in almacen.consultar("SELECT tipo, COUNT(*) AS n FROM alertas WHERE inicio BETWEEN ? AND ? GROUP BY tipo",
                               (desde, hasta)):
        alertas[a["tipo"]] = a["n"]

    limp = almacen.consultar("SELECT AVG(fin - inicio) AS d FROM limpiezas WHERE inicio BETWEEN ? AND ?",
                             (desde, hasta))
    limpieza_media = limp[0]["d"] if limp and limp[0]["d"] is not None else None

    return {
        "desde": desde,
        "hasta": hasta,
        "total_mesas": total_mesas,
        "mesas_por_mozo": por_mozo,
        "grupos_atendidos": len(ses),
        "duracion_media_min": round(sum(duraciones) / len(duraciones) / 60, 1) if duraciones else None,
        "espera_media_min": round(sum(esperas) / len(esperas) / 60, 1) if esperas else None,
        "espera_mayor_5min": sum(1 for e in esperas if e >= 300),
        "sin_atender": sin_atender,
        "limpieza_media_min": round(limpieza_media / 60, 1) if limpieza_media else None,
        "alertas": dict(alertas),
        "horas_pico": picos,
        "celdas": celdas,
        "mesas": mesas,
    }
