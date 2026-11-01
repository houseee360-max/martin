import React from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../components/counter";
import { SalaryBar } from "../components/SalaryBar";
import { SourceTag } from "../components/SourceTag";
import { Center, FadeIn, Headline, NotEqual, Scene, SlowZoom } from "../components/ui";
import { SOURCES } from "../data";
import { CHILE_RATIO } from "./Scene02";

// 65–100 s · 1050 frames
export const Scene04: React.FC = () => {
  const frame = useCurrentFrame();
  // El bloque blanco se achica (bruto -> líquido). Ilustrativo, sin cifra.
  const liquid = 1 - 0.2 * progress(frame, 150, 210);
  return (
    <Scene>
      <Center style={{ justifyContent: "flex-start", paddingTop: 150, gap: 130 }}>
        <FadeIn from={20}>
          <SlowZoom duration={1000} delay={20} to={1.08}>
            <Headline size={150}>
              BRUTO
              <NotEqual size={150} />
              LÍQUIDO
            </Headline>
          </SlowZoom>
        </FadeIn>
        <SalaryBar
          ratio={CHILE_RATIO}
          liquid={liquid}
          rentLabel="ARRIENDO"
          restLabel="RESTO"
          endLabel="BRUTO"
          liquidLabel={liquid < 0.97 ? "LÍQUIDO" : undefined}
        />
      </Center>
      <SourceTag>Sueldo mínimo bruto · {SOURCES.clinic}</SourceTag>
    </Scene>
  );
};
