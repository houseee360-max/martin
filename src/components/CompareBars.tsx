import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, DISPLAY, MONO, WIDTH, fmt } from "../theme";
import { Sfx } from "./assets";

export type CompareItem = {
  label: string;
  value: number;
  prefix?: string;
  pct?: number;
  negative?: boolean;
  /** Frame (relativo) en que empieza a crecer */
  delay: number;
};

/**
 * Barras horizontales que pueden salirse de la pantalla;
 * la cámara sigue la punta de la barra más larga.
 */
export const CompareBars: React.FC<{
  items: CompareItem[];
  /** px por unidad de valor */
  scale: number;
  growDuration?: number;
  reference?: { value: number; label: string };
  left?: number;
  top?: number;
  barHeight?: number;
  spacing?: number;
  /** Espacio que se reserva a la derecha de la punta antes de mover la cámara */
  rightMargin?: number;
}> = ({
  items,
  scale,
  growDuration = 75,
  reference,
  left = 120,
  top = 230,
  barHeight = 96,
  spacing = 190,
  rightMargin = 520,
}) => {
  const frame = useCurrentFrame();
  const progressOf = (it: CompareItem) =>
    interpolate(frame, [it.delay, it.delay + growDuration], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
  const tips = items.map((it) => left + it.value * scale * progressOf(it));
  const maxTip = Math.max(...tips);
  const camera = Math.max(0, maxTip - (WIDTH - rightMargin));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${-camera}px)`,
        }}
      >
        {reference ? (
          <div
            style={{
              position: "absolute",
              left: left + reference.value * scale,
              top: top - 70,
              height: spacing * (items.length - 1) + barHeight + 100,
              borderLeft: `4px dashed ${C.dim}`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -36,
                left: -4,
                fontFamily: MONO,
                fontSize: 24,
                letterSpacing: 3,
                color: C.dim,
                whiteSpace: "nowrap",
              }}
            >
              {reference.label}
            </div>
          </div>
        ) : null}
        {items.map((it, i) => {
          const p = progressOf(it);
          const color = it.negative ? C.accent : C.fg;
          const y = top + i * spacing;
          const len = it.value * scale * p;
          const appear = interpolate(frame, [it.delay - 10, it.delay], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div key={it.label} style={{ opacity: appear }}>
              <Sfx name="subida" from={it.delay} volume={0.45} />
              <Sfx name="golpe" from={it.delay + growDuration} volume={0.5} />
              <div
                style={{
                  position: "absolute",
                  top: y - 46,
                  // Etiqueta "pegajosa": se queda en pantalla aunque la barra se salga
                  left: Math.max(left, camera + 64),
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: 4,
                  color: C.fg,
                  whiteSpace: "nowrap",
                }}
              >
                {it.label}
              </div>
              <div
                style={{
                  position: "absolute",
                  left,
                  top: y,
                  width: len,
                  height: barHeight,
                  backgroundColor: color,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: left + len + 28,
                  top: y + barHeight / 2,
                  transform: "translateY(-50%)",
                  fontFamily: DISPLAY,
                  fontSize: 58,
                  color,
                  whiteSpace: "nowrap",
                }}
              >
                {it.prefix ?? ""}
                {fmt(it.value * p)}
                {it.pct !== undefined ? (
                  <span style={{ fontSize: 40 }}>{`  ${fmt(it.pct * p)}%`}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
