import React from "react";
import { useCurrentFrame } from "remotion";
import { BigNumber } from "../components/BigNumber";
import { progress } from "../components/counter";
import { SalaryBar } from "../components/SalaryBar";
import { SourceTag } from "../components/SourceTag";
import { Center, FadeIn, Scene } from "../components/ui";
import { CHILE, SOURCES } from "../data";
import { CHILE_RATIO } from "./Scene02";

// 100–150 s · 1500 frames
export const Scene05: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene>
      <Center style={{ justifyContent: "flex-start", paddingTop: 110, gap: 150 }}>
        <BigNumber
          value={CHILE.treinta}
          prefix="$"
          fontSize={230}
          label="30% del sueldo mínimo"
          delay={90}
          countDuration={60}
          zoomDuration={1400}
          zoomTo={1.1}
        />
        <FadeIn from={0}>
          <SalaryBar
            ratio={CHILE_RATIO}
            thirty={progress(frame, 30, 45)}
            thirtyLabel="30% = $166.000"
            rentLabel="ARRIENDO 61%"
            restLabel="RESTO"
          />
        </FadeIn>
      </Center>
      <SourceTag>Cálculo: 30% de $553.553 · {SOURCES.clinic}</SourceTag>
    </Scene>
  );
};
