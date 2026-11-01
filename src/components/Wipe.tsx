import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";

/** Barrido rápido centrado en el frame `at` (cubre la pantalla justo en el corte) */
export const Wipe: React.FC<{ at: number; half?: number }> = ({ at, half = 7 }) => {
  const frame = useCurrentFrame();
  if (frame < at - half || frame > at + half) return null;
  const x = interpolate(frame, [at - half, at, at + half], [-115, 0, 115], {
    easing: Easing.inOut(Easing.quad),
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "-10%",
        width: "120%",
        backgroundColor: C.fg,
        transform: `translateX(${x}%) skewX(-12deg)`,
      }}
    />
  );
};
