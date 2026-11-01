import React from "react";
import { useCurrentFrame } from "remotion";
import { countUp, progress } from "../components/counter";
import { SalaryBar } from "../components/SalaryBar";
import { SourceTag } from "../components/SourceTag";
import { FadeIn, Label, Scene } from "../components/ui";
import { CHILE, PERU, SOURCES } from "../data";
import { C, DISPLAY, fmt } from "../theme";
import { Sfx } from "../components/assets";

const BOTTOM = 770;
const LEN = 400;
const THICK = 210;

const Column: React.FC<{
  x: number;
  ratio: number;
  pct: number;
  rentLabel: string;
  title: string;
  start: number;
}> = ({ x, ratio, pct, rentLabel, title, start }) => {
  const frame = useCurrentFrame();
  const rp = progress(frame, start, 100);
  const redTop = LEN * ratio * rp;
  return (
    <>
      <Sfx name="subida" from={start} volume={0.45} />
      <Sfx name="golpe" from={start + 100} volume={0.55} />
      <div style={{ position: "absolute", left: x, top: BOTTOM - LEN }}>
        <SalaryBar
          orientation="vertical"
          length={LEN}
          thickness={THICK}
          ratio={ratio}
          rentProgress={rp}
          thirty={progress(frame, 30, 40)}
          rentLabel={rentLabel}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: x - 100,
          width: THICK + 200,
          textAlign: "center",
          top: BOTTOM - Math.max(redTop, LEN) - 100,
          fontFamily: DISPLAY,
          fontSize: 76,
          color: C.accent,
          opacity: rp > 0 ? 1 : 0,
        }}
      >
        {fmt(countUp(frame, pct, { delay: start, duration: 100 }))}%
      </div>
      <FadeIn from={10} style={{ position: "absolute", left: x - 150, width: THICK + 300, top: BOTTOM + 22, textAlign: "center" }}>
        <Label style={{ color: C.fg, fontSize: 30 }}>{title}</Label>
      </FadeIn>
    </>
  );
};

// 280–330 s · 1500 frames
export const Scene09: React.FC = () => (
  <Scene>
    <FadeIn from={5} style={{ position: "absolute", top: 60, left: 0, right: 0, textAlign: "center" }}>
      <Label>Arriendo / sueldo mínimo · línea punteada = 30%</Label>
    </FadeIn>
    <Column
      x={500}
      ratio={CHILE.arriendo / CHILE.sueldoMinimo}
      pct={CHILE.porcentaje}
      rentLabel={`$${fmt(CHILE.arriendo)}`}
      title={`Chile · $${fmt(CHILE.sueldoMinimo)}`}
      start={60}
    />
    <Column
      x={1210}
      ratio={PERU.losOlivosSur.valor / PERU.sueldoMinimo}
      pct={PERU.losOlivosSur.pct}
      rentLabel={`S/ ${fmt(PERU.losOlivosSur.valor)}`}
      title={`Perú · S/ ${fmt(PERU.sueldoMinimo)}`}
      start={220}
    />
    <SourceTag>
      {SOURCES.clinic} · {SOURCES.peruano} · {SOURCES.urbania} · Perú: Los Olivos Sur, {PERU.aclaracion}
    </SourceTag>
  </Scene>
);
