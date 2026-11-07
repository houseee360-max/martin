import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { DISPLAY, MONO } from "../theme";
import { Charco, EstadoOficina, Filas, Oficina, parpadeo } from "./Oficina";
import { N } from "./Trabajador";

export const RT_FPS = 30;
export const RT_W = 1080;
export const RT_H = 1920;

// Línea de tiempo (cuadros)
const T = {
  abrir: 135, // la cámara se aleja: oficina completa
  reloj: 285, // reloj girando, tazas apilándose, 22 → 65
  charco: 420, // reflejo que envejece: 92.880 horas
  filas: 570, // filas infinitas: casi 16 años
  final: 720, // cierra la laptop y se va
  tapa: 770,
  cerrado: 825,
  pie: 830,
  camina: 852,
  cta: 862,
};
export const RT_TOTAL = 990; // 33 s

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const io = Easing.inOut(Easing.cubic);
const lerp = (f: number, a: number[], b: number[], e = io) => interpolate(f, a, b, { ...clamp, easing: e });
const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const vb = (t: number, fuerza = 0.08, llegada = 0.22) => {
  if (t <= 0) return 0;
  if (t < llegada) return (t / llegada) ** 2;
  const u = t - llegada;
  if (u > 0.8) return 1;
  return 1 + ((2 / llegada) * fuerza * Math.sin(2.5 * u * 2 * Math.PI)) / Math.exp(5 * u);
};

// ---------- Cámara ----------
type Clave = [number, number, number, number]; // cuadro, zoom, cx, cy
const CAM: Clave[] = [
  [0, 2.75, 540, 1010],
  [128, 2.45, 540, 1015],
  [168, 1.15, 540, 1000],
  [270, 1.2, 540, 1000],
  [300, 1.6, 690, 860],
  [400, 1.75, 690, 900],
  [420, 2.2, 540, 1700],
  [720, 1.55, 540, 1010],
  [826, 1.45, 540, 1000],
  [870, 1.1, 600, 980],
  [990, 1.14, 620, 980],
];
const camara = (f: number) => {
  let i = 0;
  while (i < CAM.length - 2 && f > CAM[i + 1][0]) i++;
  const [f0, z0, x0, y0] = CAM[i];
  const [f1, z1, x1, y1] = CAM[i + 1];
  const t = io(Math.min(1, Math.max(0, (f - f0) / (f1 - f0))));
  const deriva = 1 + Math.sin(f / 50) * 0.008;
  return { z: (z0 + (z1 - z0) * t) * deriva, cx: x0 + (x1 - x0) * t + Math.sin(f / 37) * 4, cy: y0 + (y1 - y0) * t + Math.cos(f / 43) * 4 };
};

const Camara: React.FC<{ z: number; cx: number; cy: number; children: React.ReactNode }> = ({ z, cx, cy, children }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: `translate(540px, 960px) scale(${z}) translate(${-cx}px, ${-cy}px)` }}>
    {children}
  </div>
);

// ---------- Estado de la oficina por cuadro ----------
const parp = (f: number) => {
  for (const b of [58, 196, 330, 744, 812, 840]) {
    const d = Math.abs(f - b);
    if (d < 4) return 1 - d / 4;
  }
  return 0;
};
const estado = (f: number): EstadoOficina => {
  const giro = 360 * 30 * lerp(f, [T.reloj, T.reloj + 115], [0, 1], Easing.inOut(Easing.quad));
  const letrero = f < T.final + 85 ? parpadeo(f, 1) : f < T.cerrado ? parpadeo(f, 2, 0.6) : 0;
  const mirarArriba = lerp(f, [T.final + 25, T.final + 38], [0, 1]) * (1 - lerp(f, [T.cerrado + 8, T.cerrado + 20], [0, 1]));
  return {
    minuto: f * 1.2 + giro,
    tazas: 2 + lerp(f, [T.reloj + 8, T.reloj + 112], [0, 12], Easing.linear),
    open: letrero,
    closed: f >= T.cerrado ? 1 : 0,
    tapa: 1 - lerp(f, [T.tapa, T.tapa + 18], [0, 1], Easing.in(Easing.quad)),
    tecleo: f < T.final + 25 ? 1 : 0,
    levantarse: lerp(f, [T.pie, T.pie + 20], [0, 1]),
    caminar: f >= T.camina ? lerp(f, [T.camina, T.camina + 84], [0.001, 1], Easing.linear) : 0,
    salida: 1 - lerp(f, [T.camina + 70, T.camina + 92], [0, 1]),
    zumbido: f < T.cerrado ? 1 : 0.55,
    cara: {
      sonrisa: lerp(f, [T.tapa + 20, T.tapa + 38], [0, 1]),
      parpado: Math.max(parp(f), (f > T.tapa + 20 ? 0.22 : f > T.reloj ? 0.58 : 0.45) + (f > T.reloj && f < T.charco ? Math.sin(f / 6) * 0.04 : 0)),
      mirada: { x: -0.7 * mirarArriba, y: 0.45 - 1.3 * mirarArriba },
      cansancio: f > T.reloj ? 0.95 : 0.6,
    },
  };
};

// ---------- Textos neón ----------
const brillo = (c: string) => `0 0 6px ${c}, 0 0 18px ${c}, 0 0 44px ${c}`;
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
const grande = (c: string, size: number): React.CSSProperties => ({ fontFamily: DISPLAY, fontSize: size, lineHeight: 1, color: "#fff", textShadow: brillo(c), letterSpacing: 1 });
const linea: React.CSSProperties = { fontFamily: DISPLAY, fontSize: 60, lineHeight: 1.1, color: "#fff", textShadow: "0 4px 18px rgba(0,0,0,.9)" };
const nota: React.CSSProperties = { fontFamily: MONO, fontSize: 30, fontWeight: 600, color: "rgba(255,255,255,.82)", textShadow: "0 2px 10px #000" };

const Textos: React.FC = () => {
  const f = useCurrentFrame();
  const anio = Math.round(lerp(f, [T.reloj + 10, T.reloj + 110], [22, 65], Easing.linear));
  const horas = lerp(f, [T.charco + 10, T.charco + 58], [0, 92880], Easing.out(Easing.cubic));
  const encendido = f < 14 ? [1, 1, 0.2, 1, 1, 0.3, 1, 1, 1, 0.25, 1, 1, 1, 1][f] : parpadeo(f, 9, 0.03);
  return (
    <AbsoluteFill>
      {/* Toma 1: gancho (visible desde el cuadro 0) */}
      <Pop at={-18} fin={T.abrir} style={{ top: 250 }}>
        <div style={linea}>¿Cuántos años de tu vida</div>
        <div style={{ ...linea, marginTop: 6 }}>vas a pasar</div>
        <div style={{ ...grande(N.pink, 124), marginTop: 22, opacity: encendido }}>TRABAJANDO?</div>
      </Pop>
      {/* Toma 2 */}
      <Pop at={T.abrir + 30} fin={T.reloj} style={{ top: 200 }}>
        <div style={grande(N.cyan, 170)}>45 HORAS</div>
      </Pop>
      <Pop at={T.abrir + 44} fin={T.reloj} style={{ top: 392 }}>
        <div style={linea}>a la semana.</div>
        <div style={{ ...nota, marginTop: 14 }}>(sin contar el traslado)</div>
      </Pop>
      {/* Toma 3: 22 → 65 */}
      <Pop at={T.reloj + 4} fin={T.charco - 8} style={{ top: 190 }}>
        <div style={linea}>Desde los</div>
        <div style={{ ...grande(N.pink, 220), marginTop: 6 }}>{anio}</div>
        <div style={{ ...linea, marginTop: 4 }}>años{anio === 65 ? "" : "…"}</div>
      </Pop>
      <Pop at={T.reloj + 112} fin={T.charco - 8} style={{ top: 600 }}>
        <div style={nota}>43 años seguidos.</div>
      </Pop>
      {/* Toma 4: el charco */}
      <Pop at={T.charco + 6} fin={T.filas + 4} style={{ top: 230 }}>
        <div style={grande(N.cyan, 196)}>{miles(horas)}</div>
      </Pop>
      <Pop at={T.charco + 58} fin={T.filas + 4} style={{ top: 440 }}>
        <div style={grande(N.pink, 110)}>HORAS</div>
      </Pop>
      <Pop at={T.charco + 82} fin={T.filas + 4} style={{ top: 1480 }}>
        <div style={linea}>Tu reflejo, el día</div>
        <div style={linea}>que te jubiles.</div>
      </Pop>
      {/* Toma 5: filas */}
      <Pop at={T.filas + 30} fin={T.final + 6} style={{ top: 200 }}>
        <div style={{ ...grande(N.pink, 128), whiteSpace: "nowrap" }}>CASI 16 AÑOS</div>
      </Pop>
      <Pop at={T.filas + 44} fin={T.final + 6} style={{ top: 370 }}>
        <div style={linea}>de tu vida despierto.</div>
      </Pop>
      <Pop at={T.filas + 70} fin={T.final + 6} style={{ top: 470 }}>
        <div style={nota}>92.880 h ÷ 16 h despierto al día = 15,9 años</div>
      </Pop>
      {/* Toma 6 */}
      <Pop at={T.tapa + 20} fin={T.cta - 4} style={{ top: 250 }}>
        <div style={grande(N.cyan, 140)}>HOY, NO.</div>
      </Pop>
      <Pop at={T.cta} style={{ top: 190 }}>
        <div style={grande(N.pink, 170)}>¿Y TÚ?</div>
      </Pop>
      <Pop at={T.cta + 20} style={{ top: 380 }}>
        <div style={linea}>Comenta cuántas horas</div>
        <div style={linea}>trabajas a la semana</div>
        <div style={{ ...linea, color: N.cyanCore, textShadow: brillo(N.cyan) }}>y te digo tus años.</div>
      </Pop>
      <Pop at={T.cta + 40} style={{ top: 1380 }}>
        <div style={{ display: "inline-block", ...nota, fontSize: 25, padding: "10px 22px", borderRadius: 999, background: "rgba(6,4,11,.72)", border: "1px solid rgba(255,255,255,.18)" }}>
          Supuesto: 45 h/semana · 48 semanas/año · de 22 a 65 años
        </div>
      </Pop>
    </AbsoluteFill>
  );
};

const Marca: React.FC = () => {
  const f = useCurrentFrame();
  const op = 1 - interpolate(f, [T.charco - 10, T.charco, T.final, T.final + 10], [0, 1, 1, 0], clamp);
  return (
  <div style={{ opacity: op, position: "absolute", left: 0, right: 0, top: 1468, textAlign: "center", fontFamily: DISPLAY, fontSize: 28, letterSpacing: 3, color: "rgba(255,255,255,.55)" }}>
    DATOS QUE <span style={{ color: N.pink, textShadow: brillo(N.pink) }}>DUELEN</span>
  </div>
  );
};

// ---------- Sonido (sin música) ----------
const Sfx: React.FC<{ at: number; n: string; v?: number; dur?: number }> = ({ at, n, v = 0.6, dur = 90 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={dur} layout="none">
    <Audio src={staticFile(`reel-trabajo/sfx/${n}.wav`)} volume={v} />
  </Sequence>
);

export const ReelTrabajo: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camara(f);
  const e = estado(f);
  const verOficina = f < T.charco || f >= T.final - 12;
  const flashCharco = interpolate(f, [T.charco - 6, T.charco, T.charco + 10], [0, 1, 0], clamp);
  const camFilas = { z: lerp(f, [T.filas, T.filas + 115], [2.5, 1.0], Easing.out(Easing.cubic)), cx: 540, cy: lerp(f, [T.filas, T.filas + 115], [1215, 960], Easing.out(Easing.cubic)) };
  const opFilas = interpolate(f, [T.filas - 10, T.filas + 4], [0, 1], clamp);
  const opFinal = interpolate(f, [T.final - 12, T.final + 4], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: N.deep, overflow: "hidden" }}>
      {verOficina ? (
        <AbsoluteFill style={{ opacity: f >= T.final - 12 ? opFinal : 1 }}>
          <Camara {...cam}>
            <Oficina e={e} />
          </Camara>
        </AbsoluteFill>
      ) : null}
      <Sequence from={T.charco} durationInFrames={T.filas + 6 - T.charco} name="charco">
        <AbsoluteFill>
          <CharcoEnvejece />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={T.filas - 10} durationInFrames={T.final - T.filas + 10} name="filas">
        <AbsoluteFill style={{ opacity: opFilas }}>
          <Camara {...camFilas}>
            <Filas />
          </Camara>
        </AbsoluteFill>
      </Sequence>
      {/* Viñeta + velo superior para leer los textos */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 52%, transparent 55%, rgba(0,0,0,.75) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,4,11,.82) 0%, rgba(6,4,11,.55) 22%, transparent 40%)" }} />
      <AbsoluteFill style={{ background: "#fff", opacity: flashCharco * 0.6 }} />
      <Textos />
      <Marca />

      {/* Ambiente */}
      <Sfx at={0} n="lluvia" v={0.42} dur={RT_TOTAL} />
      <Sfx at={0} n="zumbido" v={0.1} dur={T.charco} />
      <Sfx at={T.final - 12} n="zumbido" v={0.1} dur={T.cerrado - T.final + 12} />
      <Sfx at={0} n="teclas" v={0.5} dur={T.charco - 15} />
      <Sfx at={T.final - 12} n="teclas" v={0.45} dur={37} />
      {/* Golpes de edición */}
      <Sfx at={0} n="boom" v={0.55} />
      <Sfx at={10} n="chispa" v={0.35} />
      <Sfx at={T.abrir} n="whoosh" v={0.45} />
      <Sfx at={T.abrir + 30} n="boom" v={0.4} />
      <Sfx at={T.abrir + 60} n="chispa" v={0.3} />
      <Sfx at={T.reloj + 4} n="tics" v={0.5} dur={125} />
      {Array.from({ length: 12 }, (_, i) => (
        <Sfx key={i} at={T.reloj + 8 + Math.round(i * (104 / 12))} n="pop" v={0.28} dur={10} />
      ))}
      <Sfx at={T.reloj + 112} n="cierre" v={0.45} />
      <Sfx at={T.charco - 16} n="whoosh" v={0.5} />
      <Sfx at={T.charco} n="gota" v={0.8} />
      <Sfx at={T.charco + 58} n="boom" v={0.75} />
      <Sfx at={T.filas - 20} n="riser" v={0.35} />
      <Sfx at={T.filas + 30} n="boom" v={0.75} />
      <Sfx at={T.final - 10} n="whoosh" v={0.4} />
      <Sfx at={T.tapa + 18} n="cierre" v={0.75} />
      <Sfx at={T.final + 85} n="chispa" v={0.5} />
      <Sfx at={T.cerrado} n="click" v={0.8} />
      {Array.from({ length: 7 }, (_, i) => (
        <Sfx key={`p${i}`} at={T.camina + 6 + i * 13} n="paso" v={0.55 - i * 0.06} dur={14} />
      ))}
      <Sfx at={T.cta} n="boom" v={0.5} />
      <Sfx at={T.cta + 20} n="pop" v={0.45} dur={10} />
    </AbsoluteFill>
  );
};

const CharcoEnvejece: React.FC = () => {
  const lf = useCurrentFrame();
  const edad = interpolate(lf, [60, 128], [0, 1], { ...clamp, easing: io });
  const op = interpolate(lf, [0, 6, 140, 156], [0, 1, 1, 0], clamp);
  const z = interpolate(lf, [0, 156], [1.12, 1.0], clamp);
  return (
    <AbsoluteFill style={{ opacity: op, transform: `scale(${z})` }}>
      <Charco edad={edad} />
    </AbsoluteFill>
  );
};
