# Mesas IA

Sistema que mira las cámaras del restaurante y muestra en vivo el estado de cada mesa,
como en el vídeo de referencia:

- **Verde = libre, rojo = clientes sentados.** Al sentarse arranca un cronómetro.
- **Alerta «sin atención»** si pasan 5 minutos sin que se acerque un mozo (te dice qué mesa).
- **Alerta «falta limpiar»** cuando la mesa se libera y nadie la limpia.
- **Fila en la entrada**: cuenta a la gente que espera y predice qué mesa se libera primero.
- **Reporte semanal**: horas pico, espera media al mozo y mozos recomendados por día y hora.
- **Funciona con las cámaras de seguridad que ya tienes** (cualquier cámara IP con RTSP), con un archivo de vídeo o con una webcam.
- Avisos opcionales al móvil por **Telegram**.

## Probarlo sin cámaras (2 minutos)

```bash
cd mesas-ia
pip install -r requirements.txt
python -m mesas --demo
```

Abre http://localhost:8000. Es un restaurante simulado de 6 mesas donde el tiempo corre 10 veces más rápido
(`--velocidad 20` para ir más rápido). La pestaña **Reporte** trae una semana de datos inventados.

## Ponerlo en marcha en el restaurante

### 1. El equipo

- Un PC o mini-PC en la misma red que las cámaras (sirve uno con un Intel i5 sin tarjeta gráfica para 2–4 cámaras
  a 2 imágenes por segundo; con una tarjeta NVIDIA aguanta muchas más).
- Las cámaras deben ver **las mesas desde arriba o en diagonal**. Una cámara en una esquina alta suele cubrir 4–8 mesas.
  Si una mesa queda tapada por una columna o por la gente de otra mesa, va a fallar: mejor otra cámara.

### 2. La dirección RTSP de cada cámara

Cada marca tiene su formato (usuario y contraseña del grabador o de la cámara):

| Marca | Dirección típica |
|---|---|
| Hikvision | `rtsp://usuario:clave@IP:554/Streaming/Channels/102` (102 = calidad baja, va sobrada) |
| Dahua | `rtsp://usuario:clave@IP:554/cam/realmonitor?channel=1&subtype=1` |
| Reolink | `rtsp://usuario:clave@IP:554/h264Preview_01_sub` |
| TP-Link Tapo | `rtsp://usuario:clave@IP:554/stream2` (crea la cuenta de cámara en la app) |
| Otras | Busca «marca modelo RTSP URL», o pruébala en VLC: Medio → Abrir ubicación de red |

Usa el **sub-stream** (calidad baja): YOLO trabaja a 640 px igual, y gasta mucho menos.

### 3. Configurar

```bash
cp config.ejemplo.json config.json
```

Edita `config.json`: el nombre del local, las cámaras (`fuente` = la dirección RTSP, un archivo `.mp4` o `0` para la webcam)
y la lista de mesas. Después arranca:

```bash
python -m mesas --config config.json
```

La primera vez descarga el modelo `yolo11n.pt` (5 MB).

### 4. Dibujar las mesas

Abre http://localhost:8000/calibrar, elige cada mesa y haz clic alrededor de ella **incluyendo las sillas**
(la zona donde se sientan los clientes). Dibuja también la zona de entrada si quieres contar la fila.
Arrastra las mesas en el «plano del panel» para que el dibujo se parezca a tu local. Pulsa **Guardar**: se aplica al momento.

En la pestaña **Cámaras** del panel ves la imagen con las zonas pintadas y cada persona detectada, para comprobar que va bien.

### 5. Ajustar

Todos los tiempos están en `config.json` → `tiempos` (en segundos):

| Clave | Por defecto | Para qué |
|---|---|---|
| `confirmar_ocupada_s` | 30 | Tiempo con gente para dar la mesa por ocupada (evita que alguien que pasa la ocupe) |
| `confirmar_vacia_s` | 45 | Tiempo sin nadie para darla por desocupada (aguanta fallos breves de detección; si la gente se levanta un rato largo, súbelo) |
| `alerta_sin_atencion_s` | 300 | Alerta si nadie atiende la mesa en 5 min |
| `alerta_reatencion_s` | 1200 | Alerta si nadie pasa por una mesa ya atendida en 20 min (0 = apagada) |
| `alerta_limpieza_s` | 120 | Alerta si la mesa sigue sucia 2 min después de irse los clientes |
| `visita_min_s` | 4 | Cuánto debe quedarse el mozo para contar como visita |
| `fila_min_personas` | 2 | Personas en la entrada para avisar de fila |

`mesas_por_mozo` (4) sirve para calcular los mozos recomendados del reporte.

### 6. Cómo distingue al mozo de un cliente

- **`"modo": "ninguno"`** (por defecto): un mozo es *una persona más* que aparece en la mesa durante unos segundos
  y se va. Funciona sin configurar nada, pero si llega otro cliente a sentarse también cuenta como visita.
- **`"modo": "color"`**: si el personal lleva uniforme de un color distinto al de los clientes (por ejemplo, negro o
  bordó), pon ese color en `hsv_min` / `hsv_max` (formato HSV de OpenCV: H 0–180, S y V 0–255). Es más preciso.
  Ejemplos: negro `[0,0,0]`–`[180,255,60]`; rojo/bordó `[0,120,50]`–`[10,255,255]`; blanco `[0,0,190]`–`[180,40,255]`.

### 7. Avisos al móvil (Telegram)

1. En Telegram habla con **@BotFather** → `/newbot` → copia el *token*.
2. Escríbele cualquier cosa a tu bot y abre `https://api.telegram.org/bot<TOKEN>/getUpdates` para ver tu `chat.id`
   (o crea un grupo con los encargados, agrega al bot y usa el id del grupo).
3. Ponlos en `notificaciones` y reinicia. Para probar: `curl -X POST localhost:8000/api/notificaciones/prueba`.

### Mantenerlo encendido

En Linux puedes crear un servicio de systemd; en Windows, una tarea programada «al iniciar sesión» que ejecute
`python -m mesas --config C:\ruta\config.json`. Los datos se guardan en `mesas.db` (SQLite).

## Cómo funciona

```
cámara → YOLO (personas + vajilla) → ¿en qué zona cae cada una? → motor de estados → panel / alertas / reporte
```

- `mesas/vision.py`: lee cada cámara, detecta personas y vajilla con YOLO y cuenta cuántas caen en cada zona.
- `mesas/motor.py`: decide el estado de cada mesa (LIBRE → OCUPADA → ATENDIDA → POR LIMPIAR → LIBRE), los cronómetros y
  las alertas. Usa ventanas de tiempo para que un fallo puntual de detección no cambie el estado.
- `mesas/almacen.py` y `mesas/reporte.py`: historial en SQLite y reporte semanal.
- `mesas/servidor.py` + `web/`: panel, calibración y API (`/api/estado`, `/api/reporte`, `/api/camaras/<id>/video`).
- `mesas/simulador.py`: el restaurante falso del modo demo.

Pruebas del motor: `python -m pytest tests`.

## Límites conocidos

- **Ángulo de la cámara**: con cámaras muy bajas, la gente de una mesa tapa la siguiente. Es lo que más afecta a la precisión.
- **Mesas pegadas**: si las zonas se tocan, una persona puede contarse en la mesa de al lado. Dibuja zonas que no se pisen.
- **Limpieza**: sin uniforme de color, «limpiada» = alguien estuvo unos segundos en la mesa vacía, o la vajilla detectada
  desapareció. La vajilla pequeña se detecta mal desde lejos; trátala como una ayuda.
- **Privacidad**: las imágenes no salen del equipo ni se guardan (solo los conteos). Aun así, en la mayoría de los países
  hay que avisar con un cartel de que hay videovigilancia; revisa la normativa de tu país.
- **Licencia de YOLO**: `ultralytics` es AGPL-3.0. Para usarlo en tu propio restaurante no hay problema; si lo vas a
  **vender como producto a otros restaurantes**, necesitas la licencia comercial de Ultralytics o cambiar a un detector
  con licencia permisiva (por ejemplo, RT-DETR desde `transformers` o YOLOX, ambos Apache-2.0).
