import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { BigNumber } from "../components/BigNumber";
import { SourceTag } from "../components/SourceTag";
import { Center, FadeIn, Label, Scene } from "../components/ui";
import { CHILE, SOURCES } from "../data";
import { C, DISPLAY, fmt } from "../theme";

// 25–65 s · 1200 frames
export const Scene03: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene>
      <Sequence durationInFrames={360} name="$553.553">
        <Center style={{ paddingBottom: 120 }}>
          <FadeIn to={360} y={0}>
            <BigNumber value={CHILE.sueldoMinimo} prefix="$" fontSize={330} label="Sueldo mínimo" delay={6} countDuration={60} zoomDuration={360} />
          </FadeIn>
        </Center>
      </Sequence>
      <Sequence from={360} durationInFrames={360} name="$340.000">
        <Center style={{ paddingBottom: 120 }}>
          <FadeIn to={360} y={0}>
            <BigNumber value={CHILE.arriendo} prefix="$" negative fontSize={330} label="Arriendo" delay={6} countDuration={60} zoomDuration={360} />
          </FadeIn>
        </Center>
      </Sequence>
      <Sequence from={720} name="División 61%">
        <Center style={{ paddingBottom: 120, gap: 40 }}>
          <FadeIn from={0}>
            <div style={{ fontFamily: DISPLAY, fontSize: 96, color: C.fg, display: "flex", gap: 40, alignItems: "center" }}>
              <span style={{ color: C.accent }}>${fmt(CHILE.arriendo)}</span>
              <span style={{ color: C.dim }}>÷</span>
              <span>${fmt(CHILE.sueldoMinimo)}</span>
            </div>
          </FadeIn>
          <FadeIn from={40}>
            <BigNumber value={CHILE.porcentaje} suffix="%" negative fontSize={380} delay={45} countDuration={50} zoomDuration={430} zoomTo={1.15} />
          </FadeIn>
          <FadeIn from={110}>
            <Label>del sueldo mínimo se va en arriendo</Label>
          </FadeIn>
        </Center>
      </Sequence>
      <SourceTag delay={frame < 360 ? 10 : 0}>{SOURCES.clinic}</SourceTag>
    </Scene>
  );
};
