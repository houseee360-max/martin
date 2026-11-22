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


def mensaje(cfg_notif: dict, texto: str) -> None:
    """Envía un texto suelto (en segundo plano) si Telegram está configurado."""
    token = (cfg_notif or {}).get("telegram_token")
    chat = (cfg_notif or {}).get("telegram_chat_id")
    if not token or not chat:
        return
    datos = urllib.parse.urlencode({"chat_id": chat, "text": texto}).encode()

    def _post():
        for _ in range(6):  # al arrancar el PC la wifi puede tardar en conectarse
            try:
                urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", datos, timeout=10)
                return
            except Exception:
                import time
                time.sleep(20)

    threading.Thread(target=_post, daemon=True).start()


def buscar_chats(token: str) -> dict:
    """Chats que le escribieron al bot hace poco (para no tener que buscar el chat_id a mano)."""
    try:
        r = json.load(urllib.request.urlopen(f"https://api.telegram.org/bot{token}/getUpdates", timeout=10))
    except Exception as e:
        return {"ok": False, "error": f"No se pudo consultar Telegram ({e}). ¿El token está bien copiado?"}
    if not r.get("ok"):
        return {"ok": False, "error": "Telegram no aceptó el token"}
    chats = {}
    for u in r.get("result", []):
        msg = u.get("message") or u.get("my_chat_member") or u.get("channel_post") or {}
        chat = msg.get("chat")
        if chat:
            nombre = chat.get("title") or " ".join(x for x in [chat.get("first_name"), chat.get("last_name")] if x)
            chats[str(chat["id"])] = {"id": str(chat["id"]), "nombre": nombre or str(chat["id"]),
                                      "tipo": "grupo" if chat.get("type") in ("group", "supergroup") else "persona"}
    return {"ok": True, "chats": list(chats.values())}
