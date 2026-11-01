# Episodio 1 — Datos que Duelen

Video en Remotion, 1920x1080, 30 fps, 360 s (10 800 frames), 10 escenas.

## Archivos que van en `public/` (todos opcionales)

| Archivo | Uso |
|---|---|
| `voz.mp3` | Voz en off, desde el segundo 0 |
| `musica.mp3` | Música de fondo en loop, volumen 0.18, con fade in/out |
| `tic.mp3` | Cada día que se tacha en el calendario |
| `golpe.mp3` | Cuando un contador llega a su número, cuando se completa una barra y en el corte a negro |
| `subida.mp3` | Cuando empieza un contador o crece una barra |
| `subtitulos.json` | Subtítulos palabra por palabra |
| `logo.png` | Logo de la escena 10 (si falta se usa un logotipo de texto) |

Si un archivo no está, el video se renderiza igual, solo que sin ese elemento.
Si agregas archivos, vuelve a renderizar.

### Formato de `subtitulos.json`

Ver `public/subtitulos.ejemplo.json`. Formatos aceptados:

```json
[{ "text": "Dieciocho", "start": 0.4, "end": 1.0 }]
```
- con `start`/`end` en segundos, o con `startMs`/`endMs` en milisegundos (formato `@remotion/captions`)
- salida de WhisperX: `{ "segments": [{ "words": [{ "word": "...", "start": 0.4, "end": 1.0 }] }] }`

## Audio incluido (generado, reemplazable)

- `voz.mp3`: voz en off generada con Kokoro-82M (voz `em_alex`, español), a partir de `guion/guion.json`.
  Cada frase tiene su segundo de entrada para calzar con la escena.
- `subtitulos.json`: tiempos por palabra calculados al generar la voz (frase por frase); las cifras se muestran como en pantalla.
- `tic.mp3`, `golpe.mp3`, `subida.mp3`, `musica.mp3`: sintetizados con ffmpeg.

Para regenerar la voz y los subtítulos (requiere `pip install kokoro-onnx soundfile` y los archivos del modelo
`kokoro-v1.0.onnx` y `voices-v1.0.bin` de github.com/thewh1teagle/kokoro-onnx/releases):

```bash
python scripts/make_voice.py guion/guion.json voz.wav public/subtitulos.json
ffmpeg -i voz.wav -af "highpass=f=70,acompressor=threshold=-20dB:ratio=3,loudnorm=I=-16:TP=-1.5" -ar 44100 -ac 2 public/voz.mp3
```

Si grabas tu propia voz, reemplaza `voz.mp3` y genera `subtitulos.json` con WhisperX.

## Estructura

- `src/data.ts`: todos los números y fuentes
- `src/theme.ts`: colores, fuentes, tiempos de escenas
- `src/components/`: `CalendarFill`, `BigNumber`, `SalaryBar`, `CompareBars`, `SourceTag`, `Subtitles`, `Wipe`
- `src/scenes/Scene01..10.tsx`

Las fuentes (Archivo Black y JetBrains Mono) se descargaron de Google Fonts y están en `public/fonts`.

## Comandos

```bash
npm i
npx remotion studio                                  # vista previa
npx remotion render Episodio1 out/episodio1.mp4      # render
```
En este contenedor el render usó el Chrome que ya venía instalado:
`--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
