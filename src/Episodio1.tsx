import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile } from "remotion";
import { AssetFlags, AssetsContext } from "./components/assets";
import { Subtitles, Word } from "./components/Subtitles";
import { Wipe } from "./components/Wipe";
import { Scene01 } from "./scenes/Scene01";
import { Scene02 } from "./scenes/Scene02";
import { Scene03 } from "./scenes/Scene03";
import { Scene04 } from "./scenes/Scene04";
import { Scene05 } from "./scenes/Scene05";
import { Scene06 } from "./scenes/Scene06";
import { Scene07 } from "./scenes/Scene07";
import { Scene08 } from "./scenes/Scene08";
import { Scene09 } from "./scenes/Scene09";
import { Scene10 } from "./scenes/Scene10";
import { C, SCENES, TOTAL_FRAMES, sec } from "./theme";

export type Episodio1Props = {
  assets: AssetFlags;
  subtitles: Word[];
};

const COMPONENTS = [Scene01, Scene02, Scene03, Scene04, Scene05, Scene06, Scene07, Scene08, Scene09, Scene10];

/** Cortes con barrido rápido. A los 200 s es corte seco a negro (escena 7). */
const WIPES = SCENES.slice(1)
  .map((s) => s.from)
  .filter((t) => t !== 200);

export const Episodio1: React.FC<Episodio1Props> = ({ assets, subtitles }) => (
  <AssetsContext.Provider value={assets}>
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {SCENES.map((s, i) => {
        const Comp = COMPONENTS[i];
        return (
          <Sequence key={s.name} name={s.name} from={sec(s.from)} durationInFrames={sec(s.to - s.from)}>
            <Comp />
          </Sequence>
        );
      })}

      {WIPES.map((t) => (
        <Wipe key={t} at={sec(t)} />
      ))}

      <Subtitles words={subtitles} />

      {assets.voz ? <Audio src={staticFile("voz.mp3")} volume={1} /> : null}
      {assets.musica ? (
        <Audio
          src={staticFile("musica.mp3")}
          loop
          volume={(f) =>
            interpolate(f, [0, 30, TOTAL_FRAMES - 90, TOTAL_FRAMES], [0, 0.18, 0.18, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  </AssetsContext.Provider>
);
