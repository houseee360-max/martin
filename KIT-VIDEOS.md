# Kit para hacer videos con Claude (Datos que Duelen)

Entrégale este archivo a otro Claude (Claude Code) junto con el repositorio. Todo lo que usamos está aquí.

## 1. Empezar en 1 paso

El repositorio ya trae el código de todos los videos **y las skills instaladas** en `.claude/skills/`:

```
git clone https://github.com/houseee360-max/martin.git
cd martin
git checkout claude/episodio1-datos-duelen-ch5amh
npm install
```

Repositorio: https://github.com/houseee360-max/martin/tree/claude/episodio1-datos-duelen-ch5amh

Mensaje sugerido para el otro Claude:
> Lee KIT-VIDEOS.md. Usa Remotion (+ Three.js para 3D) y las skills de `.claude/skills/`. Haz un Short vertical 1080×1920 original sobre [tema], con gancho en el segundo 1, una acción por clip, efectos de sonido sincronizados, guion en español neutro y portada para TikTok y YouTube.

## 2. Qué hay en el repo (para reutilizar)

| Carpeta | Qué es |
|---|---|
| `src/reel-trabajo/` | Reel neón con personaje SVG, cámara, lluvia, reflejos (años trabajando) |
| `src/reel-corazon/` | Reel del corazón: latido, electrocardiograma, rueda "busca tu edad", contador en vivo |
| `src/reel-lunes/` | Short "busca tu año" con rueda y tics (solo efectos, sin música) |
| `src/reel-celular/` | Reel animado con personas SVG y tarjetas de cristal |
| `src/enchufe/EnchufeRobot.tsx` | 3D realista con Three.js: robot animado (GLB), sombras, materiales, cámaras por clip |
| `src/enchufe/PortadaEnchufe.tsx` | Portada con escena 3D + texto grande |
| `public/*/sfx/` | Efectos de sonido generados (latido, lluvia, boom, whoosh, click, tics…) |
| `src/theme.ts` | Fuentes locales (Archivo Black, JetBrains Mono) y colores |

## 3. GitHub: motores de animación

| Herramienta | Para qué | Link |
|---|---|---|
| Remotion | Videos con React, render a MP4 | https://github.com/remotion-dev/remotion |
| Remotion Skills | Skill oficial de buenas prácticas | https://github.com/remotion-dev/skills |
| Three.js | 3D en el navegador | https://github.com/mrdoob/three.js |
| React Three Fiber | Three.js con React (lo usa `@remotion/three`) | https://github.com/pmndrs/react-three-fiber |
| Drei | Atajos para R3F: textos 3D, luces, entornos, contorno | https://github.com/pmndrs/drei |
| Postprocessing | Bloom, profundidad de campo, granulado: look "cine" | https://github.com/pmndrs/postprocessing |
| React Postprocessing | Lo mismo para R3F | https://github.com/pmndrs/react-postprocessing |
| Lottie | Animaciones vectoriales (`@remotion/lottie`) | https://github.com/airbnb/lottie-web |
| GSAP | Animación de texto y SVG muy fina | https://github.com/greensock/GSAP |
| Motion Canvas | Alternativa a Remotion para explicativos | https://github.com/motion-canvas/motion-canvas |
| Blender | 3D más realista (render por script en Python) | https://www.blender.org |

## 4. GitHub: voz, audio y subtítulos

| Herramienta | Para qué | Link |
|---|---|---|
| Kokoro ONNX | Voz IA local y gratis (la usamos) | https://github.com/thewh1teagle/kokoro-onnx |
| Kokoro (modelo) | Modelo de voz | https://github.com/hexgrad/kokoro |
| whisper.cpp | Subtítulos palabra por palabra, local | https://github.com/ggml-org/whisper.cpp |
| OpenAI Whisper | Transcripción (Python) | https://github.com/openai/whisper |
| Demucs | Separar voz de música en un audio | https://github.com/facebookresearch/demucs |
| FFmpeg | Unir, cortar, normalizar a −14 LUFS | https://github.com/FFmpeg/FFmpeg |

## 5. GitHub: calidad de imagen

| Herramienta | Para qué | Link |
|---|---|---|
| Real-ESRGAN | Subir resolución (upscale a 4K) | https://github.com/xinntao/Real-ESRGAN |
| Practical-RIFE | Interpolar cuadros (60 fps, cámara lenta) | https://github.com/hzwer/Practical-RIFE |

## 6. Assets gratis y legales (revisar licencia de cada uno)

| Sitio | Qué tiene | Licencia |
|---|---|---|
| Quaternius (quaternius.com) | Personajes y objetos 3D animados (el robot es de aquí) | CC0 |
| Kenney (kenney.nl) | Modelos 3D, íconos, sonidos | CC0 |
| Poly Haven (polyhaven.com) | Fondos HDRI, texturas y modelos realistas | CC0 |
| ambientCG (ambientcg.com) | Texturas PBR (madera, metal, piso) | CC0 |
| Ejemplos de three.js | Modelos GLB de prueba | ver README de cada modelo |
| Mixamo (mixamo.com) | Animaciones de personajes (cuenta Adobe gratis) | uso libre en proyectos |
| Sketchfab | Modelos 3D: filtrar por "Downloadable" + CC | según cada modelo |
| Freesound (freesound.org) | Efectos de sonido | según cada sonido (CC0 / CC-BY) |

Regla: nunca usar personajes, música ni escenas de otros creadores. Solo assets CC0 o con licencia clara, y dar crédito cuando la licencia lo pida.

## 7. Skills

Ya vienen instaladas en `.claude/skills/` de este repo. Las más útiles para video:

- **Edición y animación:** `remotion-best-practices`, `editar-reels-claude`, `videoediting`, `edit-style`, `raw-to-reel`, `longform-edit`, `reels-engine`, `footage-ingest`
- **Ideas y guion:** `reel-ideation`, `idea-bank`, `viral-breakdown`, `script-polish`, `humanizer`, `ready-to-film`
- **Subtítulos y texto:** `reel-captions`, `caption-engine`, `use-local-whisper`
- **Publicar y crecer:** `youtube-seo`, `thumbnail-generator`, `reel-scorecard`, `best-time`, `comment-reply`, `content-multiplier`, `content-month`

Repositorios públicos de skills para instalar más:

| Repo | Contenido |
|---|---|
| https://github.com/vercel-labs/skills | `find-skills`: buscar e instalar skills (`npx skills add …`) |
| https://github.com/anthropics/skills | Skills oficiales de Anthropic (frontend-design, pdf, pptx…) |
| https://github.com/remotion-dev/skills | Skill de Remotion |
| https://github.com/obra/superpowers | `brainstorming` y flujo de trabajo |
| https://github.com/coreyhaines31/marketingskills | Copywriting, anuncios, CRO |
| https://github.com/thatrebeccarae/claude-marketing | Marcos de copywriting |
| https://github.com/blader/humanizer | Quitar el tono "IA" de los textos |

## 8. Trucos técnicos que nos costó descubrir

1. **Chrome para renderizar:** usar el que ya viene instalado:
   `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
2. **3D sin tarjeta gráfica:** renderizar con `--gl=swangle` (si no, WebGL no arranca).
3. **Modelo GLB invisible en el render:** después de cargarlo, llamar `advance()` de `useThree` y recién después `continueRender()` (ver `useRobot` en `EnchufeRobot.tsx`).
4. **Cámara de Three.js:** fijarla en el render del componente, no en un `useEffect`.
5. **Fuentes:** locales en `public/fonts` (Google Fonts no carga dentro del render).
6. **Audio final:** `loudnorm` de FFmpeg a −14 LUFS para TikTok y Shorts (−18 si después se agrega voz).
7. **Comando de render:**
   `npx remotion render <Id> out/video.mp4 --browser-executable=… --gl=swangle --crf=16`

## 9. Fórmula que usamos en cada Short

1. **Segundo 1:** gancho visual con pregunta (algo cotidiano: el enchufe, el corazón, el lunes).
2. **Revelación:** algo inesperado o un número que duele.
3. **Una acción por clip,** de 2 a 5 s, con cámara fija o con movimiento lento.
4. **Efectos de sonido en cada acción.** Música opcional y muy baja.
5. **Remate:** un dato o chiste final, más una pregunta fácil de comentar ("tu edad", "tu % de batería").
6. **Portada** con 3 líneas de texto grande y una palabra en amarillo.
7. **Título corto y con curiosidad** + 3 a 5 hashtags relevantes.

## 10. Añadido el 12-nov: más skills y librerías

**Skills nuevas en `.claude/skills/`** (revisadas antes de instalar, licencia MIT salvo las oficiales de Remotion):

| Skill | Para qué | Origen |
|---|---|---|
| `remotion-create`, `remotion-render`, `remotion-captions`, `remotion-multimedia`, `remotion-markup`, `remotion-maps`, `remotion-interactivity`, `remotion-saas`, `remotion-studio`, `remotion-docs`, `remotion-upgrade`, `remotion-license` | Pack oficial de Remotion (y `remotion-best-practices` actualizada) | https://github.com/remotion-dev/skills |
| `remotion-motion-graphics` | Motion graphics profesionales: intros, logos, promos, Reels | https://github.com/haidrrrry/claude-remotion-skill |
| `cartoon-3d-short` | Shorts de historia: personajes 2D tipo caricatura en un mundo 3D | https://github.com/mromidev/claude-animated-shorts |
| `stick-figure` | Explicativos con monigotes, cámara en movimiento y transiciones rápidas | https://github.com/artemnovitckii/claude-animation-skills |
| `breakdown` | Vista explosionada 3D de un objeto, pieza por pieza | (mismo repo) |
| `graph` | Gráfico de línea que se dibuja con un número que sube | (mismo repo) |
| `map-route` | Mapa 3D con ruta que se dibuja y pin que cae | (mismo repo) |
| `minimalistic-graphics` | Animación minimalista en blanco y negro | (mismo repo) |
| `3dviz-pro-max` | Escenas y explicativos 3D con Three.js (incluye kits de modelos) | https://github.com/viettranx/3dviz-pro-max |

No se instalaron: `video-talkcraft` y `anything2explainer` (licencia no comercial) ni la skill que imita el estilo de un creador concreto.

**Librerías npm nuevas** (ya en `package.json`):

- Remotion: `@remotion/transitions` (transiciones entre escenas), `@remotion/motion-blur` (desenfoque de movimiento), `@remotion/noise`, `@remotion/paths` y `@remotion/shapes` (trazos y formas SVG), `@remotion/lottie` + `lottie-web`, `@remotion/animation-utils`, `@remotion/layout-utils` (ajustar texto), `@remotion/gif`.
- Animación: `gsap`.
- 3D: `@react-three/drei` (entornos, texto 3D, contornos), `@react-three/postprocessing` + `postprocessing` (bloom, profundidad de campo, viñeta).
