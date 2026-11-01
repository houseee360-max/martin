import React from "react";
import { CompareBars } from "../components/CompareBars";
import { SourceTag } from "../components/SourceTag";
import { FadeIn, Label, Scene } from "../components/ui";
import { CHILE, SOURCES } from "../data";

// 150–200 s · 1500 frames
export const Scene06: React.FC = () => (
  <Scene>
    <FadeIn from={5} style={{ position: "absolute", top: 70, left: 120 }}>
      <Label>Arriendo vs. sueldo mínimo · Santiago</Label>
    </FadeIn>
    <CompareBars
      scale={1050 / CHILE.sueldoMinimo}
      reference={{ value: CHILE.sueldoMinimo, label: "100%" }}
      items={[
        { label: "SUELDO MÍNIMO", value: CHILE.sueldoMinimo, prefix: "$", delay: 30 },
        {
          label: "ESTACIÓN CENTRAL",
          value: CHILE.estacionCentral.valor,
          pct: CHILE.estacionCentral.pct,
          prefix: "$",
          negative: true,
          delay: 240,
        },
        {
          label: "PROVIDENCIA",
          value: CHILE.providencia.valor,
          pct: CHILE.providencia.pct,
          prefix: "$",
          negative: true,
          delay: 480,
        },
      ]}
      growDuration={90}
    />
    <SourceTag>{SOURCES.clinic}</SourceTag>
  </Scene>
);
