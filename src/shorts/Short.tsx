import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { AssetFlags } from "../components/assets";
import { Subtitles, Word } from "../components/Subtitles";
import { Wipe } from "../components/Wipe";
import { Episodio1 } from "../Episodio1";
import { C, DISPLAY, MONO } from "../theme";
import { CLIPS } from "./clips";

export type ShortProps = {
  clipId: string;
  assets: AssetFlags;
  subtitles: Word[];
};

export const SHORT_W = 1080;
export const SHORT_H = 1920;
const SCALE = SHORT_W / 1920; // el episodio 16:9 a todo el ancho
const VIDEO_TOP = 640;

/** Convierte tramos en segundos a frames, con su posición en el short */
export const layoutSegments = (clipId: string, fps: number) => {
  const clip = CLIPS.find((c) => c.id === clipId);
  if (!clip) throw new Error(`Clip desconocido: ${clipId}`);
  let at = 0;
  const segs = clip.segments.map(([a, b]) => {
    const from = Math.round(a * fps);
    const len = Math.round(b * fps) - from;
    const s = { from, len, at };
    at += len;
    return s;
  });
  return { clip, segs, total: at };
};

export const Short: React.FC<ShortProps> = ({ clipId, assets, subtitles }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { clip, segs } = layoutSegments(clipId, fps);

  // tiempo del episodio que se ve ahora (para los subtítulos)
  const cur = segs.find((s) => frame >= s.at && frame < s.at + s.len) ?? segs[segs.length - 1];
  const srcMs = ((cur.from + (frame - cur.at)) / fps) * 1000;

  const hookIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
  });
  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* Episodio, tramo por tramo, con su audio */}
      <div
        style={{
          position: "absolute",
          top: VIDEO_TOP,
          left: 0,
          width: 1920,
          height: 1080,
          transform: `scale(${SCALE})`,
          transformOrigin: "top left",
          overflow: "hidden",
        }}
      >
        {segs.map((s, i) => (
          <Sequence key={i} from={s.at} durationInFrames={s.len} name={`Tramo ${i + 1}`}>
            <Sequence from={-s.from} layout="none">
              <Episodio1 assets={assets} subtitles={subtitles} hideSubtitles />
            </Sequence>
          </Sequence>
        ))}
      </div>

      {/* Gancho arriba */}
      <div style={{ position: "absolute", top: 150, left: 70, right: 70, opacity: hookIn }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: C.dim }}>
          DATOS QUE DUELEN · EP. 1
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 82, lineHeight: 1.08, color: C.fg, marginTop: 24 }}>
          {clip.hook.map((h, i) => (
            <span key={i} style={{ color: h.red ? C.accent : C.fg }}>
              {h.text}
            </span>
          ))}
        </div>
      </div>

      {/* Subtítulos grandes debajo del video */}
      <Subtitles words={subtitles} timeMs={srcMs} top={VIDEO_TOP + 607 + 90} fontSize={64} maxWords={4} maxWidth={980} />

      {/* Barrido en cada salto entre tramos */}
      {segs.slice(1).map((s) => (
        <Wipe key={s.at} at={s.at} half={6} />
      ))}

      {/* Barra de progreso */}
      <div style={{ position: "absolute", left: 0, top: 0, height: 8, width: `${progress * 100}%`, backgroundColor: C.fg }} />

      <AbsoluteFill style={{ backgroundColor: C.black, opacity: fadeOut }} />
    </AbsoluteFill>
  );
};
