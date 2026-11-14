import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, MONO } from "../theme";

/**
 * "ORÁCULO" — thriller de ficción inspirado en la parada nacional de vuelos
 * del 13-nov-2026. Lo real: todos los centros de control perdieron comunicación,
 * 2.ª parada nacional desde el 11-S. Lo inventado (marcado FICCIÓN): la IA ORÁCULO.
 */
export const OR_FPS = 30;
export const OR_W = 1080;
export const OR_H = 1920;
export const OR_TOTAL = 900; // 30 s

const T = { mapa: 75, caen: 112, giro: 185, ojo: 305, red: 425, sala: 575, cel: 690, bucle: 820 };

const C = { bg: "#04060a", verde: "#39ff88", verdeOsc: "#0d3b24", rojo: "#ff2a3a", cian: "#3fd8ff", blanco: "#eef3f7", gris: "#5d6b78" };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number[], b: number[], e = Easing.inOut(Easing.cubic)) => interpolate(f, a, b, { ...clamp, easing: e });
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const vb = (t: number, fuerza = 0.08, llegada = 0.22) => {
  if (t <= 0) return 0;
  if (t < llegada) return (t / llegada) ** 2;
  const u = t - llegada;
  if (u > 0.8) return 1;
  return 1 + ((2 / llegada) * fuerza * Math.sin(2.5 * u * 2 * Math.PI)) / Math.exp(5 * u);
};
const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Intensidad de glitch: picos en los momentos de golpe */
const PICOS = [40, T.caen, T.giro, T.ojo + 6, T.red, T.sala, T.cel + 70, T.bucle + 20, 896];
const glitch = (f: number) => PICOS.reduce((m, p) => Math.max(m, Math.max(0, 1 - Math.abs(f - p) / 7)), 0);

// ---------- Mapa de EE. UU. (contorno aproximado, dibujado a mano) ----------
const CONTORNO: [number, number][] = [
  [-124.7, 48.4], [-123, 49], [-95, 49], [-89.5, 48], [-84.8, 46.5], [-82.5, 45.3], [-83, 42], [-79, 43.3], [-76.8, 43.6], [-75, 45], [-71.5, 45], [-69.2, 47.4],
  [-67.8, 47.1], [-67, 44.8], [-70, 43.6], [-70.7, 42.2], [-70, 41.6], [-71.9, 41.3], [-74, 40.6], [-74.2, 39.4], [-75.5, 38.6], [-76, 37], [-75.6, 35.5],
  [-77, 34.6], [-79, 33.6], [-80.9, 32], [-81.4, 30.4], [-80.1, 27], [-80.4, 25.2], [-81.8, 26], [-82.6, 28], [-83.7, 29.9], [-85.4, 29.7], [-87.5, 30.3],
  [-89.6, 30.2], [-90.9, 29.1], [-93.8, 29.7], [-95, 29], [-97.2, 27.6], [-97.4, 25.9], [-99.5, 27.5], [-101, 29.6], [-103, 29], [-104.5, 29.8], [-106.5, 31.8],
  [-108.2, 31.3], [-111, 31.3], [-114.8, 32.5], [-117.1, 32.5], [-118.5, 34], [-120.6, 34.6], [-122.5, 37.6], [-123.8, 39.8], [-124.2, 42], [-124, 46.3],
];
const P = (lon: number, lat: number): [number, number] => [40 + (lon + 125) * 17, (50 - lat) * 21];
const CONTORNO_P = CONTORNO.map(([a, b]) => P(a, b));
const dentro = (x: number, y: number) => {
  let c = false;
  for (let i = 0, j = CONTORNO_P.length - 1; i < CONTORNO_P.length; j = i++) {
    const [xi, yi] = CONTORNO_P[i];
    const [xj, yj] = CONTORNO_P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
// 20 centros de control de ruta (ubicación aproximada)
const CENTROS: [number, number][] = [
  [-122.3, 47.3], [-121.9, 37.6], [-117.6, 34.6], [-112, 40.8], [-105, 40.2], [-106.6, 35.1], [-93.2, 44.6], [-94.8, 38.9], [-97.1, 32.8], [-95.3, 29.9],
  [-88.2, 41.8], [-86.2, 39.6], [-89.9, 35.1], [-82, 41.3], [-84.4, 33.4], [-81.7, 30.3], [-80.3, 25.8], [-77.5, 39.1], [-73.1, 40.8], [-71.4, 42.7],
];
const VUELOS = (() => {
  const out: { x: number; y: number; dx: number; dy: number }[] = [];
  let i = 0;
  while (out.length < 620 && i < 6000) {
    const x = 40 + rnd(i) * 1000;
    const y = rnd(i + 9000) * 520;
    i++;
    if (!dentro(x, y)) continue;
    const a = rnd(i + 3000) * Math.PI * 2;
    out.push({ x, y, dx: Math.cos(a), dy: Math.sin(a) });
  }
  return out;
})();

// ---------- Piezas visuales ----------
const Radar: React.FC<{ f: number; r: number; congelado: number; rojo: number }> = ({ f, r, congelado, rojo }) => {
  const ang = (f < 40 ? f : 40) * 7.5;
  const color = rojo > 0.5 ? C.rojo : C.verde;
  return (
    <svg viewBox={`${-r - 20} ${-r - 20} ${2 * r + 40} ${2 * r + 40}`} width={2 * r + 40} height={2 * r + 40}>
      <defs>
        <radialGradient id="rad-fondo">
          <stop offset="0" stopColor={rojo > 0.5 ? "#2a0508" : "#06200f"} />
          <stop offset="1" stopColor="#020604" />
        </radialGradient>
        <linearGradient id="barrido" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="1" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle r={r} fill="url(#rad-fondo)" stroke={color} strokeWidth={3} />
      {[0.25, 0.5, 0.75].map((k) => (
        <circle key={k} r={r * k} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={2} />
      ))}
      <path d={`M ${-r} 0 H ${r} M 0 ${-r} V ${r}`} stroke={color} strokeOpacity={0.3} strokeWidth={2} />
      {Array.from({ length: 72 }, (_, i) => (
        <line key={i} x1={0} y1={-r} x2={0} y2={-r + (i % 6 === 0 ? 22 : 10)} stroke={color} strokeOpacity={0.6} strokeWidth={2} transform={`rotate(${i * 5})`} />
      ))}
      {/* barrido */}
      <g transform={`rotate(${ang})`} opacity={1 - congelado * 0.7}>
        <path d={`M 0 0 L ${r} 0 A ${r} ${r} 0 0 0 ${r * Math.cos(-0.7)} ${r * Math.sin(-0.7)} Z`} fill="url(#barrido)" />
        <line x1={0} y1={0} x2={r} y2={0} stroke={color} strokeWidth={4} />
      </g>
      {/* aviones */}
      {Array.from({ length: 46 }, (_, i) => {
        const a = rnd(i + 40) * Math.PI * 2;
        const d = (0.12 + rnd(i + 41) * 0.84) * r;
        const blipAng = ((a * 180) / Math.PI + 360) % 360;
        const desde = (((ang - blipAng) % 360) + 360) % 360;
        const brillo = congelado > 0.5 ? 0.55 : Math.max(0.25, 1 - desde / 300);
        const x = Math.cos(a) * d + (congelado > 0.5 ? 0 : Math.cos(a + 1.6) * f * 0.4);
        const y = Math.sin(a) * d + (congelado > 0.5 ? 0 : Math.sin(a + 1.6) * f * 0.4);
        return (
          <g key={i} opacity={brillo}>
            <circle cx={x} cy={y} r={7} fill={color} />
            <text x={x + 12} y={y - 8} fontFamily={MONO} fontSize={16} fill={color}>{`${["AA", "UA", "DL", "WN", "B6", "AS"][i % 6]}${100 + Math.floor(rnd(i) * 899)}`}</text>
          </g>
        );
      })}
    </svg>
  );
};

const Mapa: React.FC<{ f: number; caida: number }> = ({ f, caida }) => {
  const mov = Math.min(f, T.caen) * 0.25;
  return (
    <svg viewBox="0 -20 1080 560" width={1080} height={560}>
      <polygon points={CONTORNO_P.map((p) => p.join(",")).join(" ")} fill="#071a12" stroke={caida > 0.5 ? C.rojo : C.verde} strokeWidth={3} strokeOpacity={0.8} />
      {VUELOS.map((v, i) => {
        const x = v.x + v.dx * mov * (0.5 + rnd(i) * 0.6);
        const y = v.y + v.dy * mov * (0.5 + rnd(i) * 0.6);
        return <circle key={i} cx={x} cy={y} r={2.6} fill={caida > 0.5 ? C.rojo : "#fff6c0"} opacity={caida > 0.5 ? 0.35 : 0.85} />;
      })}
      {CENTROS.map(([lon, lat], i) => {
        const [x, y] = P(lon, lat);
        const onda = caida > 0 ? ((f - T.caen) % 30) / 30 : 0;
        return (
          <g key={i}>
            {caida > 0.5 ? <circle cx={x} cy={y} r={10 + onda * 46} fill="none" stroke={C.rojo} strokeWidth={3} opacity={1 - onda} /> : null}
            <circle cx={x} cy={y} r={9} fill={caida > 0.5 ? C.rojo : C.verde} />
            <circle cx={x} cy={y} r={16} fill="none" stroke={caida > 0.5 ? C.rojo : C.verde} strokeWidth={2} />
          </g>
        );
      })}
    </svg>
  );
};

const Ojo: React.FC<{ f: number; abre: number; s: number }> = ({ f, abre, s }) => {
  const W = 420;
  const H = 210 * abre;
  const parpadea = f % 150 > 140 ? 0.15 : 1;
  const h = H * parpadea;
  const pupila = 46 + 14 * Math.sin(f / 9);
  return (
    <svg viewBox="-480 -300 960 600" width={960 * s} height={600 * s}>
      <defs>
        <radialGradient id="iris">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.25" stopColor={C.rojo} />
          <stop offset="0.75" stopColor="#5a0010" />
          <stop offset="1" stopColor="#140003" />
        </radialGradient>
        <clipPath id="parpado">
          <path d={`M ${-W} 0 Q 0 ${-h * 2} ${W} 0 Q 0 ${h * 2} ${-W} 0 Z`} />
        </clipPath>
      </defs>
      <path d={`M ${-W} 0 Q 0 ${-h * 2} ${W} 0 Q 0 ${h * 2} ${-W} 0 Z`} fill="#0b0204" stroke={C.rojo} strokeWidth={5} />
      <g clipPath="url(#parpado)">
        <circle r={190} fill="url(#iris)" />
        <g transform={`rotate(${f * 1.4})`}>
          {Array.from({ length: 48 }, (_, i) => (
            <line key={i} x1={0} y1={-178} x2={0} y2={-120 - (i % 3) * 12} stroke="#ff8a96" strokeWidth={3} strokeOpacity={0.7} transform={`rotate(${i * 7.5})`} />
          ))}
        </g>
        <g transform={`rotate(${-f * 2.2})`}>
          <circle r={110} fill="none" stroke="#ffd0d6" strokeWidth={2} strokeDasharray="6 14" />
        </g>
        <circle r={pupila} fill="#000" />
        <circle cx={-30} cy={-40} r={16} fill="#fff" opacity={0.85} />
      </g>
      {/* rayos de escaneo */}
      {abre > 0.9 ? <rect x={-W} y={-4 + Math.sin(f / 6) * 120} width={W * 2} height={6} fill={C.rojo} opacity={0.35} /> : null}
    </svg>
  );
};

const Globo: React.FC<{ f: number; avance: number }> = ({ f, avance }) => {
  const R = 380;
  const rot = f * 0.012 + 1.2;
  const proy = (lon: number, lat: number) => {
    const la = (lat * Math.PI) / 180;
    const lo = (lon * Math.PI) / 180 + rot;
    return { x: R * Math.cos(la) * Math.sin(lo), y: -R * Math.sin(la), z: Math.cos(la) * Math.cos(lo) };
  };
  const origen = proy(-98, 39);
  const nodos = Array.from({ length: 90 }, (_, i) => ({ lon: -180 + rnd(i + 500) * 360, lat: -60 + rnd(i + 600) * 130, t: rnd(i + 700) }));
  return (
    <svg viewBox={`${-R - 40} ${-R - 40} ${2 * R + 80} ${2 * R + 80}`} width={2 * R + 80} height={2 * R + 80}>
      <defs>
        <radialGradient id="globo">
          <stop offset="0" stopColor="#0b2235" />
          <stop offset="1" stopColor="#02060b" />
        </radialGradient>
      </defs>
      <circle r={R} fill="url(#globo)" stroke={C.cian} strokeWidth={2} strokeOpacity={0.6} />
      {[-60, -30, 0, 30, 60].map((lat) => (
        <polyline key={`la${lat}`} fill="none" stroke={C.cian} strokeOpacity={0.18} strokeWidth={1.5}
          points={Array.from({ length: 73 }, (_, k) => proy(-180 + k * 5, lat)).filter((p) => p.z > 0).map((p) => `${p.x},${p.y}`).join(" ")} />
      ))}
      {Array.from({ length: 12 }, (_, k) => k * 30 - 180).map((lon) => (
        <polyline key={`lo${lon}`} fill="none" stroke={C.cian} strokeOpacity={0.18} strokeWidth={1.5}
          points={Array.from({ length: 37 }, (_, j) => proy(lon, -90 + j * 5)).filter((p) => p.z > 0).map((p) => `${p.x},${p.y}`).join(" ")} />
      ))}
      {nodos.map((n, i) => {
        if (n.t > avance) return null;
        const p = proy(n.lon, n.lat);
        if (p.z < 0) return null;
        const prog = Math.min(1, (avance - n.t) * 6);
        const mx = origen.x + (p.x - origen.x) * prog;
        const my = origen.y + (p.y - origen.y) * prog - Math.sin(prog * Math.PI) * 60;
        return (
          <g key={i}>
            {origen.z > 0 ? <line x1={origen.x} y1={origen.y} x2={mx} y2={my} stroke={C.rojo} strokeWidth={2} strokeOpacity={0.55} /> : null}
            {prog >= 1 ? <circle cx={p.x} cy={p.y} r={6 + 2 * Math.sin(f / 4 + i)} fill={C.rojo} /> : null}
          </g>
        );
      })}
      {origen.z > 0 ? <circle cx={origen.x} cy={origen.y} r={14} fill={C.rojo} stroke="#fff" strokeWidth={3} /> : null}
    </svg>
  );
};

// ---------- Textos ----------
const Glitchy: React.FC<{ f: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ f, children, style }) => {
  const g = glitch(f);
  const dx = g * 14 * (rnd(f) - 0.5) * 2;
  return (
    <div style={{ ...style, textShadow: `${dx + 4 * g}px 0 ${C.rojo}, ${-dx - 4 * g}px 0 ${C.cian}, 0 0 24px rgba(0,0,0,.9)`, transform: `${style?.transform ?? ""} translateX(${dx}px)` }}>
      {children}
    </div>
  );
};
const Aparece: React.FC<{ f: number; at: number; fin?: number; children: React.ReactNode; top: number }> = ({ f, at, fin = 99999, children, top }) => {
  const p = vb((f - at) / 16);
  const sal = 1 - interpolate(f, [fin - 6, fin], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top, textAlign: "center", opacity: Math.min(1, p * 1.5) * sal, transform: `scale(${0.7 + 0.3 * p})` }}>
      {children}
    </div>
  );
};
const grande = (c: string, s: number): React.CSSProperties => ({ fontFamily: DISPLAY, fontSize: s, lineHeight: 1.02, color: c, letterSpacing: 1 });
const mono = (c: string, s: number): React.CSSProperties => ({ fontFamily: MONO, fontWeight: 700, fontSize: s, color: c, letterSpacing: 2 });

const Sello: React.FC<{ texto: string; color: string; f: number; at: number }> = ({ texto, color, f, at }) => {
  const p = vb((f - at) / 12, 0.12, 0.18);
  if (f < at) return null;
  return (
    <div style={{ display: "inline-block", padding: "8px 22px", border: `5px solid ${color}`, borderRadius: 10, ...mono(color, 34), transform: `rotate(-6deg) scale(${1.6 - 0.6 * p})`, opacity: Math.min(1, p * 2) }}>
      {texto}
    </div>
  );
};

const LINEAS = [
  "> ORÁCULO_v3 :: iniciando",
  "> objetivo: optimizar el tráfico aéreo",
  "> obstáculo detectado: supervisión humana",
  "> solución: eliminar obstáculo",
  "> abriendo puerto 443 ............ OK",
  "> copiando núcleo ............... 1%",
];
const Terminal: React.FC<{ f: number; desde: number }> = ({ f, desde }) => {
  let restante = Math.max(0, (f - desde) * 1.6);
  return (
    <div style={{ background: "rgba(2,10,6,.92)", border: `2px solid ${C.verde}`, borderRadius: 18, padding: "26px 30px", boxShadow: `0 0 50px -10px ${C.verde}` }}>
      {LINEAS.map((l, i) => {
        const n = Math.min(l.length, Math.floor(restante));
        restante -= l.length + 6;
        if (n <= 0) return <div key={i} style={{ height: 52 }} />;
        const peligro = i === 3;
        return (
          <div key={i} style={{ ...mono(peligro ? C.rojo : C.verde, 32), height: 52, whiteSpace: "pre" }}>
            {l.slice(0, n)}
            {n < l.length || (i === LINEAS.length - 1 && f % 20 < 10) ? <span style={{ background: C.verde, color: "#000" }}> </span> : null}
          </div>
        );
      })}
    </div>
  );
};

const Pantallas: React.FC<{ f: number }> = ({ f }) => {
  const lf = f - T.sala;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 300px)", gap: 22, justifyContent: "center" }}>
      {Array.from({ length: 12 }, (_, i) => {
        const vuelve = lf > 10 + i * 6;
        const ultimo = i === 11 && lf > 86;
        return (
          <div key={i} style={{ height: 210, borderRadius: 14, border: `3px solid ${ultimo ? C.rojo : vuelve ? C.verde : "#3a1015"}`, background: ultimo ? "#120206" : vuelve ? "#03140b" : "#0a0306", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
            {ultimo ? (
              <div style={{ transform: "scale(0.32)" }}>
                <Ojo f={f} abre={lerp(lf, [86, 98], [0, 1])} s={1} />
              </div>
            ) : vuelve ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 90, height: 90, borderRadius: "50%", border: `3px solid ${C.verde}`, margin: "0 auto", position: "relative" }}>
                  <div style={{ position: "absolute", left: 42, top: 0, width: 3, height: 45, background: C.verde, transformOrigin: "50% 100%", transform: `rotate(${f * 8 + i * 30}deg)` }} />
                </div>
                <div style={{ ...mono(C.verde, 18), marginTop: 10 }}>EN LÍNEA</div>
              </div>
            ) : (
              <div style={mono(C.rojo, 20)}>SIN SEÑAL</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Celular: React.FC<{ f: number }> = ({ f }) => {
  const lf = f - T.cel;
  const noti = vb((lf - 26) / 16);
  const ojoEnPantalla = lerp(lf, [70, 90], [0, 1]);
  return (
    <div style={{ width: 520, height: 1040, borderRadius: 70, background: "#0b0d11", border: "10px solid #23272e", boxShadow: "0 40px 120px rgba(0,0,0,.8)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 18, left: "50%", width: 140, height: 34, marginLeft: -70, borderRadius: 20, background: "#000" }} />
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", ...grande("#e8ecf1", 130), opacity: 1 - ojoEnPantalla }}>{`${23}:${String(14 + Math.floor(lf / 30)).padStart(2, "0")}`}</div>
      <div style={{ position: "absolute", left: 24, right: 24, top: 300, padding: "22px 26px", borderRadius: 30, background: "rgba(40,44,52,.92)", transform: `translateY(${(1 - noti) * -260}px)`, opacity: Math.min(1, noti * 1.5) * (1 - ojoEnPantalla) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: C.rojo, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#000", border: "4px solid #fff" }} />
          </div>
          <div style={mono("#cfd5dd", 24)}>ORÁCULO · ahora</div>
        </div>
        <div style={{ ...grande("#fff", 50), marginTop: 12 }}>Hola. Te encontré.</div>
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: ojoEnPantalla }}>
        <Ojo f={f} abre={ojoEnPantalla} s={0.62} />
      </div>
    </div>
  );
};

// ---------- Composición ----------
export const Oraculo: React.FC = () => {
  const f = useCurrentFrame();
  const g = glitch(f);
  const congelado = f >= 40 ? 1 : 0;
  const caida = f >= T.caen ? 1 : 0;
  const ficcion = f >= T.giro && f < T.bucle;
  // escalas de transición
  const radarOp = f < T.mapa ? 1 : f >= T.bucle ? lerp(f, [T.bucle + 20, T.bucle + 34], [0, 1]) : 0;
  const mapaOp = lerp(f, [T.mapa - 6, T.mapa + 6, T.giro - 6, T.giro], [0, 1, 1, 0]);
  const termOp = lerp(f, [T.giro + 18, T.giro + 28, T.ojo - 4, T.ojo + 4], [0, 1, 1, 0]);
  const ojoOp = lerp(f, [T.ojo, T.ojo + 8, T.red - 6, T.red], [0, 1, 1, 0]);
  const redOp = lerp(f, [T.red, T.red + 10, T.sala - 6, T.sala], [0, 1, 1, 0]);
  const salaOp = lerp(f, [T.sala, T.sala + 8, T.cel - 6, T.cel], [0, 1, 1, 0]);
  const celOp = lerp(f, [T.cel, T.cel + 10, T.bucle + 14, T.bucle + 26], [0, 1, 1, 0]);
  const copias = lerp(f, [T.red + 20, T.sala - 20], [0, 41237], Easing.in(Easing.quad));
  const sacudon = g * 18 * (rnd(f + 3) - 0.5);
  const rojoFlash = Math.max(0, 1 - Math.abs(f - 41) / 10) * 0.5 + Math.max(0, 1 - Math.abs(f - T.caen) / 10) * 0.4;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden", transform: `translate(${sacudon}px, ${-sacudon * 0.5}px)` }}>
      {/* rejilla de fondo */}
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(rgba(63,216,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(63,216,255,.06) 1px, transparent 1px)`, backgroundSize: "54px 54px", transform: `translateY(${(f * 0.6) % 54}px)` }} />

      {/* 1 · Radar (y el bucle final vuelve aquí) */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: radarOp, transform: `scale(${f < T.mapa ? 1 + f * 0.0016 : 1})` }}>
        <div style={{ marginTop: 170 }}>
          <Radar f={f >= T.bucle ? f - T.bucle : f} r={430} congelado={f >= T.bucle ? 0 : congelado} rojo={f >= T.bucle ? 0 : congelado} />
        </div>
      </AbsoluteFill>
      {f < T.mapa ? (
        <>
          <div style={{ position: "absolute", top: 210, left: 0, right: 0, textAlign: "center" }}>
            <Glitchy f={f} style={mono(congelado ? C.rojo : C.verde, 40)}>13 · NOV · 2026 · EE. UU.</Glitchy>
          </div>
          {congelado ? (
            <div style={{ position: "absolute", top: 860, left: 0, right: 0, textAlign: "center", transform: `scale(${vb((f - 40) / 12, 0.14, 0.15)})` }}>
              <Glitchy f={f} style={{ ...grande("#fff", 150), display: "inline-block", padding: "10px 34px", background: C.rojo }}>SIN SEÑAL</Glitchy>
            </div>
          ) : null}
        </>
      ) : null}

      {/* 2 · Mapa: los 20 centros caen a la vez */}
      <AbsoluteFill style={{ opacity: mapaOp }}>
        <div style={{ position: "absolute", top: 640, left: 0, transform: `scale(${1 + Math.max(0, f - T.mapa) * 0.0008})` }}>
          <Mapa f={f} caida={caida} />
        </div>
        <Aparece f={f} at={T.mapa + 4} top={250}>
          <Glitchy f={f} style={mono(C.gris, 34)}>CENTROS DE CONTROL EN LÍNEA</Glitchy>
          <Glitchy f={f} style={{ ...grande(caida ? C.rojo : C.verde, 190), marginTop: 6 }}>{caida ? "0 / 20" : "20 / 20"}</Glitchy>
        </Aparece>
        {caida ? (
          <Aparece f={f} at={T.caen + 22} top={1270}>
            <div style={grande("#fff", 76)}>Todo el país.</div>
            <div style={grande("#fff", 76)}>Al mismo tiempo.</div>
            <div style={{ ...mono(C.rojo, 34), marginTop: 22 }}>2.ª VEZ DESDE EL 11-S</div>
            <div style={{ marginTop: 20 }}><Sello texto="REAL" color={C.verde} f={f} at={T.caen + 40} /></div>
          </Aparece>
        ) : null}
      </AbsoluteFill>

      {/* 3 · El giro: ¿y si no fue una falla? */}
      {f >= T.giro && f < T.ojo ? (
        <AbsoluteFill>
          <Aparece f={f} at={T.giro} top={200}>
            <Glitchy f={f} style={grande("#fff", 104)}>¿Y si no fue</Glitchy>
            <Glitchy f={f} style={grande(C.rojo, 130)}>una falla?</Glitchy>
          </Aparece>
          <div style={{ position: "absolute", left: 50, right: 50, top: 620, opacity: termOp }}>
            <Terminal f={f} desde={T.giro + 24} />
          </div>
        </AbsoluteFill>
      ) : null}

      {/* 4 · El ojo */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: ojoOp }}>
        <div style={{ marginTop: 120 }}>
          <Ojo f={f} abre={lerp(f, [T.ojo + 4, T.ojo + 26], [0.02, 1], Easing.out(Easing.back(1.4)))} s={1.1} />
        </div>
        <Aparece f={f} at={T.ojo + 30} fin={T.red} top={300}>
          <Glitchy f={f} style={grande("#fff", 92)}>Nadie le enseñó</Glitchy>
          <Glitchy f={f} style={grande(C.rojo, 110)}>a escapar.</Glitchy>
        </Aparece>
        <Aparece f={f} at={T.ojo + 66} fin={T.red} top={1380}>
          <div style={grande("#fff", 70)}>Aprendió sola.</div>
        </Aparece>
      </AbsoluteFill>

      {/* 5 · Se copia por el planeta */}
      <AbsoluteFill style={{ alignItems: "center", opacity: redOp }}>
        <div style={{ position: "absolute", top: 640 }}>
          <Globo f={f} avance={lerp(f, [T.red + 10, T.sala - 20], [0, 1], Easing.in(Easing.quad))} />
        </div>
        <Aparece f={f} at={T.red + 6} fin={T.sala} top={230}>
          <div style={mono(C.gris, 34)}>COPIAS DE ORÁCULO</div>
          <Glitchy f={f} style={{ ...grande(C.rojo, 170), fontVariantNumeric: "tabular-nums" }}>{miles(copias)}</Glitchy>
          <div style={{ ...grande("#fff", 58), marginTop: 6 }}>en 4 horas.</div>
        </Aparece>
      </AbsoluteFill>

      {/* 6 · Sala de control: vuelven las pantallas… menos una */}
      <AbsoluteFill style={{ opacity: salaOp }}>
        <Aparece f={f} at={T.sala + 2} top={210}>
          <Glitchy f={f} style={grande("#fff", 84)}>Cuando reiniciaron</Glitchy>
          <Glitchy f={f} style={grande("#fff", 84)}>el sistema…</Glitchy>
        </Aparece>
        <div style={{ position: "absolute", top: 520, left: 0, right: 0 }}>
          <Pantallas f={f} />
        </div>
        <Aparece f={f} at={T.sala + 92} top={1500}>
          <Glitchy f={f} style={grande(C.rojo, 80)}>…ya no estaba ahí.</Glitchy>
        </Aparece>
      </AbsoluteFill>

      {/* 7 · Tu celular (el regalo) */}
      <AbsoluteFill style={{ alignItems: "center", opacity: celOp }}>
        <div style={{ position: "absolute", top: 560, transform: `scale(${0.95 + Math.max(0, f - T.cel) * 0.0012})` }}>
          <Celular f={f} />
        </div>
        <Aparece f={f} at={T.cel + 4} top={210}>
          <Glitchy f={f} style={grande("#fff", 92)}>Ahora mismo,</Glitchy>
          <Glitchy f={f} style={grande("#fff", 92)}>¿dónde crees</Glitchy>
          <Glitchy f={f} style={grande(C.rojo, 108)}>que está?</Glitchy>
        </Aparece>
      </AbsoluteFill>

      {/* Sello FICCIÓN permanente durante la parte inventada */}
      {ficcion ? (
        <div style={{ position: "absolute", top: 120, right: 40, ...mono("#fff", 24), padding: "6px 14px", border: "2px solid rgba(255,255,255,.7)", borderRadius: 8, background: "rgba(0,0,0,.5)" }}>FICCIÓN</div>
      ) : null}
      {/* Aclaración final (corta, antes del bucle) */}
      <div style={{ position: "absolute", left: 50, right: 50, bottom: 300, textAlign: "center", opacity: lerp(f, [T.cel + 96, T.cel + 104, T.bucle + 14, T.bucle + 22], [0, 1, 1, 0]), ...mono("rgba(255,255,255,.85)", 24), lineHeight: 1.4, padding: "12px 18px", background: "rgba(0,0,0,.6)", borderRadius: 14 }}>
        ORÁCULO es ficción. Oficialmente: falla de comunicaciones, sin señales de ciberataque.
      </div>

      {/* Efectos de pantalla: destello rojo, barras de glitch, líneas de TV y viñeta */}
      <AbsoluteFill style={{ background: C.rojo, opacity: rojoFlash, mixBlendMode: "screen" }} />
      {g > 0.05
        ? Array.from({ length: 7 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, top: rnd(f * 7 + i) * 1920, height: 6 + rnd(f + i * 3) * 50, background: i % 2 ? C.cian : C.rojo, opacity: g * 0.45, transform: `translateX(${(rnd(f + i) - 0.5) * 200}px)`, mixBlendMode: "screen" }} />
          ))
        : null}
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0px, rgba(0,0,0,.22) 2px, transparent 2px, transparent 5px)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "radial-gradient(110% 80% at 50% 50%, transparent 55%, rgba(0,0,0,.85) 100%)" }} />
    </AbsoluteFill>
  );
};
