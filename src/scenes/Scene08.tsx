import React from "react";
import { Sequence } from "remotion";
import { BigNumber } from "../components/BigNumber";
import { CompareBars } from "../components/CompareBars";
import { SourceTag } from "../components/SourceTag";
import { Center, FadeIn, Label, Scene } from "../components/ui";
import { PERU, SOURCES } from "../data";

// 220–280 s · 1800 frames
export const Scene08: React.FC = () => (
  <Scene>
    <Sequence durationInFrames={480} name="S/ 1.230">
      <Center style={{ paddingBottom: 120 }}>
        <FadeIn to={480} y={0}>
          <BigNumber value={PERU.sueldoMinimo} prefix="S/ " fontSize={300} label="Sueldo mínimo · Perú" delay={6} countDuration={55} zoomDuration={480} />
        </FadeIn>
      </Center>
      <SourceTag>{SOURCES.peruano}</SourceTag>
    </Sequence>
    <Sequence from={480} durationInFrames={540} name="Los Olivos Sur 129%">
      <Center style={{ paddingBottom: 120, gap: 30 }}>
        <FadeIn to={540} y={0}>
          <BigNumber value={PERU.losOlivosSur.valor} prefix="S/ " negative fontSize={260} label="Arriendo · Los Olivos Sur" delay={6} countDuration={55} zoomDuration={540} zoomTo={1.08} />
        </FadeIn>
        <FadeIn from={90} to={540}>
          <BigNumber value={PERU.losOlivosSur.pct} prefix="= " suffix="%" negative fontSize={150} delay={95} countDuration={45} zoomDuration={440} zoomTo={1.1} sublabel="del sueldo mínimo" />
        </FadeIn>
      </Center>
      <FadeIn from={60} style={{ position: "absolute", right: 64, bottom: 36 }}>
        <Label style={{ fontSize: 22, letterSpacing: 2 }}>* {PERU.aclaracion}</Label>
      </FadeIn>
      <SourceTag>{SOURCES.peruano} · {SOURCES.urbania}</SourceTag>
    </Sequence>
    <Sequence from={1020} name="CompareBars Lima">
      <FadeIn from={5} style={{ position: "absolute", top: 70, left: 120 }}>
        <Label>Arriendo vs. sueldo mínimo · Lima</Label>
      </FadeIn>
      <CompareBars
        scale={640 / PERU.sueldoMinimo}
        reference={{ value: PERU.sueldoMinimo, label: "100%" }}
        growDuration={90}
        items={[
          { label: "SUELDO MÍNIMO", value: PERU.sueldoMinimo, prefix: "S/ ", delay: 20 },
          { label: "LOS OLIVOS SUR", value: PERU.losOlivosSur.valor, pct: PERU.losOlivosSur.pct, prefix: "S/ ", negative: true, delay: 180 },
          { label: "PROMEDIO LIMA", value: PERU.promedioLima, prefix: "S/ ", negative: true, delay: 360 },
        ]}
      />
      <FadeIn from={60} style={{ position: "absolute", right: 64, bottom: 36 }}>
        <Label style={{ fontSize: 22, letterSpacing: 2 }}>* {PERU.aclaracion}</Label>
      </FadeIn>
      <SourceTag>{SOURCES.peruano} · {SOURCES.urbania}</SourceTag>
    </Sequence>
  </Scene>
);
