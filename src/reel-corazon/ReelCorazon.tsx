import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DISPLAY, MONO } from "../theme";
import { FiltrosNeon, parpadeo, Tubo } from "../reel-trabajo/Oficina";
import { N, rnd, TrabajadorFrente } from "../reel-trabajo/Trabajador";

export const RCZ_FPS = 30;
export const RCZ_W = 1080;
export const RCZ_H = 1920;

// 75 latidos por minuto = un latido cada 24 cuadros
const B = 24;
const T = {
  alejar: 120,
  dia: 216,
  lista: 336, // rueda "busca tu edad" (múltiplo de B: los tics caen a tiempo con el pulso)
  remate: 696,
  cta: 816,
};
const EDADES = Array.from({ length: 45 }, (_, i) => 16 + i); // 16 → 60
const PASO = 8; // 3 edades por latido
export const RCZ_TOTAL = 930; // 31 s

const LATIDOS_ANIO = 75 * 60 * 24 * 365; // 39.420.000
const millones = (edad: number) => Math.round((edad * LATIDOS_ANIO) / 1e6);
const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const io = Easing.inOut(Easing.cubic);
const out3 = (p: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
const lerp = (f: number, a: number[], b: number[], e = io) => interpolate(f, a, b, { ...clamp, easing: e });
const vb = (t: number, fuerza = 0.08, llegada = 0.22) => {
  if (t <= 0) return 0;
  if (t < llegada) return (t / llegada) ** 2;
  const u = t - llegada;
  if (u > 0.8) return 1;
  return 1 + ((2 / llegada) * fuerza * Math.sin(2.5 * u * 2 * Math.PI)) / Math.exp(5 * u);
};

/** Pulso "lub-dub": golpe fuerte en el cuadro 0 de cada latido y otro suave 7 cuadros después */
const pulso = (f: number) => {
  const k = ((f % B) + B) % B;
  return Math.exp(-k / 2.6) + (k >= 7 ? 0.55 * Math.exp(-(k - 7) / 2.6) : 0);
};

// ---------- Corazón de neón ----------
const FORMA = "M 0 40 C -14 18 -70 4 -70 -38 C -70 -74 -28 -84 0 -54 C 28 -84 70 -74 70 -38 C 70 4 14 18 0 40 Z";
export const CorazonNeon: React.FC<{ f: number; s?: number }> = ({ f, s = 1 }) => {
  const p = pulso(f);
  const esc = s * (1 + 0.13 * p);
  return (
    <g transform={`scale(${esc})`}>
      <circle r={150} fill="url(#halo-corazon)" opacity={0.55 + 0.45 * p} />
      <path d={FORMA} fill="#3a0626" opacity={0.85} />
      <g filter="url(#glowS)">
        {/* aorta y vasos */}
        <path d="M -12 -58 C -14 -98 36 -104 40 -66" stroke={N.pink} strokeWidth={9} fill="none" strokeLinecap="round" />
        <path d="M 10 -88 L 12 -112 M 26 -96 L 34 -116" stroke={N.pink} strokeWidth={7} fill="none" strokeLinecap="round" />
        <path d={FORMA} stroke={N.pink} strokeWidth={9} fill="none" strokeLinejoin="round" />
        <path d={FORMA} stroke={N.pinkCore} strokeWidth={3} fill="none" strokeLinejoin="round" />
        <path d="M 8 -46 C -8 -16 14 6 2 30" stroke={N.cyan} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.6 + 0.4 * p} />
      </g>
    </g>
  );
};

// ---------- Calle lluviosa con el personaje ----------
const HORIZONTE = 1340;
const Calle: React.FC<{ f: number; cara: { parpado: number; sonrisa: number; mirada: { x: number; y: number } }; brilloCorazon: number }> = ({ f, cara, brilloCorazon }) => {
  const p = pulso(f);
  const lejanos = Array.from({ length: 26 }, (_, i) => ({ x: -40 + i * 46 + rnd(i) * 12, w: 36 + rnd(i + 50) * 34, top: 360 + rnd(i + 9) * 420 }));
  const medios = Array.from({ length: 9 }, (_, i) => ({ x: -60 + i * 140 + rnd(i + 70) * 30, w: 110 + rnd(i + 80) * 60, top: 620 + rnd(i + 90) * 300 }));
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <FiltrosNeon />
      <defs>
        <radialGradient id="halo-corazon">
          <stop offset="0" stopColor={N.pink} stopOpacity="0.9" />
          <stop offset="0.45" stopColor={N.pink} stopOpacity="0.25" />
          <stop offset="1" stopColor={N.pink} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="calle" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#140a24" />
          <stop offset="1" stopColor="#030207" />
        </linearGradient>
        <clipPath id="suelo"><rect x={-600} y={HORIZONTE} width={2280} height={1400} /></clipPath>
      </defs>
      <rect x={-600} y={-600} width={2280} height={3200} fill="url(#cielo)" />
      <ellipse cx={540} cy={HORIZONTE} rx={900} ry={300} fill={N.pink} opacity={0.2} filter="url(#glowL)" />
      <g id="ciudad-calle">
        {lejanos.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={b.top} width={b.w} height={HORIZONTE - b.top} fill="#1d1033" />
            {Array.from({ length: 18 }, (_, j) =>
              rnd(i * 31 + j) > 0.6 ? (
                <rect key={j} x={b.x + 6 + (j % 3) * (b.w / 3.3)} y={b.top + 12 + Math.floor(j / 3) * 30} width={5} height={9} fill={[N.pink, N.cyan, N.amber][j % 3]} opacity={0.4 + 0.35 * p * (j % 2)} />
              ) : null,
            )}
          </g>
        ))}
        {medios.map((b, i) => (
          <rect key={i} x={b.x} y={b.top} width={b.w} height={HORIZONTE - b.top} fill="#120a22" />
        ))}
        {/* Carteles que laten con el corazón */}
        <g filter="url(#glowS)" opacity={0.75 + 0.25 * p}>
          <rect x={70} y={700} width={250} height={66} rx={8} fill="#04222a" stroke={N.cyan} strokeWidth={4} />
          <text x={195} y={746} textAnchor="middle" fontFamily="Archivo Black" fontSize={36} fill={N.cyanCore}>NO PARES</text>
          <rect x={760} y={620} width={230} height={66} rx={8} fill="#2a0620" stroke={N.pink} strokeWidth={4} opacity={parpadeo(f, 21, 0.04)} />
          <text x={875} y={666} textAnchor="middle" fontFamily="Archivo Black" fontSize={38} fill={N.pinkCore} opacity={parpadeo(f, 21, 0.04)}>SIGUE</text>
          <rect x={880} y={760} width={46} height={300} rx={6} fill="#2a1704" stroke={N.amber} strokeWidth={3} />
          {"ABIERTO".split("").map((ch, i) => (
            <text key={i} x={903} y={796 + i * 38} textAnchor="middle" fontFamily="Archivo Black" fontSize={30} fill="#ffe2b8">{ch}</text>
          ))}
        </g>
      </g>
      {/* Faroles de neón en primer plano: luz rosa a la izquierda, cian a la derecha */}
      <Tubo d="M 40 160 L 40 1500" c="pink" w={14} />
      <Tubo d="M 1040 160 L 1040 1500" c="cyan" w={14} />
      {/* Calle mojada que refleja la ciudad */}
      <rect x={-600} y={HORIZONTE} width={2280} height={1400} fill="url(#calle)" />
      <g clipPath="url(#suelo)" opacity={0.55} filter="url(#reflejo)">
        <g transform={`translate(0 ${HORIZONTE}) scale(1 -0.7) translate(0 ${-HORIZONTE})`}>
          <use href="#ciudad-calle" />
        </g>
        <rect x={10} y={HORIZONTE} width={60} height={900} fill={N.pink} opacity={0.5} />
        <rect x={1010} y={HORIZONTE} width={60} height={900} fill={N.cyan} opacity={0.5} />
      </g>
      {/* Personaje (piernas + torso) con el corazón brillando a través del pecho */}
      <g transform="translate(540 760) scale(1.5)">
        <rect x={-92} y={410} width={84} height={520} rx={26} fill="#191924" />
        <rect x={8} y={410} width={84} height={520} rx={26} fill="#191924" />
        <path d="M -92 440 V 900" stroke={N.pink} strokeWidth={5} opacity={0.6} />
        <path d="M 92 440 V 900" stroke={N.cyan} strokeWidth={5} opacity={0.6} />
        <TrabajadorFrente uid="cz" {...cara} pantalla={0.15} cansancio={0.3} />
        <g transform="translate(92 226)" style={{ mixBlendMode: "screen" }} opacity={brilloCorazon}>
          <CorazonNeon f={f} s={0.42} />
        </g>
      </g>
      {/* Lluvia */}
      <g stroke="rgba(190,225,255,.34)" strokeWidth={1.8} strokeLinecap="round">
        {Array.from({ length: 150 }, (_, i) => {
          const sp = 40 + rnd(i + 3) * 26;
          const len = 40 + rnd(i + 5) * 50;
          const x = -200 + rnd(i + 7) * 1480;
          const y = -200 + ((rnd(i + 9) * 2300 + f * sp) % 2300);
          return <line key={i} x1={x} y1={y} x2={x - len * 0.16} y2={y + len} />;
        })}
      </g>
      {/* Salpicaduras en la calle */}
      <g fill="none" stroke="rgba(210,235,255,.45)" strokeWidth={2}>
        {Array.from({ length: 22 }, (_, i) => {
          const per = 20 + Math.floor(rnd(i + 300) * 25);
          const lf = (f + Math.floor(rnd(i + 301) * per)) % per;
          const r = lf * 3;
          return <ellipse key={i} cx={rnd(i + 302) * 1080} cy={HORIZONTE + 40 + rnd(i + 303) * 540} rx={r} ry={r * 0.3} opacity={1 - lf / per} />;
        })}
      </g>
      <rect x={-600} y={-600} width={2280} height={3200} fill="url(#bruma-rosa)" style={{ mixBlendMode: "screen" }} />
      <rect x={-600} y={-600} width={2280} height={3200} fill="url(#bruma-cian)" style={{ mixBlendMode: "screen" }} />
    </svg>
  );
};

// ---------- Cámara ----------
type Clave = [number, number, number, number];
const CORAZON_MUNDO = { x: 540 + 92 * 1.5, y: 760 + 226 * 1.5 };
const CAM: Clave[] = [
  [0, 5.4, CORAZON_MUNDO.x, CORAZON_MUNDO.y],
  [T.alejar, 5.0, CORAZON_MUNDO.x, CORAZON_MUNDO.y],
  [T.alejar + 60, 1.35, 540, 1000],
  [T.lista - 10, 1.5, 560, 1020],
  [T.remate, 1.3, 540, 1000],
  [T.remate + 30, 2.3, 550, 830],
  [T.cta - 4, 2.45, 550, 840],
  [T.cta + 34, 1.3, 540, 1020],
  [RCZ_TOTAL, 1.38, 540, 1020],
];
const camara = (f: number) => {
  let i = 0;
  while (i < CAM.length - 2 && f > CAM[i + 1][0]) i++;
  const [f0, z0, x0, y0] = CAM[i];
  const [f1, z1, x1, y1] = CAM[i + 1];
  const t = io(Math.min(1, Math.max(0, (f - f0) / (f1 - f0))));
  const latido = 1 + 0.012 * pulso(f); // la cámara también "late"
  return { z: (z0 + (z1 - z0) * t) * latido, cx: x0 + (x1 - x0) * t + Math.sin(f / 37) * 4, cy: y0 + (y1 - y0) * t + Math.cos(f / 43) * 4 };
};

// ---------- Electrocardiograma (pantalla) ----------
const ecg = (t: number) => {
  const u = ((((t + 6) % B) + B) % B) / B;
  if (u > 0.05 && u < 0.15) return -10 * Math.sin((Math.PI * (u - 0.05)) / 0.1);
  if (u >= 0.2 && u < 0.23) return 12;
  if (u >= 0.23 && u < 0.25) return 12 - ((u - 0.23) / 0.02) * 112;
  if (u >= 0.25 && u < 0.27) return -100 + ((u - 0.25) / 0.02) * 130;
  if (u >= 0.27 && u < 0.31) return 30 - ((u - 0.27) / 0.04) * 30;
  if (u > 0.45 && u < 0.62) return -18 * Math.sin((Math.PI * (u - 0.45)) / 0.17);
  return 0;
};
const Ecg: React.FC<{ y: number; op: number }> = ({ y, op }) => {
  const f = useCurrentFrame();
  const PX = 12; // píxeles por cuadro
  const pts: string[] = [];
  for (let x = 0; x <= 1080; x += 4) pts.push(`${x},${(y + ecg(f - (1080 - x) / PX)).toFixed(1)}`);
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: op }}>
      <defs>
        <linearGradient id="ecg-fade" x1="0" x2="1">
          <stop offset="0" stopColor={N.cyan} stopOpacity="0" />
          <stop offset="0.5" stopColor={N.cyan} stopOpacity="0.6" />
          <stop offset="1" stopColor={N.cyanCore} stopOpacity="1" />
        </linearGradient>
        <filter id="ecg-glow" x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polyline points={pts.join(" ")} fill="none" stroke="url(#ecg-fade)" strokeWidth={6} strokeLinejoin="round" filter="url(#ecg-glow)" />
      <circle cx={1076} cy={y + ecg(f)} r={10} fill="#fff" filter="url(#ecg-glow)" />
    </svg>
  );
};

// ---------- Textos ----------
const brillo = (c: string) => `0 0 6px ${c}, 0 0 18px ${c}, 0 0 44px ${c}`;
const grande = (c: string, size: number): React.CSSProperties => ({ fontFamily: DISPLAY, fontSize: size, lineHeight: 1, color: "#fff", textShadow: brillo(c), letterSpacing: 1, whiteSpace: "nowrap" });
const linea: React.CSSProperties = { fontFamily: DISPLAY, fontSize: 60, lineHeight: 1.1, color: "#fff", textShadow: "0 4px 18px rgba(0,0,0,.9)" };
const nota: React.CSSProperties = { fontFamily: MONO, fontSize: 30, fontWeight: 600, color: "rgba(255,255,255,.82)", textShadow: "0 2px 10px #000" };

const Pop: React.FC<{ at: number; fin?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, fin = 99999, children, style }) => {
  const f = useCurrentFrame();
  const p = vb((f - at) / 18);
  const out = 1 - interpolate(f, [fin - 8, fin], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", opacity: Math.min(1, p * 1.4) * out, transform: `scale(${0.6 + 0.4 * p})`, ...style }}>
      {children}
    </div>
  );
};

const Textos: React.FC = () => {
  const f = useCurrentFrame();
  const late = 1 + 0.04 * pulso(f);
  const dia = lerp(f, [T.dia, T.dia + 40], [0, 108000], Easing.out(Easing.cubic));
  return (
    <AbsoluteFill>
      <Pop at={-18} fin={T.alejar + 10} style={{ top: 230 }}>
        <div style={linea}>Tu corazón no ha parado</div>
        <div style={{ ...grande(N.pink, 104), marginTop: 22, transform: `scale(${late})` }}>NI UN SEGUNDO.</div>
      </Pop>
      <Pop at={T.alejar + 34} fin={T.dia - 2} style={{ top: 210 }}>
        <div style={{ ...grande(N.pink, 220), transform: `scale(${late})` }}>75</div>
        <div style={{ ...linea, marginTop: 8 }}>latidos por minuto.</div>
      </Pop>
      <Pop at={T.dia} fin={T.lista - 6} style={{ top: 210 }}>
        <div style={grande(N.cyan, 190)}>{miles(dia)}</div>
        <div style={{ ...linea, marginTop: 10 }}>veces al día.</div>
        <div style={{ ...nota, marginTop: 16 }}>Sin que se lo pidas.</div>
      </Pop>
      <Pop at={T.remate + 8} fin={T.cta - 2} style={{ top: 230 }}>
        <div style={linea}>Nunca se ha tomado</div>
        <div style={{ ...grande(N.cyan, 128), marginTop: 18 }}>UN DÍA LIBRE.</div>
      </Pop>
      <Pop at={T.remate + 62} fin={T.cta - 2} style={{ top: 470 }}>
        <div style={linea}>Late por ti. <span style={{ color: N.pinkCore, textShadow: brillo(N.pink) }}>Cuídalo.</span></div>
      </Pop>
      <Pop at={T.cta + 6} style={{ top: 200 }}>
        <div style={grande(N.pink, 150)}>COMENTA</div>
        <div style={{ ...grande(N.pink, 150), marginTop: 10 }}>TU EDAD</div>
      </Pop>
      <Pop at={T.cta + 24} style={{ top: 600 }}>
        <div style={linea}>y te digo cuántas veces</div>
        <div style={{ ...linea, color: N.cyanCore, textShadow: brillo(N.cyan) }}>ha latido el tuyo.</div>
      </Pop>
      <Pop at={T.cta + 44} style={{ top: 1470 }}>
        <div style={{ display: "inline-block", ...nota, fontSize: 25, padding: "10px 22px", borderRadius: 999, background: "rgba(6,4,11,.72)", border: "1px solid rgba(255,255,255,.18)" }}>
          Supuesto: 75 latidos/min promedio · 365 días/año
        </div>
      </Pop>
    </AbsoluteFill>
  );
};

/** Contador en vivo: latidos desde que empezó el video */
const Contador: React.FC = () => {
  const f = useCurrentFrame();
  const n = Math.floor(f / B) + 1;
  const op = 1 - interpolate(f, [T.lista - 14, T.lista - 4, T.remate, T.remate + 10], [0, 1, 1, 0], clamp);
  const p = pulso(f);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1360, display: "flex", justifyContent: "center", opacity: op * (f < 20 ? f / 20 : 1) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 24px", borderRadius: 999, background: "rgba(6,4,11,.7)", border: `2px solid rgba(255,47,180,${0.35 + 0.5 * p})`, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: "#fff" }}>
        <svg viewBox="-80 -90 160 140" width={40} height={36} style={{ transform: `scale(${1 + 0.25 * p})` }}>
          <path d={FORMA} fill={N.pink} />
        </svg>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{n}</span>
        <span style={{ color: "rgba(255,255,255,.7)" }}>{n === 1 ? "latido" : "latidos"} desde que empezó este video</span>
      </div>
    </div>
  );
};

// ---------- Rueda "busca tu edad" ----------
const Rueda: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.lista - 20 || f > T.remate + 10) return null;
  const t = Math.max(0, f - T.lista);
  const idx = Math.min(EDADES.length - 1, Math.floor(t / PASO));
  const local = (t % PASO) / PASO;
  const salto = idx >= EDADES.length - 1 && t >= (EDADES.length - 1) * PASO ? 1 : out3(local / 0.5);
  const pos = idx - 1 + salto;
  const entra = out3((f - (T.lista - 20)) / 12);
  const sale = interpolate(f, [T.remate - 4, T.remate + 8], [1, 0], clamp);
  const p = pulso(f);
  const CENTRO = 1000;
  const ALTO = 200;
  return (
    <AbsoluteFill style={{ opacity: entra * sale }}>
      <AbsoluteFill style={{ background: "rgba(5,3,10,.68)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center" }}>
        <div style={linea}>¿Cuántas veces ha latido</div>
        <div style={linea}>tu corazón?</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 350, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 32px", borderRadius: 999, background: N.pink, boxShadow: `0 0 ${30 + 40 * p}px ${N.pink}`, transform: `scale(${1 + 0.05 * p})`, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: "#fff", letterSpacing: 1 }}>
          BUSCA TU EDAD
          <svg viewBox="0 0 24 24" width="40" height="40"><path d="M12 4v14M6 12l6 6 6-6" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
      <div style={{ position: "absolute", left: 50, right: 50, top: CENTRO - 130, height: 260, borderRadius: 40, background: "rgba(255,255,255,.05)", border: `3px solid rgba(34,232,255,${0.4 + 0.4 * p})`, boxShadow: `0 0 ${50 + 50 * p}px -20px ${N.cyan}` }} />
      {EDADES.map((e, i) => {
        const d = i - pos;
        if (Math.abs(d) > 3) return null;
        const cerca = Math.max(0, 1 - Math.abs(d));
        const op = interpolate(Math.abs(d), [0, 1, 1.8], [1, 0.3, 0], clamp);
        return (
          <div key={e} style={{ position: "absolute", left: 0, right: 0, top: CENTRO + d * ALTO, transform: `translateY(-50%) scale(${0.62 + 0.38 * cerca})`, opacity: op, display: "flex", alignItems: "center", justifyContent: "center", gap: 30 }}>
            <div style={{ width: 300, textAlign: "right" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 150, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{e}</div>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,.6)", marginTop: 2 }}>años</div>
            </div>
            <div style={{ width: 6, height: 150, borderRadius: 3, background: "rgba(255,255,255,.2)" }} />
            <div style={{ width: 470 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 112, color: "#fff", textShadow: brillo(N.pink), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{miles(millones(e))}</div>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,.6)", marginTop: 6 }}>millones de latidos</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 120, right: 120, top: 1400, height: 10, borderRadius: 5, background: "rgba(255,255,255,.12)" }}>
        <div style={{ width: `${(Math.min(t, EDADES.length * PASO) / (EDADES.length * PASO)) * 100}%`, height: "100%", borderRadius: 5, background: N.cyan, boxShadow: `0 0 16px ${N.cyan}` }} />
      </div>
      <div style={{ position: "absolute", left: 120, right: 120, top: 1426, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 26, color: "rgba(255,255,255,.55)" }}>
        <span>16</span><span>38</span><span>60</span>
      </div>
    </AbsoluteFill>
  );
};

const Marca: React.FC = () => {
  const f = useCurrentFrame();
  const op = 1 - interpolate(f, [T.lista - 14, T.lista - 4, T.remate, T.remate + 10], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1540, textAlign: "center", fontFamily: DISPLAY, fontSize: 28, letterSpacing: 3, color: "rgba(255,255,255,.55)", opacity: op }}>
      DATOS QUE <span style={{ color: N.pink, textShadow: brillo(N.pink) }}>DUELEN</span>
    </div>
  );
};

const Sfx: React.FC<{ at: number; n: string; v?: number; dur?: number }> = ({ at, n, v = 0.6, dur = 60 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={dur} layout="none">
    <Audio src={staticFile(`reel-corazon/sfx/${n}.wav`)} volume={v} />
  </Sequence>
);

export const ReelCorazon: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camara(f);
  const enLista = f >= T.lista && f < T.remate;
  const cara = {
    parpado: Math.max(lerp(f, [T.remate + 20, T.remate + 34, T.cta - 6, T.cta + 4], [0.4, 1, 1, 0.3]), f < T.remate ? 0.4 : 0.3),
    sonrisa: lerp(f, [T.remate + 50, T.remate + 70], [0, 1]),
    mirada: { x: 0, y: 0 },
  };
  const brilloCorazon = 0.85 + lerp(f, [T.remate + 30, T.remate + 60], [0, 0.15]);
  const ecgOp = interpolate(f, [T.alejar + 30, T.alejar + 50, T.lista - 14, T.lista - 4, T.remate + 6, T.remate + 20], [0, 1, 1, 0, 0, 0.9], clamp);
  return (
    <AbsoluteFill style={{ background: N.deep, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: `translate(540px, 960px) scale(${cam.z}) translate(${-cam.cx}px, ${-cam.cy}px)` }}>
        <Calle f={f} cara={cara} brilloCorazon={brilloCorazon} />
      </div>
      {/* Destello rosa en cada latido */}
      <AbsoluteFill style={{ background: `radial-gradient(70% 50% at 50% 55%, rgba(255,47,180,${0.16 * pulso(f)}), transparent 70%)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 52%, transparent 55%, rgba(0,0,0,.75) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,4,11,.82) 0%, rgba(6,4,11,.5) 22%, transparent 40%)" }} />
      <Ecg y={1250} op={ecgOp} />
      <Rueda />
      <Textos />
      <Contador />
      <Marca />

      {/* Sonido: sin música, el latido marca el ritmo */}
      <Sfx at={0} n="lluvia" v={0.3} dur={RCZ_TOTAL} />
      {Array.from({ length: Math.ceil(RCZ_TOTAL / B) }, (_, i) => (
        <Sfx key={`l${i}`} at={i * B} n="latido" v={enLista || (i * B >= T.lista && i * B < T.remate) ? 0.55 : 0.9} dur={20} />
      ))}
      {Array.from({ length: Math.ceil(RCZ_TOTAL / B) }, (_, i) => {
        const at = i * B;
        const on = (at >= T.alejar + 36 && at < T.lista - 10) || at >= T.remate + 24;
        return on ? <Sfx key={`b${i}`} at={at} n="bip" v={0.16} dur={8} /> : null;
      })}
      <Sfx at={0} n="boom" v={0.6} />
      <Sfx at={T.alejar} n="whoosh" v={0.45} />
      <Sfx at={T.dia} n="boom" v={0.5} />
      <Sfx at={T.lista - 36} n="riser" v={0.3} />
      {EDADES.map((e, i) => (
        <Sfx key={`t${e}`} at={T.lista + i * PASO} n={e % 10 === 0 ? "pop" : "tic"} v={e % 10 === 0 ? 0.4 : 0.42} dur={8} />
      ))}
      <Sfx at={T.remate} n="whoosh" v={0.4} />
      <Sfx at={T.remate + 8} n="boom" v={0.7} />
      <Sfx at={T.cta} n="whoosh" v={0.4} />
      <Sfx at={T.cta + 6} n="boom" v={0.5} />
      <Sfx at={T.cta + 24} n="pop" v={0.45} dur={10} />
    </AbsoluteFill>
  );
};
