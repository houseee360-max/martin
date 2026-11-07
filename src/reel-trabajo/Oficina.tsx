import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { MiniPuesto, N, rnd, TrabajadorEspalda, TrabajadorFrente } from "./Trabajador";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Filtros de brillo compartidos */
export const FiltrosNeon: React.FC = () => (
  <defs>
    <filter id="glowS" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="glowL" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="16" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="reflejo" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.07" numOctaves="2" seed="3" result="t" />
      <feDisplacementMap in="SourceGraphic" in2="t" scale="26" xChannelSelector="R" yChannelSelector="G" result="d" />
      <feGaussianBlur in="d" stdDeviation="3" />
    </filter>
    <radialGradient id="halo-pantalla">
      <stop offset="0" stopColor={N.cyanCore} stopOpacity="0.9" />
      <stop offset="0.35" stopColor={N.cyan} stopOpacity="0.35" />
      <stop offset="1" stopColor={N.cyan} stopOpacity="0" />
    </radialGradient>
    <radialGradient id="mini-halo">
      <stop offset="0" stopColor={N.cyan} stopOpacity="0.45" />
      <stop offset="1" stopColor={N.cyan} stopOpacity="0" />
    </radialGradient>
    <radialGradient id="mini-logo">
      <stop offset="0" stopColor="#fff" />
      <stop offset="0.5" stopColor={N.cyan} />
      <stop offset="1" stopColor={N.cyan} stopOpacity="0" />
    </radialGradient>
    <radialGradient id="bruma-rosa" gradientUnits="userSpaceOnUse" cx="0" cy="900" r="700">
      <stop offset="0" stopColor={N.pink} stopOpacity="0.2" />
      <stop offset="1" stopColor={N.pink} stopOpacity="0" />
    </radialGradient>
    <radialGradient id="bruma-cian" gradientUnits="userSpaceOnUse" cx="1080" cy="900" r="700">
      <stop offset="0" stopColor={N.cyan} stopOpacity="0.16" />
      <stop offset="1" stopColor={N.cyan} stopOpacity="0" />
    </radialGradient>
    <linearGradient id="cielo" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor="#0d0420" />
      <stop offset="0.6" stopColor="#2a0b3e" />
      <stop offset="1" stopColor="#6a1458" />
    </linearGradient>
    <linearGradient id="piso" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor="#0f0a1c" />
      <stop offset="1" stopColor="#040208" />
    </linearGradient>
  </defs>
);

/** Tubo de neón: halo de color + núcleo casi blanco */
export const Tubo: React.FC<{ d: string; c: "pink" | "cyan"; w?: number; on?: number }> = ({ d, c, w = 12, on = 1 }) => (
  <g opacity={on}>
    <path d={d} stroke={N[c]} strokeWidth={w * 2.2} strokeLinecap="round" fill="none" opacity={0.35} filter="url(#glowL)" />
    <path d={d} stroke={N[c]} strokeWidth={w} strokeLinecap="round" fill="none" filter="url(#glowS)" />
    <path d={d} stroke={c === "pink" ? N.pinkCore : N.cyanCore} strokeWidth={w * 0.4} strokeLinecap="round" fill="none" />
  </g>
);

/** Parpadeo de neón determinista */
export const parpadeo = (f: number, seed: number, prob = 0.07) => {
  const k = Math.floor(f / 2);
  return rnd(k * 3.1 + seed) < prob ? 0.18 + rnd(k + seed) * 0.3 : 1;
};

// ---------- Ciudad lluviosa detrás del vidrio ----------
const Ciudad: React.FC = () => {
  const f = useCurrentFrame();
  const lejanos = Array.from({ length: 24 }, (_, i) => ({ x: 96 + i * 38 + rnd(i) * 10, w: 28 + rnd(i + 50) * 30, top: 540 + rnd(i + 9) * 260 }));
  const medios = Array.from({ length: 11 }, (_, i) => ({ x: 90 + i * 84 + rnd(i + 70) * 20, w: 60 + rnd(i + 80) * 40, top: 700 + rnd(i + 90) * 240 }));
  return (
    <g>
      <rect x={90} y={370} width={870} height={870} fill="url(#cielo)" />
      <ellipse cx={520} cy={1000} rx={520} ry={260} fill={N.pink} opacity={0.18} filter="url(#glowL)" />
      {/* Autos voladores */}
      {[0, 1, 2].map((i) => {
        const x = ((f * (3 + i) + i * 400) % 1100) - 40;
        return <circle key={i} cx={i % 2 ? 1000 - x : x} cy={520 + i * 46} r={3} fill={i % 2 ? N.cyan : N.amber} filter="url(#glowS)" />;
      })}
      {lejanos.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.top} width={b.w} height={1240 - b.top} fill="#1d1033" />
          {Array.from({ length: 14 }, (_, j) => {
            const on = rnd(i * 31 + j) > 0.62;
            return on ? (
              <rect key={j} x={b.x + 5 + (j % 3) * (b.w / 3.4)} y={b.top + 10 + Math.floor(j / 3) * 26} width={4} height={8} fill={[N.pink, N.cyan, N.amber][j % 3]} opacity={0.55} />
            ) : null;
          })}
        </g>
      ))}
      {medios.map((b, i) => (
        <rect key={i} x={b.x} y={b.top} width={b.w} height={1240 - b.top} fill="#130a24" />
      ))}
      {/* Carteles luminosos */}
      <g filter="url(#glowS)">
        <rect x={196} y={720} width={276} height={62} rx={6} fill="#2a0620" stroke={N.pink} strokeWidth={4} opacity={parpadeo(f, 11, 0.04)} />
        <text x={334} y={763} textAnchor="middle" fontFamily="Archivo Black" fontSize={30} fill={N.pinkCore} opacity={parpadeo(f, 11, 0.04)}>DUERME DESPUÉS</text>
        <rect x={500} y={606} width={190} height={50} rx={6} fill="#04222a" stroke={N.cyan} strokeWidth={4} />
        <text x={595} y={641} textAnchor="middle" fontFamily="Archivo Black" fontSize={26} fill={N.cyanCore}>HORAS EXTRA</text>
        <rect x={868} y={640} width={40} height={250} rx={6} fill="#2a1704" stroke={N.amber} strokeWidth={3} />
        {"ABIERTO".split("").map((ch, i) => (
          <text key={i} x={888} y={672 + i * 33} textAnchor="middle" fontFamily="Archivo Black" fontSize={26} fill="#ffe2b8">{ch}</text>
        ))}
      </g>
      {/* Lluvia */}
      <g stroke="rgba(190,225,255,.38)" strokeWidth={1.6} strokeLinecap="round">
        {Array.from({ length: 110 }, (_, i) => {
          const sp = 34 + rnd(i + 3) * 22;
          const len = 34 + rnd(i + 5) * 40;
          const x = 90 + rnd(i + 7) * 880;
          const y = 360 + ((rnd(i + 9) * 900 + f * sp) % 900);
          return <line key={i} x1={x} y1={y} x2={x - len * 0.16} y2={y + len} />;
        })}
      </g>
      {/* Gotas resbalando por el vidrio */}
      {Array.from({ length: 30 }, (_, i) => {
        const x = 100 + rnd(i + 40) * 850;
        const y = 380 + ((rnd(i + 41) * 860 + f * (0.4 + rnd(i + 42) * 1.4)) % 860);
        const r = 2.5 + rnd(i + 43) * 4;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill="rgba(210,235,255,.22)" />
            <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill="rgba(255,255,255,.55)" />
          </g>
        );
      })}
    </g>
  );
};

/** Letrero OPEN 24/7 → CLOSED */
const Letrero: React.FC<{ open: number; closed: number }> = ({ open, closed }) => (
  <g>
    <rect x={150} y={408} width={330} height={112} rx={22} fill="rgba(10,4,16,.55)" />
    <g filter="url(#glowS)">
      <rect x={150} y={408} width={330} height={112} rx={22} fill="none" stroke={N.cyan} strokeWidth={5} opacity={Math.max(open, closed * 0.25)} />
      <text x={315} y={487} textAnchor="middle" fontFamily="Archivo Black" fontSize={62} fill={N.pinkCore} stroke={N.pink} strokeWidth={3} opacity={open}>OPEN 24/7</text>
      <text x={315} y={487} textAnchor="middle" fontFamily="Archivo Black" fontSize={62} fill="#fff1f1" stroke="#ff3d5a" strokeWidth={3} opacity={closed}>CLOSED</text>
    </g>
    {open + closed < 0.3 ? (
      <text x={315} y={487} textAnchor="middle" fontFamily="Archivo Black" fontSize={62} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={2}>OPEN 24/7</text>
    ) : null}
  </g>
);

const Reloj: React.FC<{ minuto: number }> = ({ minuto }) => (
  <g transform="translate(850 482)">
    <circle r={60} fill="#0a0612" />
    <g filter="url(#glowS)">
      <circle r={60} fill="none" stroke={N.cyan} strokeWidth={5} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={0} y1={-50} x2={0} y2={-42} stroke={N.cyanCore} strokeWidth={3} transform={`rotate(${i * 30})`} />
      ))}
      <line x1={0} y1={6} x2={0} y2={-30} stroke={N.pinkCore} strokeWidth={6} strokeLinecap="round" transform={`rotate(${minuto / 12})`} />
      <line x1={0} y1={8} x2={0} y2={-46} stroke="#fff" strokeWidth={4} strokeLinecap="round" transform={`rotate(${minuto})`} />
    </g>
    <circle r={5} fill={N.pink} />
  </g>
);

const Taza: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -17 0 L -21 -44 L 21 -44 L 17 0 Z" fill="#d9d2e6" />
    <rect x={-20} y={-30} width={40} height={14} fill="#7a4a3a" />
    <rect x={-23} y={-50} width={46} height={8} rx={3} fill="#f2eef8" />
    <path d="M -17 0 L -21 -44" stroke={N.pink} strokeWidth={3} />
    <path d="M 17 0 L 21 -44" stroke={N.cyan} strokeWidth={3} />
  </g>
);

// Tazas apiladas (x, y-base): aparecen una a una en la escena del reloj
const TAZAS: [number, number][] = [
  [740, 1304], [790, 1304], [765, 1252], [840, 1304], [815, 1252], [790, 1200],
  [300, 1304], [250, 1304], [275, 1252], [350, 1304], [325, 1252], [300, 1200], [765, 1148], [275, 1148],
];

export type EstadoOficina = {
  minuto: number;
  tazas: number; // cuántas tazas visibles (fraccional = aparición en curso)
  open: number;
  closed: number;
  tapa: number; // 1 abierta → 0 cerrada
  tecleo: number; // amplitud del tecleo
  levantarse: number; // 0 sentado → 1 de pie
  caminar: number; // 0 en el escritorio → 1 en la puerta
  salida: number; // opacidad del personaje al salir
  zumbido: number; // brillo de los tubos
  cara: { sonrisa: number; parpado: number; mirada: { x: number; y: number }; cansancio: number };
};

/** Mundo de la oficina (1080×1920). La cámara lo encuadra desde fuera. */
export const Oficina: React.FC<{ e: EstadoOficina }> = ({ e }) => {
  const f = useCurrentFrame();
  const bob = Math.abs(Math.sin(f * 0.85)) * 3 * e.tecleo;
  const deEspaldas = e.caminar > 0;
  const p = e.caminar;
  const s = 1 - 0.52 * p;
  const pieY = 1640 - 410 * p;
  const x = 540 + 300 * p;
  const cabezaY = deEspaldas ? pieY - 720 * s : 1000 - 100 * e.levantarse + bob;
  const luzTubo = e.zumbido;
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <FiltrosNeon />
      <defs>
        <clipPath id="vidrios">
          <rect x={120} y={380} width={580} height={630} />
          <rect x={760} y={600} width={180} height={630} />
        </clipPath>
        <clipPath id="piso-clip">
          <polygon points="-400,1500 80,1230 1000,1230 1480,1500 1480,2400 -400,2400" />
        </clipPath>
      </defs>
      {/* Paredes y techo */}
      <rect x={-400} y={-400} width={1880} height={2800} fill="#0b0715" />
      <rect x={80} y={330} width={920} height={900} fill="#140b22" />
      <polygon points="-400,-400 1480,-400 1000,330 80,330" fill="#08050f" />
      <polygon points="-400,-400 80,330 80,1230 -400,1500" fill="#0e0819" />
      <polygon points="1480,-400 1000,330 1000,1230 1480,1500" fill="#0e0819" />
      {/* Ciudad (id para reutilizarla en el reflejo del piso) */}
      <g id="vista" clipPath="url(#vidrios)">
        <Ciudad />
      </g>
      {/* Marcos */}
      <g fill="none" stroke="#05030a">
        <rect x={120} y={380} width={580} height={630} strokeWidth={16} />
        <path d="M 313 380 V 1010 M 506 380 V 1010 M 120 700 H 700" strokeWidth={12} />
        <rect x={760} y={600} width={180} height={630} strokeWidth={14} />
      </g>
      <path d="M 128 388 V 1002" stroke={N.pink} strokeWidth={3} opacity={0.5} />
      <path d="M 932 608 V 1226" stroke={N.cyan} strokeWidth={3} opacity={0.6} />
      <Letrero open={e.open} closed={e.closed} />
      <Reloj minuto={e.minuto} />
      {/* Tubos del techo y del muro */}
      <g opacity={luzTubo}>
        <Tubo d="M 250 -60 L 340 318" c="pink" />
        <Tubo d="M 830 -60 L 740 318" c="cyan" />
        <Tubo d="M 130 352 L 520 352" c="pink" w={9} />
        <Tubo d="M 560 352 L 950 352" c="cyan" w={9} />
        <Tubo d="M 130 1030 L 690 1030" c="pink" w={6} />
        <Tubo d="M 760 588 H 940" c="cyan" w={6} />
      </g>
      {/* Piso mojado con reflejos */}
      <polygon points="-400,1500 80,1230 1000,1230 1480,1500 1480,2400 -400,2400" fill="url(#piso)" />
      <g clipPath="url(#piso-clip)" opacity={0.5} filter="url(#reflejo)">
        <g transform="translate(0 1230) scale(1 -0.62) translate(0 -1230)">
          <use href="#vista" />
          <rect x={130} y={1026} width={560} height={8} fill={N.pink} />
          <rect x={150} y={408} width={330} height={112} fill="none" stroke={N.cyan} strokeWidth={5} opacity={e.open} />
        </g>
        <rect x={10} y={1240} width={60} height={700} fill={N.pink} opacity={0.5 * luzTubo} />
        <rect x={1010} y={1240} width={60} height={700} fill={N.cyan} opacity={0.5 * luzTubo} />
        <rect x={190} y={1756} width={700} height={10} fill={N.cyan} opacity={0.7} />
      </g>
      {/* Bruma con la luz de la ventana */}
      {/* Personaje */}
      <g transform={`translate(${x} ${cabezaY}) scale(${deEspaldas ? s : 1})`} opacity={e.salida}>
        {deEspaldas ? (
          <TrabajadorEspalda uid="tb" fase={f * 0.48} paso={Math.min(1, p * 8)} />
        ) : (
          <TrabajadorFrente uid="tf" {...e.cara} pantalla={e.tapa} />
        )}
      </g>
      {/* Laptop (vista trasera) */}
      <circle cx={540} cy={1140} r={260} fill="url(#halo-pantalla)" opacity={0.75 * e.tapa} style={{ mixBlendMode: "screen" }} />
      <g transform={`translate(540 1306) scale(1 ${0.05 + 0.95 * e.tapa}) translate(-540 -1306)`}>
        <rect x={400} y={1128} width={280} height={178} rx={10} fill="#1b1b25" />
        <path d="M 400 1138 V 1300" stroke={N.pink} strokeWidth={3} opacity={0.8} />
        <path d="M 680 1138 V 1300" stroke={N.cyan} strokeWidth={3} opacity={0.8} />
        <g filter="url(#glowS)" opacity={e.tapa}>
          <path d="M 540 1196 L 560 1232 L 520 1232 Z" fill="none" stroke={N.cyanCore} strokeWidth={4} />
        </g>
      </g>
      {/* Escritorio */}
      <polygon points="210,1290 870,1290 900,1322 180,1322" fill="#1d1828" />
      <rect x={180} y={1322} width={720} height={280} fill="#100c18" />
      <g filter="url(#glowS)">
        <rect x={180} y={1322} width={720} height={5} fill={N.cyan} />
      </g>
      <path d="M 210 1290 H 870" stroke="rgba(255,255,255,.18)" strokeWidth={2} />
      {TAZAS.map(([tx, ty], i) => {
        const v = Math.max(0, Math.min(1, e.tazas - i));
        return v > 0 ? <Taza key={i} x={tx} y={ty} s={v < 1 ? 1.25 - 0.25 * v : 1} /> : null;
      })}
      {/* Tubos verticales cercanos: dan la luz rosa/cian de borde */}
      <g opacity={luzTubo}>
        <Tubo d="M 34 120 L 34 1360" c="pink" w={14} />
        <Tubo d="M 1046 120 L 1046 1360" c="cyan" w={14} />
      </g>
      {/* Bruma ambiental */}
      <rect x={-400} y={-400} width={1880} height={2800} fill="url(#bruma-rosa)" style={{ mixBlendMode: "screen" }} />
      <rect x={-400} y={-400} width={1880} height={2800} fill="url(#bruma-cian)" style={{ mixBlendMode: "screen" }} />
    </svg>
  );
};

// ---------- Escena: el charco (reflejo que envejece) ----------
export const Charco: React.FC<{ edad: number }> = ({ edad }) => {
  const f = useCurrentFrame();
  const ondas = Array.from({ length: 16 }, (_, i) => ({ t0: Math.floor(rnd(i + 200) * 150), x: rnd(i + 210) * 1080, y: 300 + rnd(i + 220) * 1500 }));
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <FiltrosNeon />
      <defs>
        <filter id="agua" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={`${0.008 + Math.sin(f / 18) * 0.0008} ${0.02 + Math.cos(f / 23) * 0.002}`} numOctaves="2" seed="5" result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <rect width={1080} height={1920} fill="#05030b" />
      <g filter="url(#agua)">
        <ellipse cx={180} cy={500} rx={360} ry={900} fill={N.pink} opacity={0.22} filter="url(#glowL)" />
        <ellipse cx={940} cy={1300} rx={340} ry={900} fill={N.cyan} opacity={0.2} filter="url(#glowL)" />
        <g transform="translate(860 1640) scale(-1 1) rotate(-8)" opacity={0.55 * parpadeo(f, 4)} filter="url(#glowS)">
          <text x={0} y={0} textAnchor="middle" fontFamily="Archivo Black" fontSize={90} fill={N.pinkCore} stroke={N.pink} strokeWidth={4}>OPEN 24/7</text>
        </g>
        <g transform="translate(540 1070) scale(3.1)" opacity={0.92}>
          <TrabajadorFrente uid="ch" edad={edad} parpado={0.45 + edad * 0.15} mirada={{ x: 0, y: -0.2 }} pantalla={0.4} cansancio={0.6 + edad * 0.4} />
        </g>
        <rect width={1080} height={1920} fill="#1a0a2e" opacity={0.25} />
      </g>
      {/* Gotas que caen en el charco */}
      <g fill="none">
        {[{ t0: 0, x: 540, y: 1000 }, ...ondas].map((o, i) => {
          const lf = f - o.t0;
          if (lf < 0 || lf > 50) return null;
          return [0, 9, 18].map((dl) => {
            const r = Math.max(0, lf - dl) * (i === 0 ? 26 : 5);
            const op = Math.max(0, 1 - (lf - dl) / 40) * (i === 0 ? 0.9 : 0.5);
            return r > 0 ? <ellipse key={`${i}-${dl}`} cx={o.x} cy={o.y} rx={r} ry={r * 0.9} stroke={i % 2 ? N.cyanCore : "#fff"} strokeWidth={i === 0 ? 5 : 2.5} opacity={op} /> : null;
          });
        })}
      </g>
    </svg>
  );
};

// ---------- Escena: filas infinitas de trabajadores idénticos ----------
export const Filas: React.FC = () => {
  const f = useCurrentFrame();
  const VX = 540;
  const VY = 660;
  const bob = Math.abs(Math.sin(f * 0.85)) * 3;
  const filas = Array.from({ length: 11 }, (_, r) => 10 - r);
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <FiltrosNeon />
      <defs>
        <radialGradient id="niebla" cx="0.5" cy="0.34" r="0.6">
          <stop offset="0" stopColor="#4a1660" />
          <stop offset="0.5" stopColor="#170a2a" />
          <stop offset="1" stopColor="#05030a" />
        </radialGradient>
      </defs>
      <rect x={-1500} y={-1500} width={4080} height={4920} fill="url(#niebla)" />
      {/* Tubos del techo hacia el punto de fuga */}
      {[-1400, -700, -150, 1230, 1780, 2480].map((tx, i) => (
        <Tubo key={i} d={`M ${VX + (tx - VX) * 0.08} ${VY - 40} L ${tx} -600`} c={i % 2 ? "cyan" : "pink"} w={10} />
      ))}
      {/* Reflejos en el piso */}
      {[-1400, -700, -150, 1230, 1780, 2480].map((tx, i) => (
        <path key={i} d={`M ${VX + (tx - VX) * 0.08} ${VY + 40} L ${tx} 2600`} stroke={i % 2 ? N.cyan : N.pink} strokeWidth={30} opacity={0.12} filter="url(#glowL)" />
      ))}
      {filas.map((r) => {
        const d = 1 + r * 0.62;
        const y = VY + (1500 - VY) / d;
        const esp = 430 / d;
        const n = Math.ceil(1500 / esp);
        return (
          <g key={r} opacity={Math.max(0.15, 1 - r * 0.085)}>
            {Array.from({ length: n * 2 + 1 }, (_, k) => {
              const xx = VX + (k - n) * esp;
              return (
                <g key={k} transform={`translate(${xx} ${y}) scale(${1 / d})`}>
                  <MiniPuesto bob={bob} />
                </g>
              );
            })}
          </g>
        );
      })}
      <rect x={-1500} y={VY - 300} width={4080} height={520} fill="#2a0e40" opacity={0.25} filter="url(#glowL)" />
    </svg>
  );
};

export { clamp, interpolate };
