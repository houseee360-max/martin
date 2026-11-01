import React from "react";
import { CalculateMetadataFunction, Composition, Folder } from "remotion";
import { NO_ASSETS } from "./components/assets";
import { Episodio1, Episodio1Props } from "./Episodio1";
import { loadMedia } from "./metadata";
import { CLIPS } from "./shorts/clips";
import { layoutSegments, Short, SHORT_H, SHORT_W, ShortProps } from "./shorts/Short";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./theme";

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
