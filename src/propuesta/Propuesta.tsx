import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import VOZ from "./voz.json";

loadFont({
  family: "Archivo",
  url: staticFile("fonts/Archivo-var.woff2"),
  weight: "100 900",
  format: "woff2",
});

export const PROP_FPS = 30;
export const PROP_W = 1080;
export const PROP_H = 1920;

const C = {
  fondo: "#1E2024",
  panel: "#2A2D33",
  rojo: "#D92B2F",
  ambar: "#FFB21A",
  texto: "#FFFFFF",
  suave: "#B9BEC7",
  azul: "#1458E6",
};

type Escena = {
  key: string;
  titulo?: string;
  paso?: number;
  clip?: string;
  clipDur?: number;
  /** Texto de subtítulo como se lee en pantalla (con cifras) */
  sub: string;
};

const ESCENAS: Escena[] = [
  { key: "intro", sub: "Les preparamos una propuesta de página web para el Taller Automotriz Fredes. Les mostramos cómo funciona." },
  { key: "portada", paso: 1, titulo: "Lo primero que ve el cliente", clip: "portada", clipDur: 8.63, sub: "Lo primero que ve el cliente: sus 4,8 estrellas en Google y un botón para agendar por WhatsApp." },
  { key: "precios", paso: 2, titulo: "Precios a la vista", clip: "precios", clipDur: 10.4, sub: "Sus precios, a la vista, como órdenes de trabajo. El cliente sabe cuánto cuesta antes de llamar." },
  { key: "tablero", paso: 3, titulo: "¿Qué luz se encendió?", clip: "tablero", clipDur: 9.27, sub: "El cliente toca la luz que se le encendió en el tablero. La página le explica qué revisar y le escribe al taller con un toque." },
  { key: "revision", paso: 4, titulo: "Revisión técnica por patente", clip: "revision", clipDur: 9.0, sub: "Con el último número de la patente sabe en qué mes le toca la revisión técnica, y agenda la pre-revisión de $30.000." },
  { key: "agenda", paso: 5, titulo: "Agenda directo a WhatsApp", clip: "agenda", clipDur: 8.2, sub: "Para agendar, llena sus datos y se abre WhatsApp con el mensaje listo: nombre, patente, auto y servicio." },
  { key: "ubicacion", paso: 6, titulo: "Cómo llegar", clip: "ubicacion", clipDur: 5.87, sub: "Y al final, el mapa, el teléfono y un botón para llegar con Google Maps." },
  { key: "outro", sub: "La página queda conectada a su ficha de Google, para que sea más fácil encontrarlos. ¿La dejamos lista para el taller?" },
];

const vozDur = (k: string) => (VOZ as { key: string; dur: number }[]).find((v) => v.key === k)?.dur ?? 5;

/** Calcula duración de cada escena y velocidad de su clip */
export const plan = () => {
  let at = 0;
  return ESCENAS.map((e) => {
    const extra = e.key === "outro" ? 2.2 : e.key === "intro" ? 1.0 : 0.9;
    let dur = vozDur(e.key) + extra;
    let rate = 1;
    if (e.clipDur) {
      dur = Math.max(dur, e.clipDur / 1.5);
      rate = Math.min(1.5, Math.max(0.85, e.clipDur / dur));
    }
    const frames = Math.round(dur * PROP_FPS);
    const r = { ...e, from: at, frames, rate };
    at += frames;
    return r;
  });
};
export const PROP_TOTAL = plan().reduce((a, e) => a + e.frames, 0);

/** Subtítulo: las palabras se iluminan a medida que la voz avanza */
const ConVoz = React.createContext(true);

const Subtitulo: React.FC<{ texto: string; voz: number }> = ({ texto, voz }) => {
  const conVoz = React.useContext(ConVoz);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const palabras = texto.split(" ");
  const pesos = palabras.map((w) => w.replace(/[^\wáéíóúñ$]/gi, "").length + 1.5 + (/[.,:?]$/.test(w) ? 3 : 0));
  const total = pesos.reduce((a, b) => a + b, 0);
  let acc = 0;
  return (
    <div style={{ fontFamily: "Archivo", fontWeight: 600, fontSize: 40, lineHeight: 1.3, color: C.texto, textAlign: "center", letterSpacing: "-0.01em" }}>
      {palabras.map((w, i) => {
        const inicio = (acc / total) * voz;
        acc += pesos[i];
        const dicha = !conVoz || t >= inicio;
        return (
          <span key={i} style={{ opacity: dicha ? 1 : 0.32, transition: "none" }}>
            {w}{" "}
          </span>
        );
      })}
    </div>
  );
};

const Fondo: React.FC = () => (
  <AbsoluteFill style={{ background: C.fondo }}>
    <AbsoluteFill style={{ background: "radial-gradient(90% 50% at 85% 0%, rgba(217,43,47,.35), transparent 60%)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(70% 40% at 0% 100%, rgba(255,178,26,.12), transparent 60%)" }} />
  </AbsoluteFill>
);

const PHONE_W = 556;
const PHONE_H = Math.round((PHONE_W * 1688) / 780);

const Telefono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: PHONE_W + 28,
      height: PHONE_H + 28,
      borderRadius: 70,
      background: "#0C0D0F",
      padding: 14,
      boxShadow: "0 0 0 3px #3A3E46, 0 50px 120px rgba(0,0,0,.55)",
      position: "relative",
    }}
  >
    <div style={{ width: PHONE_W, height: PHONE_H, borderRadius: 56, overflow: "hidden", position: "relative", background: "#fff" }}>{children}</div>
  </div>
);

const EscenaClip: React.FC<{ e: ReturnType<typeof plan>[number] }> = ({ e }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });
  const sale = interpolate(frame, [e.frames - 8, e.frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tituloY = interpolate(entra, [0, 1], [40, 0]);
  return (
    <AbsoluteFill>
      {/* Título del paso */}
      <div style={{ position: "absolute", top: 84, left: 70, right: 70, opacity: entra * sale, transform: `translateY(${tituloY}px)` }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, fontFamily: "Archivo", fontWeight: 700, fontSize: 30, color: C.ambar }}>
          <span style={{ width: 48, height: 48, borderRadius: 24, background: C.ambar, color: C.fondo, display: "grid", placeItems: "center", fontWeight: 800 }}>{e.paso}</span>
          de 6
        </div>
        <div style={{ marginTop: 16, fontFamily: "Archivo", fontStretch: "125%", fontWeight: 800, fontSize: 62, lineHeight: 1.02, letterSpacing: "-0.02em", color: C.texto }}>{e.titulo}</div>
      </div>
      {/* Celular con la web */}
      <div style={{ position: "absolute", top: 372, left: (PROP_W - PHONE_W - 28) / 2 }}>
        <Telefono>
          <div style={{ position: "absolute", inset: 0, opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }) }}>
            <OffthreadVideo muted src={staticFile(`propuesta/${e.clip}.mp4`)} playbackRate={e.rate} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </Telefono>
      </div>
      {/* Subtítulo */}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 56, background: "rgba(30,32,36,.92)", borderRadius: 30, padding: "22px 28px", opacity: sale }}>
        <Subtitulo texto={e.sub} voz={vozDur(e.key)} />
      </div>
    </AbsoluteFill>
  );
};

const Intro: React.FC<{ e: ReturnType<typeof plan>[number] }> = ({ e }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 14 }, durationInFrames: 30 });
  const b = spring({ frame: frame - 12, fps, config: { damping: 200 }, durationInFrames: 24 });
  const c = spring({ frame: frame - 30, fps, config: { damping: 200 }, durationInFrames: 24 });
  const sale = interpolate(frame, [e.frames - 10, e.frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: 80, opacity: sale }}>
      <Img src={staticFile("propuesta/logo-fredes.png")} style={{ width: 260, transform: `scale(${a})` }} />
      <div style={{ marginTop: 50, opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>
        <div style={{ fontFamily: "Archivo", fontWeight: 700, fontSize: 36, color: C.ambar }}>Propuesta de página web</div>
        <div style={{ marginTop: 16, fontFamily: "Archivo", fontStretch: "125%", fontWeight: 800, fontSize: 96, lineHeight: 1.0, letterSpacing: "-0.02em", color: C.texto }}>
          Taller Automotriz Fredes
        </div>
      </div>
      <div style={{ marginTop: 60, display: "flex", alignItems: "center", gap: 16, opacity: c, fontFamily: "Archivo", fontWeight: 600, fontSize: 32, color: C.suave }}>
        <Img src={staticFile("propuesta/icono-vitrina.svg")} style={{ width: 64, background: "#fff", borderRadius: 32, padding: 6 }} />
        por Vitrina Limarí
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 70, background: "rgba(42,45,51,.9)", borderRadius: 30, padding: "24px 30px" }}>
        <Subtitulo texto={e.sub} voz={vozDur(e.key)} />
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ e: ReturnType<typeof plan>[number] }> = ({ e }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 24 });
  const b = spring({ frame: frame - 70, fps, config: { damping: 12 }, durationInFrames: 30 });
  const fin = interpolate(frame, [e.frames - 15, e.frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pasos = ["Precios a la vista", "Luces del tablero", "Revisión técnica", "Agenda por WhatsApp", "Mapa y contacto"];
  return (
    <AbsoluteFill style={{ padding: "150px 80px", opacity: fin }}>
      <div style={{ opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>
        <div style={{ fontFamily: "Archivo", fontWeight: 700, fontSize: 36, color: C.ambar }}>La página del taller incluye</div>
        <div style={{ marginTop: 34, display: "grid", gap: 20 }}>
          {pasos.map((p, i) => {
            const s = spring({ frame: frame - 8 - i * 6, fps, config: { damping: 200 }, durationInFrames: 18 });
            return (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 22, opacity: s, transform: `translateX(${(1 - s) * -40}px)`, fontFamily: "Archivo", fontWeight: 700, fontSize: 50, color: C.texto }}>
                <span style={{ width: 58, height: 58, borderRadius: 29, background: "#1F9D55", display: "grid", placeItems: "center", fontSize: 34 }}>✓</span>
                {p}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 980, opacity: b, transform: `scale(${0.9 + 0.1 * b})`, transformOrigin: "left center" }}>
        <div style={{ fontFamily: "Archivo", fontStretch: "125%", fontWeight: 800, fontSize: 92, lineHeight: 1.0, letterSpacing: "-0.02em", color: C.texto }}>
          ¿La dejamos lista para el <span style={{ color: C.ambar }}>taller</span>?
        </div>
        <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 18, fontFamily: "Archivo", fontWeight: 600, fontSize: 32, color: C.suave }}>
          <Img src={staticFile("propuesta/icono-vitrina.svg")} style={{ width: 70, background: "#fff", borderRadius: 35, padding: 7 }} />
          Vitrina Limarí · Páginas web para negocios de Ovalle
        </div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 70, background: "rgba(42,45,51,.9)", borderRadius: 30, padding: "24px 30px" }}>
        <Subtitulo texto={e.sub} voz={vozDur(e.key)} />
      </div>
    </AbsoluteFill>
  );
};

export const Propuesta: React.FC<{ conVoz?: boolean }> = ({ conVoz = true }) => {
  const escenas = plan();
  return (
    <ConVoz.Provider value={conVoz}>
    <AbsoluteFill>
      <Fondo />
      {escenas.map((e) => (
        <Sequence key={e.key} from={e.from} durationInFrames={e.frames} name={e.key}>
          {e.key === "intro" ? <Intro e={e} /> : e.key === "outro" ? <Outro e={e} /> : <EscenaClip e={e} />}
          {conVoz ? (
            <Sequence from={6} layout="none">
              <Audio src={staticFile(`propuesta/voz_${e.key}.mp3`)} />
            </Sequence>
          ) : null}
        </Sequence>
      ))}
    </AbsoluteFill>
    </ConVoz.Provider>
  );
};

// Easing importado para posibles ajustes de animación
void Easing;
