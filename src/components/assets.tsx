import { Audio } from "@remotion/media";
import React, { createContext, useContext } from "react";
import { Sequence, staticFile } from "remotion";

export type AssetFlags = {
  voz: boolean;
  musica: boolean;
  tic: boolean;
  golpe: boolean;
  subida: boolean;
  logo: boolean;
};

export const NO_ASSETS: AssetFlags = {
  voz: false,
  musica: false,
  tic: false,
  golpe: false,
  subida: false,
  logo: false,
};

export const AssetsContext = createContext<AssetFlags>(NO_ASSETS);
export const useAssets = () => useContext(AssetsContext);

/** Efecto de sonido opcional: solo suena si el archivo existe en /public */
export const Sfx: React.FC<{
  name: "tic" | "golpe" | "subida";
  from?: number;
  volume?: number;
}> = ({ name, from = 0, volume = 0.7 }) => {
  const assets = useAssets();
  if (!assets[name]) return null;
  return (
    <Sequence from={from} durationInFrames={90} layout="none" name={`sfx ${name}`}>
      <Audio src={staticFile(`${name}.mp3`)} volume={volume} />
    </Sequence>
  );
};
