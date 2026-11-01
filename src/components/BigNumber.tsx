import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, DISPLAY, MONO, fmt } from "../theme";
import { Sfx } from "./assets";
import { countUp } from "./counter";

/** Número gigante con contador animado y acercamiento lento */
export const BigNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  negative?: boolean;
  fontSize?: number;
  label?: string;
  sublabel?: React.ReactNode;
  delay?: number;
  countDuration?: number;
  /** Frames que dura el acercamiento lento */
  zoomDuration?: number;
  zoomTo?: number;
  sound?: boolean;
  style?: React.CSSProperties;
}> = ({
  value,
  prefix = "",
  suffix = "",
  negative = false,
  fontSize = 300,
  label,
  sublabel,
  delay = 0,
  countDuration = 45,
  zoomDuration = 300,
  zoomTo = 1.12,
  sound = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const current = countUp(frame, value, { delay, duration: countDuration });
  const zoom = interpolate(frame, [delay, delay + zoomDuration], [1, zoomTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  const appear = interpolate(frame, [delay, delay + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const landed = frame - (delay + countDuration);
  const punch = landed >= 0 && landed < 10 ? 1 + 0.04 * (1 - landed / 10) : 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: appear,
        ...style,
      }}
    >
      {sound ? <Sfx name="subida" from={delay} volume={0.5} /> : null}
      {sound ? <Sfx name="golpe" from={delay + countDuration} volume={0.6} /> : null}
      {label ? (
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: 6,
            color: C.dim,
            marginBottom: 10,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize,
          lineHeight: 1,
          color: negative ? C.accent : C.fg,
          transform: `scale(${zoom * punch})`,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {prefix}
        {fmt(current)}
        {suffix}
      </div>
      {sublabel ? (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 30,
            color: C.fg,
            marginTop: 24,
            letterSpacing: 2,
          }}
        >
          {sublabel}
        </div>
      ) : null}
    </div>
  );
};
