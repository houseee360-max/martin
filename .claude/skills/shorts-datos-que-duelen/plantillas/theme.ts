import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fuentes de Google Fonts (Archivo Black y JetBrains Mono), guardadas en
// public/fonts para que el render no dependa de la red.
export const DISPLAY = "Archivo Black";
export const MONO = "JetBrains Mono";

loadFont({
  family: DISPLAY,
  url: staticFile("fonts/ArchivoBlack-Regular.woff2"),
  weight: "400",
  format: "woff2",
});
loadFont({
  family: MONO,
  url: staticFile("fonts/JetBrainsMono-Variable.woff2"),
  weight: "100 800",
  format: "woff2",
});

export const C = {
  bg: "#141414",
  fg: "#F2EFE9",
  /** Solo para datos negativos */
  accent: "#FF4D2E",
  dim: "rgba(242,239,233,0.45)",
  faint: "rgba(242,239,233,0.14)",
  black: "#000000",
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const sec = (s: number) => Math.round(s * FPS);

/** Escenas en segundos [inicio, fin] */
export const SCENES = [
  { name: "01 · 18 días", from: 0, to: 8 },
  { name: "02 · SalaryBar", from: 8, to: 25 },
  { name: "03 · 61%", from: 25, to: 65 },
  { name: "04 · Bruto ≠ Líquido", from: 65, to: 100 },
  { name: "05 · Línea 30%", from: 100, to: 150 },
  { name: "06 · Comunas", from: 150, to: 200 },
  { name: "07 · Lima", from: 200, to: 220 },
  { name: "08 · Perú", from: 220, to: 280 },
  { name: "09 · Chile vs Perú", from: 280, to: 330 },
  { name: "10 · Cierre", from: 330, to: 360 },
] as const;

export const TOTAL_FRAMES = sec(360);

/** Formato con punto de miles: 553553 -> "553.553" */
export const fmt = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
