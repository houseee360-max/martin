import React from "react";
import { CalculateMetadataFunction, Composition, Folder } from "remotion";
import { NO_ASSETS } from "./components/assets";
import { Episodio1, Episodio1Props } from "./Episodio1";
import { loadMedia } from "./metadata";
import { CLIPS } from "./shorts/clips";
import { layoutSegments, Short, SHORT_H, SHORT_W, ShortProps } from "./shorts/Short";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./theme";
import { Propuesta, PROP_FPS, PROP_H, PROP_TOTAL, PROP_W } from "./propuesta/Propuesta";
import { ReelCelular, RC_FPS, RC_H, RC_TOTAL, RC_W } from "./reel-celular/ReelCelular";
import { ReelLunes, RL_FPS, RL_H, RL_TOTAL, RL_W } from "./reel-lunes/ReelLunes";
import { EnchufeRobot, ER_DUR, ER_FPS, ER_H, ER_W } from "./enchufe/EnchufeRobot";
import { Enchufe3D, EN_DUR, EN_FPS, EN_H, EN_W } from "./enchufe/Enchufe3D";
import { ReelCorazon, RCZ_FPS, RCZ_H, RCZ_TOTAL, RCZ_W } from "./reel-corazon/ReelCorazon";
import { ReelTrabajo, RT_FPS, RT_H, RT_TOTAL, RT_W } from "./reel-trabajo/ReelTrabajo";

const episodioMetadata: CalculateMetadataFunction<Episodio1Props> = async ({ props }) => ({
  props: { ...props, ...(await loadMedia(props.subtitles)) },
});

const shortMetadata: CalculateMetadataFunction<ShortProps> = async ({ props }) => ({
  durationInFrames: layoutSegments(props.clipId, FPS).total,
  props: { ...props, ...(await loadMedia(props.subtitles)) },
});

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Episodio1"
      component={Episodio1}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ assets: NO_ASSETS, subtitles: [] }}
      calculateMetadata={episodioMetadata}
    />
    <Composition
      id="PropuestaFredes"
      component={Propuesta}
      durationInFrames={PROP_TOTAL}
      fps={PROP_FPS}
      width={PROP_W}
      height={PROP_H}
    />
    <Composition
      id="PropuestaFredesSinVoz"
      component={Propuesta}
      durationInFrames={PROP_TOTAL}
      fps={PROP_FPS}
      width={PROP_W}
      height={PROP_H}
      defaultProps={{ conVoz: false }}
    />
    <Composition
      id="ReelCelular"
      component={ReelCelular}
      durationInFrames={RC_TOTAL}
      fps={RC_FPS}
      width={RC_W}
      height={RC_H}
    />
    <Composition
      id="ReelLunes"
      component={ReelLunes}
      durationInFrames={RL_TOTAL}
      fps={RL_FPS}
      width={RL_W}
      height={RL_H}
    />
    <Composition
      id="ReelTrabajo"
      component={ReelTrabajo}
      durationInFrames={RT_TOTAL}
      fps={RT_FPS}
      width={RT_W}
      height={RT_H}
    />
    <Composition
      id="ReelCorazon"
      component={ReelCorazon}
      durationInFrames={RCZ_TOTAL}
      fps={RCZ_FPS}
      width={RCZ_W}
      height={RCZ_H}
    />
    <Folder name="Enchufe">
      {[1, 2, 3, 4, 5, 6, 7].map((c) => (
        <Composition key={c} id={`Enchufe-${c}`} component={Enchufe3D} durationInFrames={EN_DUR} fps={EN_FPS} width={EN_W} height={EN_H} defaultProps={{ clip: c }} />
      ))}
    </Folder>
    <Folder name="EnchufeRobot">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => (
        <Composition key={c} id={`Robot-${c}`} component={EnchufeRobot} durationInFrames={ER_DUR[c]} fps={ER_FPS} width={ER_W} height={ER_H} defaultProps={{ clip: c }} />
      ))}
    </Folder>
    <Folder name="Shorts">
      {CLIPS.map((c) => (
        <Composition
          key={c.id}
          id={c.id}
          component={Short}
          durationInFrames={300}
          fps={FPS}
          width={SHORT_W}
          height={SHORT_H}
          defaultProps={{ clipId: c.id, assets: NO_ASSETS, subtitles: [] }}
          calculateMetadata={shortMetadata}
        />
      ))}
    </Folder>
  </>
);
