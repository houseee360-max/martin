import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile } from "remotion";
import { DISPLAY, MONO } from "../theme";
import { Oraculo } from "./Oraculo";

/** Portada vertical: el ojo de ORÁCULO abierto + pregunta gancho + logo del canal */
export const PortadaOraculo: React.FC = () => {
  const borde = "-5px -5px 0 #000, 5px -5px 0 #000, -5px 5px 0 #000, 5px 5px 0 #000, 0 5px 0 #000, 0 -5px 0 #000, 5px 0 0 #000, -5px 0 0 #000";
  return (
    <AbsoluteFill style={{ background: "#04060a" }}>
      {/* cuadro del video con el ojo recién abierto */}
      <Sequence from={-331} layout="none">
        <AbsoluteFill style={{ transform: "translateY(60px) scale(1.12)" }}>
          <Oraculo />
        </AbsoluteFill>
      </Sequence>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,6,10,.92) 0%, rgba(4,6,10,.55) 30%, transparent 44%, transparent 72%, rgba(4,6,10,.9) 100%)" }} />
      <Img src={staticFile("marca/logo-horizontal-transparente.png")} style={{ position: "absolute", top: 90, left: 40, width: 620 }} />
      <div style={{ position: "absolute", top: 330, left: 30, right: 30, textAlign: "center", fontFamily: DISPLAY, lineHeight: 1 }}>
        <div style={{ fontSize: 132, color: "#fff", textShadow: `${borde}, 6px 0 #ff2a3a, -6px 0 #3fd8ff` }}>¿Y SI NO FUE</div>
        <div style={{ fontSize: 168, color: "#ff2a3a", marginTop: 10, textShadow: `${borde}, 0 0 40px rgba(255,42,58,.8)` }}>UNA FALLA?</div>
      </div>
      <div style={{ position: "absolute", bottom: 360, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "14px 30px", background: "#ff2a3a", fontFamily: DISPLAY, fontSize: 64, color: "#fff", transform: "rotate(-2deg)" }}>4 HORAS SIN CIELO</div>
        <div style={{ marginTop: 24, fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: "#39ff88" }}>▸ HISTORIA DE FICCIÓN</div>
      </div>
    </AbsoluteFill>
  );
};
