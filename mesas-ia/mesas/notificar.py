"""Avisos opcionales por Telegram cuando salta una alerta."""
from __future__ import annotations

import json
import threading
import urllib.parse
import urllib.request


def crear(cfg_notif: dict):
    token = (cfg_notif or {}).get("telegram_token")
    chat = (cfg_notif or {}).get("telegram_chat_id")
    if not token or not chat:
        return lambda alerta: None

    def enviar(alerta):
        texto = f"⚠️ {alerta.mensaje}\n{alerta.detalle}"
        datos = urllib.parse.urlencode({"chat_id": chat, "text": texto}).encode()

        def _post():
            try:
                urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", datos, timeout=10)
            except Exception as e:
                print(f"[telegram] no se pudo enviar: {e}")

        threading.Thread(target=_post, daemon=True).start()

    return enviar


def prueba(cfg_notif: dict) -> str:
    """Devuelve un texto con el resultado de enviar un mensaje de prueba."""
    token = (cfg_notif or {}).get("telegram_token")
    chat = (cfg_notif or {}).get("telegram_chat_id")
    if not token or not chat:
        return "Falta telegram_token o telegram_chat_id en la configuración"
    datos = urllib.parse.urlencode({"chat_id": chat, "text": "Prueba de Mesas IA ✅"}).encode()
    try:
        r = urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", datos, timeout=10)
        return "Enviado" if json.load(r).get("ok") else "Telegram rechazó el mensaje"
    except Exception as e:
        return f"Error: {e}"
