import React from "react";
import { interpolateColors } from "remotion";

export const N = {
  pink: "#ff2fb4",
  pinkCore: "#ffd3f1",
  cyan: "#22e8ff",
  cyanCore: "#d4fbff",
  amber: "#ffb347",
  violet: "#7a2cff",
  deep: "#06040b",
};

/** Pseudoaleatorio determinista (mismo resultado en cada cuadro del render) */
export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const PIEL = "#a9787a";
const PIEL_SOMBRA = "#74505f";
const SUDADERA = "#2b2b37";
const SUDADERA_OSC = "#1c1c26";
const CAMISA = "#d8d6e4";
const PANTALON = "#191924";

// Siluetas compartidas (coordenadas locales: centro de la cabeza en 0,0)
const CARA = "M -64 -10 C -64 -60 -34 -82 0 -82 C 34 -82 64 -60 64 -10 C 64 30 46 70 0 80 C -46 70 -64 30 -64 -10 Z";
const TORSO = "M -165 430 L -158 190 C -155 140 -120 118 -60 112 L 60 112 C 120 118 155 140 158 190 L 165 430 Z";
const PELO_FRENTE =
  "M -70 -4 C -78 -66 -42 -100 2 -100 C 48 -100 80 -66 70 -4 L 62 -26 L 54 -10 L 46 -36 L 34 -18 L 22 -40 L 8 -20 L -6 -42 L -20 -20 L -34 -40 L -46 -16 L -56 -32 L -64 -8 Z";
const PELO_PUNTAS = "M -44 -86 L -58 -116 L -24 -96 L -12 -126 L 4 -98 L 24 -120 L 28 -94 L 58 -110 L 46 -80 Z";

/** Luz de borde rosa (izquierda) y cian (derecha) + luz de pantalla desde abajo */
const LucesBorde: React.FC<{ uid: string; mask: string; pantalla?: number; fuerza?: number }> = ({ uid, mask, pantalla = 0, fuerza = 1 }) => (
  <g mask={`url(#${mask})`} style={{ mixBlendMode: "screen" }} opacity={fuerza}>
    <rect x={-74} y={-130} width={148} height={215} fill={`url(#${uid}-rim)`} />
    <rect x={-172} y={100} width={344} height={640} fill={`url(#${uid}-rim)`} />
    {pantalla > 0 ? <rect x={-80} y={-20} width={160} height={260} fill={`url(#${uid}-scr)`} opacity={pantalla} /> : null}
  </g>
);

const Defs: React.FC<{ uid: string }> = ({ uid }) => (
  <>
    <linearGradient id={`${uid}-rim`} x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stopColor={N.pink} stopOpacity="1" />
      <stop offset="0.24" stopColor={N.pink} stopOpacity="0" />
      <stop offset="0.76" stopColor={N.cyan} stopOpacity="0" />
      <stop offset="1" stopColor={N.cyan} stopOpacity="1" />
    </linearGradient>
    <linearGradient id={`${uid}-scr`} x1="0" x2="0" y1="1" y2="0">
      <stop offset="0" stopColor={N.cyan} stopOpacity="0.75" />
      <stop offset="0.55" stopColor={N.cyan} stopOpacity="0" />
    </linearGradient>
  </>
);

export type TrabajadorProps = {
  uid: string;
  edad?: number; // 0 joven → 1 jubilado
  sonrisa?: number; // 0 → 1
  parpado?: number; // 0 abierto → 1 cerrado (cansado ≈ 0.45)
  mirada?: { x: number; y: number }; // -1..1
  pantalla?: number; // luz de la laptop sobre la cara
  cansancio?: number; // ojeras
};

/** Trabajador de frente (sentado o de pie: las piernas quedan tapadas por el escritorio) */
export const TrabajadorFrente: React.FC<TrabajadorProps> = ({
  uid,
  edad = 0,
  sonrisa = 0,
  parpado = 0.45,
  mirada = { x: 0, y: 0.4 },
  pantalla = 1,
  cansancio = 0.6,
}) => {
  const pelo = interpolateColors(edad, [0, 0.55, 1], ["#120f18", "#5b5862", "#dcdbe2"]);
  const ceja = interpolateColors(edad, [0, 1], ["#120f18", "#c9c8d0"]);
  const arruga = Math.max(0, edad - 0.15) * 0.95;
  const ojo = (ex: number, lado: string) => {
    const ey = 6;
    const lid = Math.min(1, parpado);
    return (
      <g>
        <clipPath id={`${uid}-${lado}`}>
          <ellipse cx={ex} cy={ey} rx={13} ry={8} />
        </clipPath>
        <ellipse cx={ex} cy={ey} rx={13} ry={8} fill="#e6e1ec" />
        <g clipPath={`url(#${uid}-${lado})`}>
          <circle cx={ex + mirada.x * 5} cy={ey + mirada.y * 3} r={6} fill="#1a1218" />
          <circle cx={ex + mirada.x * 5 + 2.2} cy={ey + mirada.y * 3 - 2} r={1.9} fill={N.cyanCore} opacity={0.4 + pantalla * 0.6} />
          <rect x={ex - 15} y={ey - 10} width={30} height={2 + 16 * lid} fill={PIEL} />
        </g>
        <path d={`M ${ex - 14} ${ey - 8 + 16 * lid} Q ${ex} ${ey - 11 + 16 * lid} ${ex + 14} ${ey - 8 + 16 * lid}`} stroke="#2a1820" strokeWidth={3} fill="none" strokeLinecap="round" />
        <path d={`M ${ex - 12} ${ey + 10} Q ${ex} ${ey + 16} ${ex + 12} ${ey + 10}`} stroke="#4a2a55" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.35 + cansancio * 0.5} />
      </g>
    );
  };
  const comisura = 55 - sonrisa * 9;
  const centroBoca = 51 + sonrisa * 15;
  return (
    <g>
      <defs>
        <Defs uid={uid} />
        <mask id={`${uid}-sil`}>
          <path d={TORSO} fill="#fff" />
          <rect x={-24} y={50} width={48} height={70} fill="#fff" />
          <path d={CARA} fill="#fff" />
          <path d={PELO_FRENTE} fill="#fff" />
          <path d={PELO_PUNTAS} fill="#fff" />
          <ellipse cx={-63} cy={4} rx={10} ry={17} fill="#fff" />
          <ellipse cx={63} cy={4} rx={10} ry={17} fill="#fff" />
        </mask>
      </defs>
      {/* Capucha detrás del cuello */}
      <path d="M -100 128 C -92 78 92 78 100 128 Z" fill={SUDADERA_OSC} />
      <path d={TORSO} fill={SUDADERA} />
      {/* Mangas: sombra que separa brazos del torso */}
      <path d="M -122 210 C -126 280 -122 360 -112 430" stroke={SUDADERA_OSC} strokeWidth={6} fill="none" />
      <path d="M 122 210 C 126 280 122 360 112 430" stroke={SUDADERA_OSC} strokeWidth={6} fill="none" />
      {/* Camisa blanca y corbata suelta */}
      <path d="M -54 112 L 54 112 L 46 430 L -46 430 Z" fill={CAMISA} />
      <path d="M -54 112 L -46 430" stroke={SUDADERA_OSC} strokeWidth={8} />
      <path d="M 54 112 L 46 430" stroke={SUDADERA_OSC} strokeWidth={8} />
      <path d="M -40 126 L -46 236" stroke="#8d8c9c" strokeWidth={4} strokeLinecap="round" />
      <path d="M 40 126 L 44 236" stroke="#8d8c9c" strokeWidth={4} strokeLinecap="round" />
      <rect x={-24} y={50} width={48} height={70} fill={PIEL_SOMBRA} />
      <path d="M -32 112 L -6 146 L -1 116 Z" fill="#f4f3fa" />
      <path d="M 32 112 L 8 146 L 3 116 Z" fill="#f4f3fa" />
      <path d="M -7 134 L 13 131 L 10 152 L -4 153 Z" fill="#101016" />
      <path d="M -4 152 L 10 151 L 26 306 L 10 330 L -2 306 Z" fill="#14141b" />
      <path d="M 4 160 L 18 300" stroke="#3a3a48" strokeWidth={2} />
      {/* Cabeza */}
      <ellipse cx={-63} cy={4} rx={10} ry={17} fill={PIEL_SOMBRA} />
      <ellipse cx={63} cy={4} rx={10} ry={17} fill={PIEL_SOMBRA} />
      <path d={CARA} fill={PIEL} />
      <path d="M -64 -10 C -64 30 -46 70 0 80 C -30 66 -50 36 -54 -6 Z" fill={PIEL_SOMBRA} opacity={0.5} />
      {ojo(-27, "oi")}
      {ojo(27, "od")}
      <path d="M -44 -21 Q -30 -29 -12 -22" stroke={ceja} strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d="M 44 -21 Q 30 -29 12 -22" stroke={ceja} strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d="M -2 4 Q -8 28 -3 34 Q 4 38 11 33" stroke={PIEL_SOMBRA} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <path d={`M -21 ${comisura} Q 0 ${centroBoca} 21 ${comisura}`} stroke="#4a2430" strokeWidth={4.5} fill="none" strokeLinecap="round" />
      {/* Arrugas (aparecen con la edad) */}
      <g stroke={PIEL_SOMBRA} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={arruga}>
        <path d="M -30 -46 Q 0 -53 30 -46" />
        <path d="M -24 -37 Q 0 -42 24 -37" />
        <path d="M -16 36 Q -27 46 -24 60" />
        <path d="M 16 36 Q 27 46 24 60" />
        <path d="M -44 0 L -52 -4 M -44 7 L -53 8 M 44 0 L 52 -4 M 44 7 L 53 8" />
        <path d="M -38 20 Q -28 25 -16 20 M 38 20 Q 28 25 16 20" />
      </g>
      {/* Pelo desordenado */}
      <path d={PELO_PUNTAS} fill={pelo} />
      <path d={PELO_FRENTE} fill={pelo} />
      <path d="M -66 -6 L -74 -30 L -62 -22 Z M 66 -6 L 74 -30 L 62 -22 Z" fill={pelo} />
      <LucesBorde uid={uid} mask={`${uid}-sil`} pantalla={pantalla} />
    </g>
  );
};

/** De espaldas, caminando (fase = ciclo de paso en radianes) */
export const TrabajadorEspalda: React.FC<{ uid: string; fase: number; paso: number }> = ({ uid, fase, paso }) => {
  const a = Math.sin(fase) * 22 * paso;
  const pierna = (x: number, ang: number) => (
    <g transform={`rotate(${ang} ${x} 420)`}>
      <rect x={x - 30} y={410} width={60} height={290} rx={22} fill={PANTALON} />
      <ellipse cx={x} cy={706} rx={36} ry={18} fill="#0b0b10" />
    </g>
  );
  const brazo = (x: number, ang: number) => (
    <g transform={`rotate(${ang} ${x} 150)`}>
      <rect x={x - 30} y={140} width={60} height={270} rx={28} fill={SUDADERA} />
      <ellipse cx={x} cy={410} rx={24} ry={20} fill={PIEL_SOMBRA} />
    </g>
  );
  return (
    <g>
      <defs>
        <Defs uid={uid} />
        <mask id={`${uid}-esp`}>
          <g fill="#fff">
            <path d={TORSO} />
            <ellipse cx={0} cy={-8} rx={68} ry={84} />
            <g transform={`rotate(${a} -40 420)`}><rect x={-70} y={410} width={60} height={310} rx={22} /></g>
            <g transform={`rotate(${-a} 40 420)`}><rect x={10} y={410} width={60} height={310} rx={22} /></g>
            <g transform={`rotate(${-a * 0.8} -150 150)`}><rect x={-180} y={140} width={60} height={290} rx={28} /></g>
            <g transform={`rotate(${a * 0.8} 150 150)`}><rect x={120} y={140} width={60} height={290} rx={28} /></g>
          </g>
        </mask>
      </defs>
      {pierna(-40, a)}
      {pierna(40, -a)}
      {brazo(-150, -a * 0.8)}
      {brazo(150, a * 0.8)}
      <path d={TORSO} fill={SUDADERA} />
      <path d="M -4 150 L -4 420" stroke={SUDADERA_OSC} strokeWidth={5} />
      <rect x={-24} y={50} width={48} height={70} fill={PIEL_SOMBRA} />
      <path d="M -104 150 C -94 92 94 92 104 150 C 84 196 -84 196 -104 150 Z" fill={SUDADERA_OSC} />
      <ellipse cx={-64} cy={6} rx={10} ry={17} fill={PIEL_SOMBRA} />
      <ellipse cx={64} cy={6} rx={10} ry={17} fill={PIEL_SOMBRA} />
      <ellipse cx={0} cy={-8} rx={66} ry={82} fill="#120f18" />
      <path d={PELO_PUNTAS} fill="#120f18" />
      <path d="M -60 40 L -48 62 L -30 48 L -14 70 L 0 50 L 16 70 L 30 48 L 48 62 L 60 40 Z" fill="#120f18" />
      <LucesBorde uid={uid} mask={`${uid}-esp`} />
    </g>
  );
};

/** Versión mini (para las filas infinitas): sin máscaras, barata de dibujar */
export const MiniPuesto: React.FC<{ bob: number }> = ({ bob }) => (
  <g>
    <g transform={`translate(0 ${bob})`}>
      <path d="M -150 -40 L -144 -110 C -140 -150 -110 -165 -55 -170 L 55 -170 C 110 -165 140 -150 144 -110 L 150 -40 Z" fill={SUDADERA} />
      <path d="M -48 -170 L 48 -170 L 42 -40 L -42 -40 Z" fill={CAMISA} />
      <path d="M -3 -160 L 9 -160 L 20 -60 L 4 -48 Z" fill="#14141b" />
      <rect x={-22} y={-225} width={44} height={60} fill={PIEL_SOMBRA} />
      <ellipse cx={0} cy={-290} rx={60} ry={74} fill={PIEL} />
      <ellipse cx={0} cy={-232} rx={42} ry={22} fill={N.cyan} opacity={0.22} />
      <path d="M -66 -292 C -74 -350 -40 -380 2 -380 C 46 -380 76 -350 66 -292 L 50 -318 L 30 -300 L 10 -322 L -12 -300 L -32 -322 L -52 -300 Z" fill="#120f18" />
      <path d="M -40 -296 L -16 -296 M 16 -296 L 40 -296" stroke="#2a1820" strokeWidth={5} strokeLinecap="round" />
      <path d="M -60 -320 A 60 74 0 0 0 -30 -226" stroke={N.pink} strokeWidth={6} fill="none" opacity={0.9} />
      <path d="M 60 -320 A 60 74 0 0 1 30 -226" stroke={N.cyan} strokeWidth={6} fill="none" opacity={0.9} />
      <path d="M -146 -110 L -150 -40" stroke={N.pink} strokeWidth={7} opacity={0.8} />
      <path d="M 146 -110 L 150 -40" stroke={N.cyan} strokeWidth={7} opacity={0.8} />
    </g>
    <ellipse cx={0} cy={-150} rx={170} ry={90} fill="url(#mini-halo)" />
    <rect x={-130} y={-165} width={260} height={160} rx={10} fill="#1b1b25" />
    <path d="M -130 -155 L -130 -10" stroke={N.pink} strokeWidth={3} opacity={0.7} />
    <path d="M 130 -155 L 130 -10" stroke={N.cyan} strokeWidth={3} opacity={0.7} />
    <circle cx={0} cy={-88} r={16} fill="url(#mini-logo)" />
    <path d="M -195 -8 L 195 -8 L 210 18 L -210 18 Z" fill="#1d1828" />
    <rect x={-210} y={18} width={420} height={260} fill="#100c18" />
    <rect x={-210} y={18} width={420} height={5} fill={N.cyan} opacity={0.85} />
  </g>
);
