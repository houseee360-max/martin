import React from "react";
import { AbsoluteFill } from "remotion";
import { DISPLAY } from "../theme";
import { EnchufeRobot } from "./EnchufeRobot";

/** Portada vertical (TikTok / YouTube Shorts): robot pedaleando + texto grande */
export const PortadaEnchufe: React.FC<{ variante: "tiktok" | "youtube" }> = ({ variante }) => {
  const borde = "-6px -6px 0 #000, 6px -6px 0 #000, -6px 6px 0 #000, 6px 6px 0 #000, 0 6px 0 #000, 0 -6px 0 #000, 6px 0 0 #000, -6px 0 0 #000, 0 14px 30px rgba(0,0,0,.6)";
  const amarillo = "#FFD21F";
  return (
    <AbsoluteFill>
      <EnchufeRobot clip={10} />
      {/* Oscurecer arriba para que el texto resalte */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.15) 38%, transparent 55%)" }} />
      <div style={{ position: "absolute", left: 40, right: 40, top: 190, textAlign: "center", fontFamily: DISPLAY, color: "#fff", textShadow: borde, lineHeight: 1.02 }}>
        {variante === "tiktok" ? (
          <>
            <div style={{ fontSize: 112 }}>¿QUÉ HAY</div>
            <div style={{ fontSize: 172, color: amarillo }}>DENTRO</div>
            <div style={{ fontSize: 112 }}>DEL ENCHUFE?</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 104 }}>LO QUE VIVE</div>
            <div style={{ fontSize: 160, color: amarillo }}>DENTRO</div>
            <div style={{ fontSize: 104 }}>DE TU ENCHUFE</div>
          </>
        )}
      </div>
      {/* Flecha hacia el robot */}
      <svg viewBox="0 0 200 200" width={230} height={230} style={{ position: "absolute", left: 110, top: 840, transform: "rotate(10deg)", filter: "drop-shadow(0 8px 14px rgba(0,0,0,.5))" }}>
        <path d="M30 20 C 60 90, 100 120, 150 150" stroke="#000" strokeWidth="30" fill="none" strokeLinecap="round" />
        <path d="M120 165 L160 158 L148 118" stroke="#000" strokeWidth="30" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30 20 C 60 90, 100 120, 150 150" stroke={amarillo} strokeWidth="16" fill="none" strokeLinecap="round" />
        <path d="M120 165 L160 158 L148 118" stroke={amarillo} strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};
