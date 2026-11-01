import { staticFile } from "remotion";
import { AssetFlags, NO_ASSETS } from "./components/assets";
import { parseSubtitles, Word } from "./components/Subtitles";

/** Comprueba si un archivo existe en /public (sin romper el render si falta) */
const exists = async (file: string) => {
  try {
    const res = await fetch(staticFile(file), { method: "HEAD" });
    const type = res.headers.get("content-type") ?? "";
    return res.ok && !type.includes("text/html");
  } catch {
    return false;
  }
};

const FILES: Record<keyof AssetFlags, string> = {
  voz: "voz.mp3",
  musica: "musica.mp3",
  tic: "tic.mp3",
  golpe: "golpe.mp3",
  subida: "subida.mp3",
  logo: "logo.png",
};

/** Detecta qué archivos de /public existen y carga subtitulos.json */
export const loadMedia = async (fallback: Word[]) => {
  const names = Object.keys(NO_ASSETS) as (keyof AssetFlags)[];
  const assets = Object.fromEntries(
    await Promise.all(names.map(async (n) => [n, await exists(FILES[n])] as const)),
  ) as AssetFlags;

  let subtitles = fallback;
  try {
    const res = await fetch(staticFile("subtitulos.json"));
    if (res.ok && !(res.headers.get("content-type") ?? "").includes("text/html")) {
      subtitles = parseSubtitles(await res.json());
    }
  } catch {
    // sin subtítulos
  }
  return { assets, subtitles };
};
