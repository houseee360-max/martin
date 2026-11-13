---
name: shorts-datos-que-duelen
description: Crea un Short vertical (TikTok / YouTube Shorts, 1080x1920) 100 % con código, estilo canal "Datos que Duelen": historia original con el robot 3D (Remotion + Three.js), una acción por clip, efectos de sonido sincronizados, guion en español neutro con gancho en el segundo 0, efecto wow, regalo al final y cierre en bucle, más portada, título, descripción y hashtags. Úsala cuando pidan "otro video como el del enchufe / refri / calcetines", "un short del robot", "idea de video nueva para el canal", "hazme el video", o guion, portada o textos para publicar uno de estos Shorts.
---

# Shorts "Datos que Duelen" (robot 3D con código)

Receta completa, probada en tres videos: el enchufe, el refrigerador y los calcetines de la lavadora.
Responde siempre en español, corto y ordenado. El usuario escribe desde el celular.

## 0. Reglas que no se rompen

- **Original siempre.** No copies ni "adaptes" videos de otros creadores (ni escena por escena, ni su personaje, ni su chiste). Sí puedes usar la estructura general: gancho, revelación, remate.
- **Assets con licencia clara** (CC0 de preferencia). Anota créditos en `public/<carpeta>/CREDITOS.txt`. El robot es "RobotExpressive" de Quaternius (CC0).
- **No inventes datos.** Si hay un dato real, búscalo y cita la fuente al usuario. Si es ficción, que se note que es broma.
- **Sin texto quemado en los clips.** El texto se pone después en CapCut.
- **No digas que algo "funciona" o "es viral" sin haberlo comprobado.** Di qué revisaste y qué no.

## 1. Elegir la idea

Fórmula de la serie: **algo cotidiano + un mundo secreto + un remate que le pasa a todos.**
"¿Qué pasa dentro de…?" (enchufe, refri, lavadora, semáforo, router WiFi, control remoto).

Antes de construir, propón la idea con: gancho de voz, tabla de escenas, remate y pregunta para comentarios. Si el usuario pide "investiga", busca en la web si el tema ya tuvo videos con muchas vistas y dilo con la fuente.

## 2. Las cuatro piezas que debe tener cada video

1. **Gancho en el segundo 0.** El primer cuadro ya es la acción más rara (ej.: el robot robando el calcetín). Nada de exterior aburrido ni introducción. La primera frase de voz cabe en 1 segundo ("Tu lavadora te roba.").
2. **Efecto wow** entre el segundo 6 y el 12: una revelación grande (la montaña de 1.100 calcetines, luces que se encienden de a una).
3. **Regalo al final ("efecto Santa Claus"):** un dato real o un giro que el espectador se lleva (ej.: los calcetines sí se cuelan por el borde del tambor).
4. **Nunca mostrar que termina:** sin pantalla final ni "sígueme". El último clip empalma con el primero y la última frase queda a medias para completarse con la primera (bucle).

## 3. Construcción técnica

Proyecto Remotion 4 + React 19 + `@remotion/three` + `three` + `@react-three/fiber` 9 + `@react-three/postprocessing` 3.
Plantillas en `plantillas/` (copiar y adaptar, no partir de cero):

| Archivo | Sirve para |
|---|---|
| `EnchufeRobot.tsx` | Base: carga del robot GLB, materiales, helpers `Caja`, `Cil`, `Tubo`, texturas por canvas |
| `Refri.tsx` | Escena interior con luces por estados, `Entorno`, `Repintar`, Bloom y viñeta |
| `Calcetin.tsx` | La más completa: 8 clips, `InstancedMesh` para miles de objetos, corte lateral, bucle |
| `PortadaEnchufe.tsx` | Portada: escena 3D + texto grande con borde |
| `ReelCorazon.tsx` | Formato 2D "busca tu edad" (rueda, contador, electrocardiograma) |

Patrón: un componente `<Video clip={n}>`, una `Composition` por clip (`Id-1`, `Id-2`…), cada clip con **una sola acción** de 3 a 6 s y cámara fija.

Animaciones del robot: Dance, Death, Idle, Jump, No, Punch, Running, Sitting, Standing, ThumbsUp, Walking, WalkJump, Wave, Yes.
Uso: `<Robot anim="Running" t={segundos} pos={[x,y,z]} rotY={ángulo} escala={1.1} una={soloUnaVez} />`.

### Trampas que ya nos pasaron (leer antes de renderizar)

1. **WebGL sin tarjeta gráfica:** renderizar con `--gl=swangle`.
2. **Chrome:** usar el instalado: `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`.
3. **Cuadros en negro o robot invisible:** el lienzo solo se pinta al cambiar de cuadro. Incluir siempre `<Repintar />` (llama `advance()` dos veces y luego `continueRender`). El robot hace lo mismo al cargar.
4. **Cámara:** fijarla en el render del componente, nunca en `useEffect`.
5. **Luces puntuales:** con `decay 1.7`, una intensidad de ~75 ilumina bien a 25 cm. A 60 cm hace falta ~400. Si todo sale blanco, bajar 10 veces.
6. **Escenas pesadas** (miles de objetos): usar `InstancedMesh`, quitar sombras de esa luz y subir `--timeout=240000`. Un clip de 150 cuadros puede tardar 25 minutos.
7. **Objetos que se atraviesan:** dejar un carril libre para el robot y revisar con hojas de contacto antes del render final.
8. **Fuentes:** locales en `public/fonts` (Google Fonts no carga en el render).
9. **Nunca `rm -rf` con variables.** Para sobrescribir carpetas usar `cp -rT`.

### Orden de trabajo

1. Escribir la escena. `npx tsc --noEmit -p .`
2. Sacar 1 o 2 imágenes por clip con `scripts/stills.mjs` (`GL=swangle node stills.mjs <carpeta> Id-1:0 Id-1:60 …`), unirlas con ffmpeg `tile` y **mirarlas**. Ojo: los archivos se ordenan alfabéticamente, no por cuadro.
3. Corregir encuadres, luces y choques. Repetir hasta que se entienda sin sonido.
4. Render en segundo plano, un clip tras otro:
   `npx remotion render Id-N videos/<nombre>-clips/clip-0N.mp4 --browser-executable=… --gl=swangle --crf=16 --muted --timeout=240000`
5. Mientras renderiza: generar el sonido y escribir el guion. Avisar al usuario el avance real (clips listos / faltantes) cuando pregunte.

## 4. Sonido (sin música con derechos)

Generar todo con Python + numpy (`scripts/sfx_ejemplo.py`): una función `add(segundo, onda, volumen, pan)` por evento, sincronizada con el cuadro exacto de cada acción (cuadro / 30 + inicio del clip). Sonidos base: golpe grave, whoosh de ruido filtrado, pitidos del robot (barrido de seno), pasos metálicos, zumbidos, acordes para el wow.
Unir clips con `ffmpeg -f concat`, mezclar el WAV y normalizar a **−18 LUFS** (deja espacio para la voz del usuario): `loudnorm=I=-18:TP=-2:LRA=11`.

## 5. Guion (para la voz del usuario en CapCut)

- Español neutro, frases cortas, pausas con "…", números con letras.
- Dar SIEMPRE dos formatos: bloque para copiar y pegar, y tabla "segundo → lo que se ve → frase".
- La voz no describe lo que ya se ve: suma humor o lo hace personal ("Los tuyos también").
- Sin silencios de más de 2 segundos.
- Hacer coincidir frases con sonidos fuertes (una frase por cada luz que se enciende).
- Última frase incompleta que se complete con la primera (bucle).
- Voz recomendada: grave, de narrador de documental, seria (el contraste con lo absurdo da la risa).

## 6. Entregables de cada video

1. Clips sueltos sin texto ni audio en `videos/<nombre>-clips/`.
2. Video unido con efectos de sonido: `videos/<nombre>-con-sonidos.mp4`.
3. Guion (bloque + tabla con segundos).
4. Portadas 1080x1920 para TikTok y YouTube: 3 líneas de texto grande con borde negro, una palabra en amarillo, flecha al personaje.
5. Textos para publicar:
   - YouTube: 3 títulos (menos de 50 caracteres, con curiosidad), descripción y 3 hashtags.
   - TikTok: una descripción con 5 hashtags y texto para la portada.
   - Comentario para fijar con una pregunta que se responda con un número.
6. Commit y push de todo. Decir con honestidad qué quedó flojo (encuadres, detalles) y ofrecer corregirlo.

## 7. Publicación (lo que se le recomienda al usuario)

- Hashtags: 3 a 5, relevantes (`#curiosidades #sabiasque #animacion3d` + uno del tema). Pedirle que verifique en la app que tengan videos recientes.
- Publicar entre 19:00 y 22:00, responder comentarios la primera media hora, no borrar el video.
- Texto en pantalla desde el cuadro 0, uno a la vez, máximo 5 palabras.
- En CapCut: voz al 100 %, audio del video al 70–80 %, sin pantalla final.
- A las 48 horas revisar "Vistos vs. deslizados" en YouTube Studio; si está bajo, cambiar título o el primer clip.
