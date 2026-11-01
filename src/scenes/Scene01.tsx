import React from "react";
import { Sequence } from "remotion";
import { BigNumber } from "../components/BigNumber";
import { CalendarFill } from "../components/CalendarFill";
import { SourceTag } from "../components/SourceTag";
import { Center, FadeIn, Headline, Label, Scene, SlowZoom } from "../components/ui";
import { CHILE, SOURCES } from "../data";
import { C } from "../theme";

// 0–8 s · 240 frames
export const Scene01: React.FC = () => (
  <Scene>
    <Sequence durationInFrames={112} name="18 gigante">
      <Center>
        <FadeIn to={112} y={0} dur={10}>
          <BigNumber value={CHILE.dias} negative fontSize={560} countDuration={40} zoomDuration={112} zoomTo={1.15} />
        </FadeIn>
      </Center>
    </Sequence>
    <Sequence from={112} name="Calendario">
      <Center style={{ flexDirection: "row", gap: 110, paddingBottom: 90 }}>
        <CalendarFill upTo={CHILE.dias} delay={8} perDay={4} cell={112} />
        <FadeIn from={86} dur={10}>
          <SlowZoom duration={60} delay={86} to={1.08}>
            <Headline size={170}>
              <span style={{ color: C.accent }}>18</span>
              <br />
              DÍAS
            </Headline>
            <Label style={{ marginTop: 26 }}>de 30</Label>
          </SlowZoom>
        </FadeIn>
      </Center>
    </Sequence>
    <SourceTag>Cálculo: 61% de 30 días · {SOURCES.clinic}</SourceTag>
  </Scene>
);
