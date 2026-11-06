import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, MONO } from "../theme";

export const RC_FPS = 30;
export const RC_W = 1080;
export const RC_H = 1920;

// Escenas (en cuadros)
const E = {
  gancho: [0, 105],
  horas: [105, 255],
  edad: [255, 390],
  grilla: [390, 630],
  dias: [630, 810],
  giro: [810, 975],
  cta: [975, 1125],
} as const;
export const RC_TOTAL = 1125;

// ---------- Curvas ----------
/** Rebote "estilo Apple" de la skill editar-reels-claude (rebote.js), en segundos */
const vb = (t: number, fuerza = 0.07, llegada = 0.3) => {
  if (t <= 0) return 0;
  if (t < llegada) return (t / llegada) ** 2;
  const u = t - llegada;
  if (u > 0.8) return 1;
  return 1 + ((2 / llegada) * fuerza * Math.sin(2.5 * u * 2 * Math.PI)) / Math.exp(5 * u);
};
const out3 = (p: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const coma = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// ---------- Fondo ----------
const Fondo: React.FC = () => {
  const f = useCurrentFrame();
  const a = f / 30;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: "50%", left: -300 + Math.sin(a * 0.4) * 120, top: -250 + Math.cos(a * 0.3) * 90, background: "radial-gradient(circle, rgba(255,77,46,.30), transparent 65%)" }} />
      <div style={{ position: "absolute", width: 1000, height: 1000, borderRadius: "50%", right: -350 + Math.cos(a * 0.35) * 110, bottom: -200 + Math.sin(a * 0.25) * 120, background: "radial-gradient(circle, rgba(242,200,140,.13), transparent 65%)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(242,239,233,.045) 2px, transparent 2px), linear-gradient(90deg, rgba(242,239,233,.045) 2px, transparent 2px)", backgroundSize: "90px 90px", maskImage: "radial-gradient(ellipse 85% 70% at 50% 45%, #000 35%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 85% 70% at 50% 45%, #000 35%, transparent 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(140% 110% at 50% 0%, transparent 50%, rgba(0,0,0,.75) 100%)" }} />
    </AbsoluteFill>
  );
};

// ---------- Texto que entra (sin rebote, como pide la skill) ----------
const Linea: React.FC<{ desde: number; children: React.ReactNode; size?: number; color?: string; font?: string; style?: React.CSSProperties }> = ({ desde, children, size = 96, color = C.fg, font = DISPLAY, style }) => {
  const f = useCurrentFrame();
  const p = out3((f - desde) / 12);
  return (
    <div style={{ fontFamily: font, fontSize: size, lineHeight: 1.02, color, opacity: p, transform: `translateY(${(1 - p) * 40}px)`, filter: `blur(${(1 - p) * 14}px)`, ...style }}>
      {children}
    </div>
  );
};

/** Tarjeta de cristal con barrido de luz (estilo-cristal.css de la skill, en colores del canal) */
const Cristal: React.FC<{ desde: number; children: React.ReactNode; style?: React.CSSProperties; dorado?: boolean }> = ({ desde, children, style, dorado }) => {
  const f = useCurrentFrame();
  const t = (f - desde) / 30;
  const s = vb(t, 0.07);
  const barrido = interpolate(t, [0.3, 1.2], [-300, 1300], clamp);
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 48, padding: "40px 44px", background: "linear-gradient(160deg, rgba(42,42,42,.62), rgba(20,20,20,.72))", border: `3px solid ${dorado ? "rgba(255,77,46,.65)" : "rgba(242,239,233,.16)"}`, boxShadow: `0 60px 120px -40px rgba(0,0,0,.85), inset 0 3px 0 rgba(255,255,255,.10)${dorado ? ", 0 0 80px -10px rgba(255,77,46,.45)" : ""}`, opacity: Math.min(1, t * 4), transform: `translateY(${(1 - Math.min(s, 1)) * 110}px) scale(${0.92 + 0.08 * s})`, filter: `blur(${Math.max(0, (1 - t * 3) * 20)}px)`, ...style }}>
      <div style={{ position: "absolute", top: 0, left: "12%", right: "12%", height: 3, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.7), transparent)" }} />
      <div style={{ position: "absolute", top: "-10%", bottom: "-10%", left: barrido, width: 200, transform: "skewX(-18deg)", background: "linear-gradient(100deg, transparent, rgba(255,236,210,.16), transparent)" }} />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
};

// ---------- Personaje animado ----------
type PersonaProps = { piel: string; pelo: string; polera: string; arriba?: number; brillo?: number; fase?: number; peinado?: 0 | 1 | 2 };
const Persona: React.FC<PersonaProps> = ({ piel, pelo, polera, arriba = 0, brillo = 1, fase = 0, peinado = 0 }) => {
  const f = useCurrentFrame() + fase;
  const giro = interpolate(arriba, [0, 1], [20, 0]);
  const parpadeo = f % 95 < 4 ? 0.15 : 1;
  const pulgar = Math.sin(f / 5) * 7;
  const respira = Math.sin(f / 22) * 2.5;
  const ojoY = interpolate(arriba, [0, 1], [117, 104]);
  const ojoRy = interpolate(arriba, [0, 1], [2.8, 6]) * parpadeo;
  const telY = interpolate(arriba, [0, 1], [0, 60]);
  const luz = brillo * interpolate(arriba, [0, 1], [1, 0.15]);
  const peinados = [
    "M50 104 Q48 48 100 46 Q152 48 150 104 Q142 72 100 70 Q58 72 50 104Z",
    "M48 112 Q40 40 104 42 Q160 46 152 110 Q150 80 128 70 Q96 84 60 76 Q50 90 48 112Z",
    "M50 100 Q52 50 100 48 Q148 50 150 100 Q150 150 158 190 L140 190 Q144 120 138 96 Q100 80 62 96 Q56 120 60 190 L42 190 Q50 150 50 100Z",
  ];
  return (
    <svg viewBox="0 0 200 300" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <radialGradient id={`luz${fase}`} cx="50%" cy="85%" r="65%"><stop offset="0" stopColor="#BFE3FF" stopOpacity={0.55 * luz} /><stop offset="1" stopColor="#BFE3FF" stopOpacity="0" /></radialGradient>
        <linearGradient id={`pant${fase}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E8F5FF" /><stop offset="1" stopColor="#7CC4FF" /></linearGradient>
      </defs>
      <g transform={`translate(0 ${respira})`}>
        <path d="M24 300 L26 218 Q30 168 76 164 L124 164 Q170 168 174 218 L176 300 Z" fill={polera} />
        <rect x="87" y="134" width="26" height="40" rx="10" fill={piel} />
        <g transform={`rotate(${giro} 100 150)`}>
          {peinado === 2 ? <path d={peinados[2]} fill={pelo} /> : null}
          <circle cx="100" cy="104" r="50" fill={piel} />
          <path d={peinados[peinado === 2 ? 0 : peinado]} fill={pelo} />
          <ellipse cx="82" cy={ojoY} rx="5.5" ry={ojoRy} fill="#1A1A1A" />
          <ellipse cx="118" cy={ojoY} rx="5.5" ry={ojoRy} fill="#1A1A1A" />
          <path d={arriba > 0.5 ? "M86 128 Q100 140 114 128" : "M90 132 Q100 135 110 132"} stroke="#5A2E22" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="104" r="50" fill={`url(#luz${fase})`} />
        </g>
        <g transform={`translate(0 ${telY})`}>
          <path d="M54 206 Q56 254 92 240" stroke={polera} strokeWidth="26" fill="none" strokeLinecap="round" />
          <path d="M146 206 Q144 254 108 240" stroke={polera} strokeWidth="26" fill="none" strokeLinecap="round" />
          <polygon points="86,204 114,204 148,120 52,120" fill="#BFE3FF" opacity={0.07 * luz} />
          <rect x="82" y="194" width="36" height="58" rx="7" fill="#0B0B0B" stroke="#3A3A3A" strokeWidth="2" />
          <rect x="86" y="199" width="28" height="47" rx="4" fill={`url(#pant${fase})`} opacity={0.35 + 0.65 * luz} />
          <rect x="89" y={210 + pulgar * 0.6} width="22" height="5" rx="2" fill="#fff" opacity={0.7 * luz} />
          <rect x="89" y={222 + pulgar * 0.6} width="16" height="5" rx="2" fill="#fff" opacity={0.5 * luz} />
          <circle cx="93" cy="242" r="9" fill={piel} />
          <circle cx="108" cy={236 + pulgar * 0.5} r="8" fill={piel} />
        </g>
      </g>
    </svg>
  );
};

// ---------- Íconos de notificación ----------
const Notif: React.FC<{ desde: number; x: number; y: number; tipo: "corazon" | "chat" | "campana"; color: string }> = ({ desde, x, y, tipo, color }) => {
  const f = useCurrentFrame();
  const t = (f - desde) / 30;
  if (t < 0) return null;
  const s = vb(t, 0.12);
  const flota = Math.sin((f - desde) / 10) * 8;
  const icon = {
    corazon: <path d="M24 42 L8 26 A9 9 0 0 1 24 12 A9 9 0 0 1 40 26 Z" fill="#fff" />,
    chat: <path d="M8 12 H40 V32 H22 L12 40 V32 H8 Z" fill="#fff" />,
    campana: <path d="M24 8 C14 8 12 18 12 26 L8 34 H40 L36 26 C36 18 34 8 24 8 Z M19 37 A5 5 0 0 0 29 37 Z" fill="#fff" />,
  }[tipo];
  return (
    <div style={{ position: "absolute", left: x, top: y + flota, width: 110, height: 110, borderRadius: 34, background: color, display: "grid", placeItems: "center", transform: `scale(${s})`, boxShadow: "0 20px 40px rgba(0,0,0,.4)" }}>
      <svg viewBox="0 0 48 48" width="62" height="62">{icon}</svg>
      <div style={{ position: "absolute", top: -10, right: -10, width: 40, height: 40, borderRadius: 20, background: C.accent, color: "#fff", fontFamily: MONO, fontWeight: 700, fontSize: 22, display: "grid", placeItems: "center", border: `4px solid ${C.bg}` }}>{1 + Math.floor(Math.max(0, f - desde) / 12) % 9}</div>
    </div>
  );
};

const Etiqueta: React.FC<{ children: React.ReactNode; desde: number }> = ({ children, desde }) => {
  const f = useCurrentFrame();
  const p = out3((f - desde) / 10);
  return <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: C.dim, opacity: p }}>{children}</div>;
};

// ---------- Escenas ----------
const Gancho: React.FC = () => {
  const f = useCurrentFrame();
  const sale = interpolate(f, [92, 105], [1, 0], clamp);
  const sp = vb((f - 30) / 30, 0.045);
  return (
    <AbsoluteFill style={{ opacity: sale }}>
      <div style={{ position: "absolute", left: 80, right: 140, top: 250 }}>
        <Linea desde={2} size={110}>¿Cuántos</Linea>
        <Linea desde={10} size={190} color={C.accent}>años</Linea>
        <Linea desde={20} size={92}>de tu vida vas a pasar en el</Linea>
        <Linea desde={32} size={150} color={C.accent}>celular?</Linea>
      </div>
      <div style={{ position: "absolute", left: 320, width: 440, height: 660, top: 960, transform: `scale(${0.3 + 0.7 * Math.min(sp, 1.05)})`, opacity: Math.min(1, (f - 30) / 6), transformOrigin: "50% 100%" }}>
        <Persona piel="#E9B48E" pelo="#2B1B14" polera="#3B5BDB" />
      </div>
    </AbsoluteFill>
  );
};

const Horas: React.FC = () => {
  const f = useCurrentFrame();
  const sale = interpolate(f, [138, 150], [1, 0], clamp);
  const horas = interpolate(f, [20, 80], [0, 4], { ...clamp, easing: (x) => out3(x) });
  const ang = (horas / 24) * 360;
  return (
    <AbsoluteFill style={{ opacity: sale }}>
      <div style={{ position: "absolute", left: 80, right: 140, top: 240 }}>
        <Etiqueta desde={0}>SUPONGAMOS QUE USAS EL CELULAR</Etiqueta>
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 20 }}>
          <Linea desde={4} size={230} color={C.accent}><span>{coma(horas, horas % 1 ? 1 : 0).replace(",0", "")}</span></Linea>
          <Linea desde={10} size={86}>horas<br />al día</Linea>
        </div>
      </div>
      <div style={{ position: "absolute", right: 120, top: 560, width: 260, height: 260 }}>
        <svg viewBox="0 0 100 100" width="260" height="260" style={{ opacity: out3((f - 8) / 12) }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(242,239,233,.14)" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none" stroke={C.accent} strokeWidth="8" strokeDasharray={`${(ang / 360) * 276.5} 276.5`} transform="rotate(-90 50 50)" strokeLinecap="round" />
          <line x1="50" y1="50" x2={50 + 32 * Math.sin((ang * Math.PI) / 180)} y2={50 - 32 * Math.cos((ang * Math.PI) / 180)} stroke={C.fg} strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="50" r="5" fill={C.fg} />
        </svg>
        <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 24, color: C.dim, marginTop: 6 }}>de 24 horas</div>
      </div>
      <div style={{ position: "absolute", left: 270, width: 520, height: 780, top: 880 }}>
        <Persona piel="#E9B48E" pelo="#2B1B14" polera="#3B5BDB" />
        <Notif desde={40} x={-40} y={120} tipo="corazon" color="#E1306C" />
        <Notif desde={62} x={470} y={60} tipo="chat" color="#25D366" />
        <Notif desde={84} x={500} y={330} tipo="campana" color="#5865F2" />
      </div>
    </AbsoluteFill>
  );
};

const Edad: React.FC = () => {
  const f = useCurrentFrame();
  const sale = interpolate(f, [123, 135], [1, 0], clamp);
  const edad = Math.round(interpolate(f, [10, 50], [0, 25], { ...clamp, easing: (x) => out3(x) }));
  const barra = interpolate(f, [55, 95], [0, 1], { ...clamp, easing: (x) => out3(x) });
  return (
    <AbsoluteFill style={{ opacity: sale }}>
      <div style={{ position: "absolute", left: 80, right: 140, top: 250 }}>
        <Etiqueta desde={0}>Y QUE TIENES</Etiqueta>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 14 }}>
          <Linea desde={4} size={240}>{edad}</Linea>
          <Linea desde={12} size={90}>años</Linea>
        </div>
        <Linea desde={50} size={64} color={C.dim} font={MONO} style={{ marginTop: 30, fontWeight: 700 }}>y vives hasta los 80</Linea>
      </div>
      <div style={{ position: "absolute", left: 80, right: 140, top: 980 }}>
        <Cristal desde={50}>
          <div style={{ fontFamily: MONO, fontSize: 28, color: C.dim, display: "flex", justifyContent: "space-between" }}><span>0</span><span>25</span><span>80</span></div>
          <div style={{ position: "relative", height: 46, marginTop: 14, borderRadius: 23, background: "rgba(242,239,233,.12)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(25 / 80) * 100}%`, background: "#5A5750" }} />
            <div style={{ position: "absolute", left: `${(25 / 80) * 100}%`, top: 0, bottom: 0, width: `${(55 / 80) * 100 * barra}%`, background: C.fg }} />
          </div>
          <div style={{ marginTop: 26, fontFamily: DISPLAY, fontSize: 72, color: C.fg, opacity: barra }}>te quedan 55 años</div>
        </Cristal>
      </div>
      <div style={{ position: "absolute", left: 360, width: 360, height: 540, top: 1290 }}>
        <Persona piel="#E9B48E" pelo="#2B1B14" polera="#3B5BDB" />
      </div>
    </AbsoluteFill>
  );
};

const Grilla: React.FC = () => {
  const f = useCurrentFrame();
  const sale = interpolate(f, [225, 240], [1, 0], clamp);
  const ANIOS = (55 * 4) / 24; // 9,17
  const grises = Math.floor(interpolate(f, [20, 60], [0, 25], clamp));
  const rojos = interpolate(f, [80, 170], [0, ANIOS], clamp);
  const numT = (f - 175) / 30;
  const numS = vb(numT, 0.045);
  return (
    <AbsoluteFill style={{ opacity: sale }}>
      <div style={{ position: "absolute", left: 80, right: 140, top: 230 }}>
        <Linea desde={0} size={84}>Tu vida en cuadritos</Linea>
        <Linea desde={6} size={30} color={C.dim} font={MONO}>cada cuadrito es un año</Linea>
      </div>
      <div style={{ position: "absolute", left: 130, right: 190, top: 520 }}>
        <Cristal desde={8} style={{ padding: 30 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 10 }}>
            {Array.from({ length: 80 }, (_, i) => {
              const k = i - 25;
              let bg = "rgba(242,239,233,.1)";
              let sc = 1;
              if (i < grises) bg = "#5A5750";
              if (k >= 0 && k < Math.floor(rojos)) { bg = C.accent; sc = 0.9; }
              const parcial = k === Math.floor(rojos) && rojos % 1 > 0.05 && rojos >= ANIOS - 0.001;
              return <div key={i} style={{ aspectRatio: "1", borderRadius: 10, background: parcial ? `linear-gradient(90deg, ${C.accent} ${Math.round((ANIOS % 1) * 100)}%, rgba(242,239,233,.1) 0)` : bg, transform: `scale(${sc})`, boxShadow: bg === C.accent ? "0 0 24px rgba(255,77,46,.55)" : "none" }} />;
            })}
          </div>
          <div style={{ display: "flex", gap: 28, marginTop: 22, fontFamily: MONO, fontSize: 24, color: C.dim }}>
            <span>■ ya vivido</span><span style={{ color: C.accent }}>■ en el celular</span>
          </div>
        </Cristal>
      </div>
      {numT > 0 ? (
        <div style={{ position: "absolute", left: 80, right: 140, top: 1290, transform: `scale(${0.4 + 0.6 * numS})`, transformOrigin: "0% 50%", opacity: Math.min(1, numT * 5) }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 230, lineHeight: 0.9, color: C.accent, textShadow: "0 0 80px rgba(255,77,46,.5)", whiteSpace: "nowrap" }}>9,2 <span style={{ fontSize: 96, color: C.fg }}>años</span></div>
          <div style={{ fontFamily: DISPLAY, fontSize: 60, color: C.fg, marginTop: 12 }}>mirando el celular.</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const PALETA: PersonaProps[] = [
  { piel: "#E9B48E", pelo: "#2B1B14", polera: "#3B5BDB" },
  { piel: "#8D5B3E", pelo: "#111", polera: "#E8590C", peinado: 1 },
  { piel: "#F3CDB0", pelo: "#C28A3A", polera: "#2F9E44", peinado: 2 },
  { piel: "#C68B62", pelo: "#3A2418", polera: "#AE3EC9" },
  { piel: "#5E3B2A", pelo: "#0E0E0E", polera: "#F2EFE9", peinado: 2 },
  { piel: "#EAC1A0", pelo: "#6B3F23", polera: "#1C7ED6", peinado: 1 },
];

const Dias: React.FC = () => {
  const f = useCurrentFrame();
  const sale = interpolate(f, [165, 180], [1, 0], clamp);
  const dias = interpolate(f, [8, 60], [0, 3348], { ...clamp, easing: (x) => out3(x) });
  return (
    <AbsoluteFill style={{ opacity: sale }}>
      <div style={{ position: "absolute", left: 80, right: 140, top: 240 }}>
        <Etiqueta desde={0}>ES DECIR</Etiqueta>
        <Linea desde={4} size={210} color={C.accent} style={{ marginTop: 10 }}>{miles(dias)}</Linea>
        <Linea desde={12} size={76}>días completos,</Linea>
        <Linea desde={18} size={76}>sin parar.</Linea>
        <Linea desde={70} size={52} color={C.dim} font={MONO} style={{ marginTop: 40, fontWeight: 700 }}>y no eres el único.</Linea>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 1000, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px 0" }}>
        {Array.from({ length: 8 }, (_, i) => {
          const d = 70 + i * 6;
          const t = (f - d) / 30;
          const s = vb(t, 0.04, 0.32);
          return (
            <div key={i} style={{ height: 340, transform: `translateY(${(1 - Math.min(s, 1)) * 120}px) scale(${0.85 + 0.15 * Math.min(s, 1.04)})`, opacity: Math.min(1, t * 5) }}>
              <Persona {...PALETA[i % PALETA.length]} fase={i * 17} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Giro: React.FC = () => {
  const f = useCurrentFrame();
  const sale = interpolate(f, [150, 165], [1, 0], clamp);
  const h = interpolate(f, [40, 90], [4, 2], { ...clamp, easing: (x) => out3(x) });
  const anios = (55 * h) / 24;
  const arriba = interpolate(f, [60, 100], [0, 1], { ...clamp, easing: (x) => out3(x) });
  return (
    <AbsoluteFill style={{ opacity: sale }}>
      <div style={{ position: "absolute", left: 80, right: 140, top: 240 }}>
        <Linea desde={0} size={84}>Pero el número</Linea>
        <Linea desde={6} size={84} color={C.accent}>cambia contigo.</Linea>
      </div>
      <div style={{ position: "absolute", left: 80, right: 140, top: 560 }}>
        <Cristal desde={14}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 30, color: C.dim }}>
            <span>horas al día</span><span style={{ color: C.fg, fontWeight: 700 }}>{coma(h, 1).replace(",0", "")} h</span>
          </div>
          <div style={{ position: "relative", height: 16, borderRadius: 8, background: "rgba(242,239,233,.12)", marginTop: 26 }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(h / 8) * 100}%`, borderRadius: 8, background: C.fg }} />
            <div style={{ position: "absolute", top: -18, left: `calc(${(h / 8) * 100}% - 26px)`, width: 52, height: 52, borderRadius: 26, background: C.fg, border: `8px solid ${C.bg}` }} />
          </div>
          <div style={{ marginTop: 40, fontFamily: DISPLAY, fontSize: 170, lineHeight: 0.9, color: C.fg }}>{coma(anios)} <span style={{ fontSize: 70 }}>años</span></div>
          <div style={{ fontFamily: MONO, fontSize: 30, color: C.dim, marginTop: 14 }}>con 2 horas al día, la mitad.</div>
        </Cristal>
      </div>
      <div style={{ position: "absolute", left: 330, width: 420, height: 630, top: 1130 }}>
        <Persona piel="#E9B48E" pelo="#2B1B14" polera="#3B5BDB" arriba={arriba} />
      </div>
    </AbsoluteFill>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const fin = interpolate(f, [135, 150], [1, 0], clamp);
  const tel = vb((f - 20) / 30, 0.05);
  return (
    <AbsoluteFill style={{ opacity: fin }}>
      <div style={{ position: "absolute", left: 80, right: 140, top: 230 }}>
        <Linea desde={0} size={110}>¿Y tú?</Linea>
        <Linea desde={8} size={110} color={C.accent}>Calcula el tuyo.</Linea>
      </div>
      <div style={{ position: "absolute", left: 270, top: 620, width: 540, transform: `translateY(${(1 - Math.min(tel, 1)) * 200}px) rotate(${(1 - Math.min(tel, 1)) * -8}deg)`, opacity: Math.min(1, (f - 20) / 6) }}>
        <div style={{ borderRadius: 64, background: "#0B0B0B", padding: 14, boxShadow: "0 0 0 3px #333, 0 60px 120px rgba(0,0,0,.6), 0 0 120px -30px rgba(255,77,46,.5)" }}>
          <div style={{ borderRadius: 52, overflow: "hidden", height: 860 }}>
            <Img src={staticFile("reel-celular/calculadora.png")} style={{ width: "100%" }} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 80, right: 140, top: 1560 }}>
        <Cristal desde={45} dorado>
          <div style={{ fontFamily: MONO, fontSize: 26, color: C.dim }}>link en la descripción</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 38, color: C.fg, marginTop: 6 }}>datosqueduelen.netlify.app</div>
        </Cristal>
      </div>
    </AbsoluteFill>
  );
};

const Marca: React.FC = () => (
  <div style={{ position: "absolute", top: 120, left: 80, fontFamily: DISPLAY, fontSize: 34, letterSpacing: 1, color: C.fg }}>
    DATOS QUE <span style={{ color: C.accent }}>DUELEN</span>
  </div>
);

// ---------- Sonido ----------
const Sfx: React.FC<{ at: number; n: string; v?: number }> = ({ at, n, v = 0.5 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={90} layout="none">
    <Audio src={staticFile(`reel-celular/sfx/${n}.wav`)} volume={v} />
  </Sequence>
);

export const ReelCelular: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const escenas: [keyof typeof E, React.FC][] = [["gancho", Gancho], ["horas", Horas], ["edad", Edad], ["grilla", Grilla], ["dias", Dias], ["giro", Giro], ["cta", Cta]];
  return (
    <AbsoluteFill>
      <Fondo />
      {escenas.map(([k, Comp]) => (
        <Sequence key={k} from={E[k][0]} durationInFrames={E[k][1] - E[k][0]} name={k}>
          <Comp />
        </Sequence>
      ))}
      <Marca />
      <Audio src={staticFile("reel-celular/musica.wav")} volume={(f) => interpolate(f, [0, 20, durationInFrames - 40, durationInFrames], [0, 0.42, 0.42, 0], clamp)} />
      <Sfx at={2} n="impact" v={0.55} />
      {[105, 255, 390, 630, 810, 975].map((t) => <Sfx key={t} at={t - 4} n="whoosh" v={0.32} />)}
      {[145, 167, 189].map((t) => <Sfx key={t} at={t - 1} n="uiclick" v={0.45} />)}
      <Sfx at={390 + 95} n="riser" v={0.3} />
      <Sfx at={390 + 174} n="braaam" v={0.5} />
      <Sfx at={810 + 2} n="glitch" v={0.35} />
      <Sfx at={975 + 18} n="impact" v={0.45} />
    </AbsoluteFill>
  );
};
