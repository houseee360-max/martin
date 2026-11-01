import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "../theme";
import { Sfx } from "./assets";

/** Calendario de 30 días que se tacha en rojo hasta `upTo` */
export const CalendarFill: React.FC<{
  upTo: number;
  delay?: number;
  /** Frames entre cada día tachado */
  perDay?: number;
  cell?: number;
  gap?: number;
  sound?: boolean;
}> = ({ upTo, delay = 0, perDay = 4, cell = 116, gap = 12, sound = true }) => {
  const frame = useCurrentFrame();
  const cols = 7;
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const appear = interpolate(frame, [delay - 12, delay], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
        gap,
        opacity: appear,
      }}
    >
      {days.map((d) => {
        const start = delay + (d - 1) * perDay;
        const crossed = d <= upTo;
        const p = crossed
          ? interpolate(frame, [start, start + 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          : 0;
        const len = Math.SQRT2 * (cell - 28);
        return (
          <div
            key={d}
            style={{
              width: cell,
              height: cell,
              position: "relative",
              border: `2px solid ${p > 0 ? C.accent : C.faint}`,
              backgroundColor: `rgba(255,77,46,${0.16 * p})`,
              boxSizing: "border-box",
            }}
          >
            {crossed && sound ? <Sfx name="tic" from={start} volume={0.45} /> : null}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 12,
                fontFamily: MONO,
                fontSize: 22,
                color: p > 0.5 ? C.accent : C.dim,
              }}
            >
              {String(d).padStart(2, "0")}
            </div>
            <svg
              width={cell}
              height={cell}
              style={{ position: "absolute", left: -2, top: -2 }}
            >
              {[
                [14, 14, cell - 14, cell - 14],
                [cell - 14, 14, 14, cell - 14],
              ].map(([x1, y1, x2, y2], i) => {
                const lp = interpolate(p, [i * 0.5, i * 0.5 + 0.5], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={C.accent}
                    strokeWidth={7}
                    strokeLinecap="round"
                    strokeDasharray={len}
                    strokeDashoffset={len * (1 - lp)}
                  />
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
};
