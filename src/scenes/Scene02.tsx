import React from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../components/counter";
import { BigNumber } from "../components/BigNumber";
import { SalaryBar } from "../components/SalaryBar";
import { SourceTag } from "../components/SourceTag";
import { Center, FadeIn, Scene } from "../components/ui";
import { CHILE, SOURCES } from "../data";

export const CHILE_RATIO = CHILE.arriendo / CHILE.sueldoMinimo;

// 8–25 s · 510 frames
export const Scene02: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Scene>
      <Center style={{ justifyContent: "flex-start", paddingTop: 120, gap: 90 }}>
        <BigNumber
          value={CHILE.sueldoMinimo}
          prefix="$"
          fontSize={150}
          label="Sueldo mínimo · Chile"
          delay={10}
          zoomDuration={500}
          zoomTo={1.06}
        />
        <FadeIn from={60}>
          <SalaryBar
            ratio={CHILE_RATIO}
            rentProgress={progress(frame, 150, 90)}
            rentLabel="ARRIENDO"
            restLabel="RESTO"
            endLabel="$553.553"
          />
        </FadeIn>
      </Center>
      <SourceTag>{SOURCES.clinic}</SourceTag>
    </Scene>
  );
};
