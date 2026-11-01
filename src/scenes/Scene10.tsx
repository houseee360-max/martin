import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useAssets } from "../components/assets";
import { CalendarFill } from "../components/CalendarFill";
import { SourceTag } from "../components/SourceTag";
import { Center, FadeIn, Headline, Label, Scene, SlowZoom } from "../components/ui";
import { CHILE, SOURCES } from "../data";
import { C, DISPLAY } from "../theme";

const Logo: React.FC = () => {
  const assets = useAssets();
  if (assets.logo) return <Img src={staticFile("logo.png")} style={{ height: 150 }} />;
  return (
    <div>
      <Label style={{ fontSize: 24 }}>Episodio 1</Label>
      <div style={{ fontFamily: DISPLAY, fontSize: 58, color: C.fg, lineHeight: 1.05 }}>
        DATOS QUE
        <br />
        <span style={{ color: C.accent }}>DUELEN</span>
      </div>
    </div>
  );
};

// 330–360 s · 900 frames
export const Scene10: React.FC = () => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [860, 900], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Scene>
      <Center style={{ flexDirection: "row", gap: 120, paddingBottom: 90 }}>
        <CalendarFill upTo={CHILE.dias} delay={12} perDay={3} cell={96} />
        <div style={{ display: "flex", flexDirection: "column", gap: 60, width: 760 }}>
          <FadeIn from={100}>
            <Logo />
          </FadeIn>
          <FadeIn from={170}>
            <SlowZoom duration={680} delay={170} to={1.06}>
              <Headline size={112}>¿Cuánto pagas tú?</Headline>
            </SlowZoom>
          </FadeIn>
        </div>
      </Center>
      <SourceTag>Cálculo: 61% de 30 días · {SOURCES.clinic}</SourceTag>
      <AbsoluteFill style={{ backgroundColor: C.black, opacity: out }} />
    </Scene>
  );
};
