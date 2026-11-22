from mesas import config as cfgmod
from mesas.almacen import Almacen
from mesas.motor import (ATENDIDA, FALTA_LIMPIAR, FILA, LIBRE, OCUPADA, POR_LIMPIAR, SIN_ATENCION,
                         Motor, Muestra)


def crear(objetos=False, modo="ninguno"):
    cfg = cfgmod.normalizar({
        "mesas": [{"id": "A", "nombre": "Mesa A", "capacidad": 4},
                  {"id": "B", "nombre": "Mesa B", "capacidad": 2}],
        "deteccion": {"detectar_objetos": objetos},
        "personal": {"modo": modo},
        "base_datos": ":memory:",
    })
    alm = Almacen(":memory:")
    avisos = []
    return Motor(cfg, alm, avisos.append), alm, avisos


def correr(motor, mesa, t0, segundos, personas, personal=0, objetos=0):
    for i in range(segundos):
        motor.observar(mesa, Muestra(t0 + i, personas, personal, objetos))
    return t0 + segundos


def tipos(motor):
    return {a["tipo"] for a in motor.resumen()["alertas"]}


def test_ocupa_atiende_vacia_y_limpia():
    m, alm, _ = crear()
    t = correr(m, "A", 0, 10, 0)
    t = correr(m, "A", t, 35, 2)
    assert m.mesas["A"].estado == OCUPADA
    t = correr(m, "A", t, 60, 2)
    t = correr(m, "A", t, 10, 3)  # llega el mozo
    assert m.mesas["A"].estado == ATENDIDA
    assert m.mesas["A"].visitas == 1
    t = correr(m, "A", t, 600, 2)
    t = correr(m, "A", t, 60, 0)  # se van
    assert m.mesas["A"].estado == POR_LIMPIAR
    s = alm.consultar("SELECT * FROM sesiones")
    assert len(s) == 1 and s[0]["espera_atencion"] is not None
    correr(m, "A", t, 12, 1)  # alguien limpia
    assert m.mesas["A"].estado == LIBRE


def test_paso_fugaz_no_ocupa():
    m, _, _ = crear()
    t = correr(m, "A", 0, 40, 0)
    t = correr(m, "A", t, 6, 1)
    correr(m, "A", t, 40, 0)
    assert m.mesas["A"].estado == LIBRE


def test_alerta_sin_atencion_a_los_5_minutos_y_se_cierra_con_visita():
    m, _, avisos = crear()
    t = correr(m, "A", 0, 5, 0)
    t = correr(m, "A", t, 280, 2)
    assert SIN_ATENCION not in tipos(m)
    t = correr(m, "A", t, 30, 2)
    assert SIN_ATENCION in tipos(m)
    assert avisos and avisos[0].tipo == SIN_ATENCION
    correr(m, "A", t, 8, 3)
    assert SIN_ATENCION not in tipos(m)
    assert m.mesas["A"].estado == ATENDIDA


def test_fallos_de_deteccion_no_vacian_la_mesa():
    m, _, _ = crear()
    t = correr(m, "A", 0, 5, 0)
    t = correr(m, "A", t, 40, 2)
    for i in range(300):  # la cámara pierde a la gente 1 de cada 5 veces
        m.observar("A", Muestra(t + i, 0 if i % 5 == 0 else 2))
    assert m.mesas["A"].estado in (OCUPADA, ATENDIDA)


def test_alerta_falta_limpiar():
    m, _, _ = crear()
    t = correr(m, "A", 0, 5, 0)
    t = correr(m, "A", t, 60, 2)
    t = correr(m, "A", t, 60, 0)
    assert m.mesas["A"].estado == POR_LIMPIAR
    correr(m, "A", t, 130, 0)
    assert FALTA_LIMPIAR in tipos(m)


def test_vajilla_retirada_libera_la_mesa():
    m, _, _ = crear(objetos=True)
    t = correr(m, "A", 0, 5, 0)
    t = correr(m, "A", t, 60, 2, objetos=4)
    t = correr(m, "A", t, 60, 0, objetos=4)
    assert m.mesas["A"].estado == POR_LIMPIAR
    correr(m, "A", t, 15, 0, objetos=0)
    assert m.mesas["A"].estado == LIBRE


def test_modo_color_solo_cuenta_al_personal():
    m, _, _ = crear(modo="color")
    t = correr(m, "A", 0, 5, 0)
    t = correr(m, "A", t, 40, 2)
    t = correr(m, "A", t, 10, 3)  # entra un cliente más, no es mozo
    assert m.mesas["A"].estado == OCUPADA
    correr(m, "A", t, 6, 3, personal=1)
    assert m.mesas["A"].estado == ATENDIDA


def test_fila_y_prediccion():
    m, _, _ = crear()
    t = correr(m, "A", 0, 5, 0)
    correr(m, "B", 0, 5, 0)
    t = correr(m, "A", t, 60, 2)
    correr(m, "B", 5, 60, 2)
    for i in range(20):
        m.observar_entrada(t + i, 3)
    alerta = [a for a in m.resumen()["alertas"] if a["tipo"] == FILA]
    assert alerta and "Mesa A" in alerta[0]["detalle"]  # B es para 2 y el grupo es de 3
    for i in range(20):
        m.observar_entrada(t + 20 + i, 0)
    assert FILA not in tipos(m)


def test_los_clientes_que_llegan_no_cuentan_como_visita():
    m, _, _ = crear()
    t = correr(m, "A", 0, 20, 0)
    t = correr(m, "A", t, 120, 2)
    assert m.mesas["A"].estado == OCUPADA
    assert m.mesas["A"].visitas == 0
