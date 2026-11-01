import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, DISPLAY, MONO } from "../theme";

export const Scene: React.FC<{ children: React.ReactNode; bg?: string }> = ({
  children,
  bg = C.bg,
}) => <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>{children}</AbsoluteFill>;

export const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", ...style }}>
    {children}
  </AbsoluteFill>
);

/** Aparece entre [from, from+dur) y desaparece en [to-dur, to) */
export const FadeIn: React.FC<{
  from?: number;
  to?: number;
  dur?: number;
  y?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ from = 0, to, dur = 12, y = 30, children, style }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [from, from + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const outP =
    to === undefined
      ? 1
      : interpolate(frame, [to - dur, to], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  if (to !== undefined && frame >= to) return null;
  return (
    <div style={{ opacity: inP * outP, transform: `translateY(${(1 - inP) * y}px)`, ...style }}>
      {children}
    </div>
  );
};

export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      fontFamily: MONO,
      fontWeight: 700,
      fontSize: 34,
      letterSpacing: 6,
      color: C.dim,
      textTransform: "uppercase",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Headline: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, size = 140, color = C.fg, style }) => (
  <div style={{ fontFamily: DISPLAY, fontSize: size, lineHeight: 1, color, ...style }}>
    {children}
  </div>
);

/** Signo ≠ dibujado (la fuente no trae el glifo) */
export const NotEqual: React.FC<{ size: number; color?: string }> = ({ size, color = C.fg }) => {
  const w = size * 0.62;
  const t = size * 0.11;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: w,
        height: size * 0.6,
        margin: `0 ${size * 0.2}px`,
        verticalAlign: "middle",
      }}
    >
      {[0.18, 0.62].map((top) => (
        <span
          key={top}
          style={{
            position: "absolute",
            left: 0,
            width: w,
            top: size * 0.6 * top - t / 2,
            height: t,
            background: color,
          }}
        />
      ))}
      <span
        style={{
          position: "absolute",
          left: w / 2 - t / 2,
          top: -size * 0.08,
          width: t,
          height: size * 0.76,
          background: color,
          transform: "rotate(30deg)",
        }}
      />
    </span>
  );
};

/** Acercamiento lento genérico */
export const SlowZoom: React.FC<{
  duration: number;
  to?: number;
  delay?: number;
  children: React.ReactNode;
}> = ({ duration, to = 1.08, delay = 0, children }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [delay, delay + duration], [1, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  return <div style={{ transform: `scale(${s})` }}>{children}</div>;
};
