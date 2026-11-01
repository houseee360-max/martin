import React from "react";
import { C, MONO } from "../theme";

type Orientation = "horizontal" | "vertical";

/**
 * Barra del sueldo dividida en arriendo (rojo) y resto (blanco),
 * con línea punteada del 30%.
 */
export const SalaryBar: React.FC<{
  /** Largo del sueldo completo (100%) en px */
  length?: number;
  thickness?: number;
  /** arriendo / sueldo (puede ser > 1) */
  ratio: number;
  /** 0..1 cuánto del arriendo está dibujado */
  rentProgress?: number;
  /** 0..1 fracción que queda del bloque (bruto -> líquido) */
  liquid?: number;
  /** 0..1 progreso de la línea del 30% (0 = oculta) */
  thirty?: number;
  thirtyLabel?: string;
  rentLabel?: string;
  restLabel?: string;
  /** Texto en el extremo del bloque completo (bruto) */
  endLabel?: string;
  /** Texto en el extremo del bloque blanco cuando se achica */
  liquidLabel?: string;
  orientation?: Orientation;
}> = ({
  length = 1400,
  thickness = 160,
  ratio,
  rentProgress = 1,
  liquid = 1,
  thirty = 0,
  thirtyLabel = "30%",
  rentLabel,
  restLabel,
  endLabel,
  liquidLabel,
  orientation = "horizontal",
}) => {
  const v = orientation === "vertical";
  const seg = (start: number, len: number, cross = 0, crossLen = thickness): React.CSSProperties =>
    v
      ? { position: "absolute", bottom: start, height: len, left: cross, width: crossLen }
      : { position: "absolute", left: start, width: len, top: cross, height: crossLen };

  const rentLen = length * ratio * rentProgress;
  const liquidLen = length * liquid;
  const restLen = Math.max(0, liquidLen - rentLen);
  const thirtyPos = length * 0.3;
  const labelStyle: React.CSSProperties = {
    fontFamily: MONO,
    fontWeight: 700,
    fontSize: 30,
    letterSpacing: 4,
    color: C.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        position: "relative",
        width: v ? thickness : length,
        height: v ? length : thickness,
      }}
    >
      {/* Descuentos: zona que se pierde entre bruto y líquido */}
      {liquid < 1 ? (
        <div
          style={{
            ...seg(liquidLen, length - liquidLen),
            backgroundImage: `repeating-linear-gradient(45deg, ${C.faint} 0 10px, transparent 10px 22px)`,
          }}
        />
      ) : null}
      {/* Resto (blanco) */}
      <div style={{ ...seg(rentLen, restLen), backgroundColor: C.fg, ...labelStyle }}>
        {restLabel && restLen > 160 ? restLabel : null}
      </div>
      {/* Arriendo (rojo) */}
      <div
        style={{
          ...seg(0, rentLen),
          backgroundColor: C.accent,
          ...labelStyle,
          ...(v ? { alignItems: "flex-start", paddingTop: 20 } : { justifyContent: "flex-end", paddingRight: 28 }),
          boxSizing: "border-box",
        }}
      >
        {rentLabel && rentLen > 160 ? rentLabel : null}
      </div>
      {/* Contorno del sueldo completo (100%), encima para ver lo que se sale */}
      <div
        style={{
          ...seg(0, length),
          border: `3px dashed ${C.fg}`,
          boxSizing: "border-box",
        }}
      />
      {/* Línea del 30% */}
      {thirty > 0 ? (
        <div
          style={
            v
              ? {
                  position: "absolute",
                  bottom: thirtyPos - 2,
                  left: -50,
                  width: (thickness + 100) * thirty,
                  borderTop: `5px dashed ${C.fg}`,
                  filter: "drop-shadow(0 0 2px #000)",
                }
              : {
                  position: "absolute",
                  left: thirtyPos - 2,
                  top: -70,
                  height: (thickness + 110) * thirty,
                  borderLeft: `5px dashed ${C.fg}`,
                  filter: "drop-shadow(0 0 2px #000)",
                }
          }
        >
          <div
            style={{
              position: "absolute",
              ...(v ? { left: thickness + 110, top: -22 } : { top: -50, left: -4 }),
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 30,
              color: C.fg,
              whiteSpace: "nowrap",
              opacity: thirty,
            }}
          >
            {thirtyLabel}
          </div>
        </div>
      ) : null}
      {endLabel ? (
        <div
          style={{
            position: "absolute",
            ...(v
              ? { bottom: length + 16, left: 0, width: thickness, textAlign: "center" }
              : { left: length - 300, width: 300, top: thickness + 18, textAlign: "right" }),
            fontFamily: MONO,
            fontSize: 26,
            letterSpacing: 3,
            color: C.dim,
          }}
        >
          {endLabel}
        </div>
      ) : null}
      {liquidLabel ? (
        <div
          style={{
            position: "absolute",
            ...(v
              ? { bottom: liquidLen - 40, left: thickness + 20 }
              : { left: liquidLen - 300, width: 300, top: thickness + 18, textAlign: "right" }),
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: 3,
            color: C.fg,
          }}
        >
          {liquidLabel}
        </div>
      ) : null}
    </div>
  );
};
