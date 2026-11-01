import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "../theme";

/** Texto de fuente, letra chica, abajo a la izquierda */
export const SourceTag: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 10,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        bottom: 36,
        fontFamily: MONO,
        fontSize: 20,
        letterSpacing: 1,
        color: C.dim,
        opacity,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
};
