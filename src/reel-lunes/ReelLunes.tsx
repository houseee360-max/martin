import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, DISPLAY, MONO } from "../theme";

export const RL_FPS = 30;
export const RL_W = 1080;
export const RL_H = 1920;

// Línea de tiempo (cuadros)
const LISTA_INICIO = 36; // la lista arranca a los 1,2 s
const PASO = 13; // cuadros por año (~0,43 s): rápido, para que pausen a buscar su año
const ANIOS = Array.from({ length: 41 }, (_, i) => 2010 - i); // 2010 → 1970
const LISTA_FIN = LISTA_INICIO + ANIOS.length * PASO; // 569
const REMATE = LISTA_FIN + 6; // 575
const CTA = REMATE + 84; // 659
export const RL_TOTAL = CTA + 96; // 755 ≈ 25 s

// Lunes vividos por alguien nacido a mitad de ese año, contados hasta el 6-nov-2026
const HOY = Date.UTC(2026, 10, 6);
const lunes = (y: number) => Math.floor((HOY - Date.UTC(y, 6, 1)) / 86400000 / 7);
const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out3 = (p: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
/** Rebote de la skill editar-reels-claude (rebote.js) */
const vb = (t: number, fuerza = 0.08, llegada = 0.22) => {
  if (t <= 0) return 0;
  if (t < llegada) return (t / llegada) ** 2;
  const u = t - llegada;
  if (u > 0.8) return 1;
  return 1 + ((2 / llegada) * fuerza * Math.sin(2.5 * u * 2 * Math.PI)) / Math.exp(5 * u);
};

// ---------- Íconos ----------
const Despertador: React.FC<{ size: number; sonando: boolean }> = ({ size, sonando }) => {
  const f = useCurrentFrame();
  const vib = sonando ? Math.sin(f * 2.6) * 9 : 0;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ transform: `rotate(${vib}deg)`, overflow: "visible" }}>
      <path d="M22 34 A16 16 0 0 1 44 14" stroke={C.accent} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M98 34 A16 16 0 0 0 76 14" stroke={C.accent} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M36 104 L28 114 M84 104 L92 114" stroke={C.fg} strokeWidth="8" strokeLinecap="round" />
      <circle cx="60" cy="64" r="40" fill={C.fg} />
      <circle cx="60" cy="64" r="32" fill={C.bg} />
      <path d="M60 64 L60 42 M60 64 L74 72" stroke={C.fg} strokeWidth="6" strokeLinecap="round" />
      <circle cx="60" cy="64" r="4" fill={C.accent} />
      {sonando ? (
        <g stroke={C.accent} strokeWidth="5" strokeLinecap="round" opacity={0.5 + 0.5 * Math.abs(Math.sin(f * 1.3))}>
          <path d="M6 64 H-8 M114 64 H128 M14 98 L2 108 M106 98 L118 108" />
        </g>
      ) : null}
    </svg>
  );
};

const CalendarioLun: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    <rect x="8" y="14" width="84" height="78" rx="14" fill={C.fg} />
    <rect x="8" y="14" width="84" height="26" rx="14" fill={C.accent} />
    <rect x="8" y="28" width="84" height="12" fill={C.accent} />
    <rect x="26" y="6" width="8" height="18" rx="4" fill={C.fg} />
    <rect x="66" y="6" width="8" height="18" rx="4" fill={C.fg} />
    <text x="50" y="78" textAnchor="middle" fontFamily="Archivo Black" fontSize="30" fill={C.bg}>LUN</text>
  </svg>
);

// ---------- Fondo ----------
const Fondo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1200, height: 1200, borderRadius: "50%", left: -260, top: 420 + Math.sin(f / 40) * 60, background: "radial-gradient(circle, rgba(255,77,46,.22), transparent 62%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(140% 100% at 50% 50%, transparent 55%, rgba(0,0,0,.8) 100%)" }} />
    </AbsoluteFill>
  );
};

// ---------- Cabecera fija (visible desde el cuadro 0, para que la portada ya enganche) ----------
const Cabecera: React.FC = () => {
  const f = useCurrentFrame();
  const golpe = vb(f / 30, 0.1, 0.12);
  const achica = interpolate(f, [24, 40], [1, 0.62], { ...clamp, easing: out3 });
  const subeY = interpolate(f, [24, 40], [560, 170], { ...clamp, easing: out3 });
  const ocultar = interpolate(f, [REMATE - 4, REMATE + 4], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: subeY, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${achica * (0.85 + 0.15 * golpe)})`, transformOrigin: "50% 0%", opacity: ocultar }}>
      <Despertador size={190} sonando={f < 45} />
      <div style={{ marginTop: 20, fontFamily: DISPLAY, fontSize: 104, lineHeight: 1, color: C.fg, textAlign: "center" }}>
        ¿Cuántos <span style={{ color: C.accent }}>LUNES</span>
        <br />
        has sobrevivido?
      </div>
    </div>
  );
};

const BuscaTuAnio: React.FC = () => {
  const f = useCurrentFrame();
  const aparece = out3((f - 4) / 8);
  const late = 1 + 0.05 * Math.sin(f / 4);
  const ocultar = interpolate(f, [REMATE - 4, REMATE + 4], [1, 0], clamp);
  const y = interpolate(f, [24, 40], [1060, 520], { ...clamp, easing: out3 });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", opacity: aparece * ocultar }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 30px", borderRadius: 999, background: C.accent, transform: `scale(${late})`, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: "#fff", letterSpacing: 1 }}>
        BUSCA TU AÑO
        <svg viewBox="0 0 24 24" width="40" height="40"><path d="M12 4v14M6 12l6 6 6-6" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </div>
  );
};

// ---------- La rueda de años ----------
const Rueda: React.FC = () => {
  const f = useCurrentFrame();
  if (f < LISTA_INICIO - 6 || f > REMATE + 6) return null;
  const t = Math.max(0, f - LISTA_INICIO);
  const idx = Math.min(ANIOS.length - 1, Math.floor(t / PASO));
  const local = (t % PASO) / PASO;
  // cada año entra con un salto corto y se queda quieto (efecto tic)
  const salto = idx >= ANIOS.length - 1 && t >= (ANIOS.length - 1) * PASO ? 1 : out3(local / 0.45);
  const pos = idx - 1 + salto; // posición continua de la rueda
  const entra = out3((f - (LISTA_INICIO - 6)) / 8);
  const sale = interpolate(f, [REMATE - 6, REMATE + 6], [1, 0], clamp);
  const CENTRO = 1080;
  const ALTO = 210;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: entra * sale }}>
      {/* franja de selección */}
      <div style={{ position: "absolute", left: 60, right: 60, top: CENTRO - 140, height: 280, borderRadius: 40, background: "rgba(242,239,233,.06)", border: "3px solid rgba(255,77,46,.55)", boxShadow: "0 0 80px -20px rgba(255,77,46,.6)" }} />
      {ANIOS.map((y, i) => {
        const d = i - pos;
        if (Math.abs(d) > 3) return null;
        const yPx = CENTRO + d * ALTO;
        const cerca = Math.max(0, 1 - Math.abs(d));
        const op = interpolate(Math.abs(d), [0, 1, 1.8], [1, 0.32, 0], clamp);
        const esc = 0.62 + 0.38 * cerca;
        const n = lunes(y);
        return (
          <div key={y} style={{ position: "absolute", left: 0, right: 0, top: yPx, transform: `translateY(-50%) scale(${esc})`, opacity: op, display: "flex", alignItems: "center", justifyContent: "center", gap: 34 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 150, color: C.fg, lineHeight: 1, width: 410, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{y}</div>
            <div style={{ width: 6, height: 140, borderRadius: 3, background: "rgba(242,239,233,.2)" }} />
            <div style={{ width: 380 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 108, color: C.accent, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{miles(n)}</div>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: C.dim, marginTop: 6 }}>lunes</div>
            </div>
          </div>
        );
      })}
      {/* barra de avance: el ojo sabe que falta poco para su año */}
      <div style={{ position: "absolute", left: 120, right: 120, top: 1440, height: 10, borderRadius: 5, background: "rgba(242,239,233,.12)" }}>
        <div style={{ width: `${(Math.min(t, ANIOS.length * PASO) / (ANIOS.length * PASO)) * 100}%`, height: "100%", borderRadius: 5, background: C.accent }} />
      </div>
      <div style={{ position: "absolute", left: 120, right: 120, top: 1466, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 26, color: C.dim }}>
        <span>2010</span><span>1990</span><span>1970</span>
      </div>
    </div>
  );
};

// ---------- Remate y cierre ----------
const Remate: React.FC = () => {
  const f = useCurrentFrame();
  const s = vb(f / 30, 0.06);
  const t2 = vb((f - 30) / 30, 0.08);
  const sale = interpolate(f, [76, 84], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: sale }}>
      <div style={{ transform: `scale(${0.5 + 0.5 * s})` }}><Despertador size={300} sonando /></div>
      <div style={{ marginTop: 50, fontFamily: DISPLAY, fontSize: 110, lineHeight: 1.02, color: C.fg, textAlign: "center", transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, f / 4) }}>
        Y este lunes…
      </div>
      <div style={{ marginTop: 20, fontFamily: DISPLAY, fontSize: 130, lineHeight: 1, color: C.accent, textAlign: "center", transform: `scale(${Math.max(0, t2)})` }}>
        también cuenta.
      </div>
    </AbsoluteFill>
  );
};

const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  const a = vb(f / 30, 0.07);
  const b = vb((f - 14) / 30, 0.07);
  const flecha = Math.sin(f / 4) * 14;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 80px" }}>
      <div style={{ transform: `scale(${a})` }}><CalendarioLun size={220} /></div>
      <div style={{ marginTop: 40, fontFamily: DISPLAY, fontSize: 120, lineHeight: 1, color: C.fg, transform: `scale(${Math.max(0, b)})` }}>
        Comenta <span style={{ color: C.accent }}>tu año</span>
      </div>
      <div style={{ marginTop: 26, fontFamily: MONO, fontWeight: 700, fontSize: 40, color: C.dim, opacity: out3((f - 26) / 10) }}>y cuántos lunes llevas</div>
      <svg viewBox="0 0 24 24" width="120" height="120" style={{ marginTop: 40, transform: `translateY(${flecha}px)`, opacity: out3((f - 30) / 8) }}>
        <path d="M12 3v16M5 12l7 7 7-7" stroke={C.accent} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};

const Marca: React.FC = () => {
  const f = useCurrentFrame();
  const op = interpolate(f, [LISTA_INICIO - 8, LISTA_INICIO, CTA, CTA + 8], [1, 0, 0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 420, textAlign: "center", fontFamily: DISPLAY, fontSize: 30, letterSpacing: 2, color: C.dim, opacity: op }}>
      DATOS QUE <span style={{ color: C.accent }}>DUELEN</span>
    </div>
  );
};

// ---------- Sonido (sin música) ----------
const Sfx: React.FC<{ at: number; n: string; v?: number }> = ({ at, n, v = 0.6 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={60} layout="none">
    <Audio src={staticFile(`reel-lunes/sfx/${n}.wav`)} volume={v} />
  </Sequence>
);

export const ReelLunes: React.FC = () => (
  <AbsoluteFill>
    <Fondo />
    <Cabecera />
    <BuscaTuAnio />
    <Rueda />
    <Sequence from={REMATE} durationInFrames={CTA - REMATE} name="remate"><Remate /></Sequence>
    <Sequence from={CTA} durationInFrames={RL_TOTAL - CTA} name="cierre"><Cierre /></Sequence>
    <Marca />

    {/* Segundo 0: el despertador suena de inmediato */}
    <Sfx at={0} n="alarma" v={0.55} />
    <Sfx at={0} n="golpe" v={0.5} />
    <Sfx at={24} n="whoosh" v={0.35} />
    {/* Un tic por año, un ding cada 5 años (2010, 2005, 2000…) */}
    {ANIOS.map((y, i) => (
      <Sfx key={y} at={LISTA_INICIO + i * PASO} n={y % 5 === 0 ? "ding" : "tic"} v={y % 5 === 0 ? 0.32 : 0.55} />
    ))}
    {/* Remate */}
    <Sfx at={REMATE - 40} n="riser" v={0.28} />
    <Sfx at={REMATE} n="alarma" v={0.5} />
    <Sfx at={REMATE + 30} n="golpe" v={0.6} />
    {/* Cierre */}
    <Sfx at={CTA} n="whoosh" v={0.35} />
    <Sfx at={CTA + 14} n="pop" v={0.55} />
  </AbsoluteFill>
);
