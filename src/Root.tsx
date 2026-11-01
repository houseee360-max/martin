import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { AssetFlags, NO_ASSETS } from "./components/assets";
import { parseSubtitles } from "./components/Subtitles";
import { Episodio1, Episodio1Props } from "./Episodio1";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./theme";

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

const calculateMetadata: CalculateMetadataFunction<Episodio1Props> = async ({ props }) => {
  const names = Object.keys(NO_ASSETS) as (keyof AssetFlags)[];
  const files: Record<keyof AssetFlags, string> = {
    voz: "voz.mp3",
    musica: "musica.mp3",
    tic: "tic.mp3",
    golpe: "golpe.mp3",
    subida: "subida.mp3",
    logo: "logo.png",
  };
  const flags = Object.fromEntries(
    await Promise.all(names.map(async (n) => [n, await exists(files[n])] as const)),
  ) as AssetFlags;

  let subtitles = props.subtitles;
  try {
    const res = await fetch(staticFile("subtitulos.json"));
    if (res.ok && !(res.headers.get("content-type") ?? "").includes("text/html")) {
      subtitles = parseSubtitles(await res.json());
    }
  } catch {
    // sin subtítulos
  }

  return { props: { ...props, assets: flags, subtitles } };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Episodio1"
    component={Episodio1}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ assets: NO_ASSETS, subtitles: [] }}
    calculateMetadata={calculateMetadata}
  />
);
