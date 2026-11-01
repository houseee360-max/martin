// Mejores momentos para Shorts / TikTok / Reels.
// Cada clip es una lista de tramos [inicio, fin] en segundos del episodio completo.
// Todos terminan con la pregunta final del episodio ("¿cuánto pagas tú?").

export type HookPart = { text: string; red?: boolean };

export type Clip = {
  id: string;
  hook: HookPart[];
  segments: [number, number][];
};

const CTA: [number, number] = [336.8, 342.6];

export const CLIPS: Clip[] = [
  {
    id: "Short01-18Dias",
    hook: [{ text: "Trabajas " }, { text: "18 días", red: true }, { text: " al mes solo para pagar el arriendo" }],
    segments: [[0, 7.3], [49.0, 63.4], CTA],
  },
  {
    id: "Short02-Providencia",
    hook: [{ text: "Arrendar en Providencia: el " }, { text: "163%", red: true }, { text: " del sueldo mínimo" }],
    segments: [[150.3, 183.0], CTA],
  },
  {
    id: "Short03-Regla30",
    hook: [{ text: "La regla del 30% que con sueldo mínimo " }, { text: "nadie puede cumplir", red: true }],
    segments: [[100.3, 133.0], CTA],
  },
  {
    id: "Short04-BrutoLiquido",
    hook: [{ text: "Tu sueldo mínimo es " }, { text: "más chico", red: true }, { text: " de lo que crees" }],
    segments: [[8.3, 22.4], [65.5, 88.0], CTA],
  },
  {
    id: "Short05-Lima",
    hook: [{ text: "Lima: arrendar en Los Olivos Sur cuesta el " }, { text: "129%", red: true }, { text: " del sueldo mínimo" }],
    segments: [[201.0, 205.6], [220.3, 263.4], CTA],
  },
  {
    id: "Short06-ChileVsPeru",
    hook: [{ text: "Chile vs. Perú: cuánto del sueldo mínimo " }, { text: "se come el arriendo", red: true }],
    segments: [[280.3, 311.4], CTA],
  },
];
