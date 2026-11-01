import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Sfx } from "../components/assets";
import { FadeIn, Headline, Label, Scene, SlowZoom } from "../components/ui";
import { C } from "../theme";

/** Punta de flecha en `tip`, orientada según la tangente desde `ctrl` */
const arrowHead = (tip: { x: number; y: number }, ctrl: { x: number; y: number }) => {
  const a = Math.atan2(tip.y - ctrl.y, tip.x - ctrl.x);
  const len = 46;
  const w = 0.45;
  const p1 = [tip.x - len * Math.cos(a - w), tip.y - len * Math.sin(a - w)];
  const p2 = [tip.x - len * Math.cos(a + w), tip.y - len * Math.sin(a + w)];
  return `${tip.x},${tip.y} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`;
};

// 200–220 s · 600 frames — corte a negro, flecha Chile -> Perú
export const Scene07: React.FC = () => {
  const frame = useCurrentFrame();
  const S = { x: 1360, y: 800 };
  const L = { x: 560, y: 430 };
  const path = `M ${S.x} ${S.y} Q 1000 960 ${L.x} ${L.y}`;
  const len = 1100;
  const p = interpolate(frame, [30, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dot = (x: number, y: number, o: number) => (
    <circle cx={x} cy={y} r={16} fill={C.fg} opacity={o} />
  );
  return (
    <Scene bg={C.black}>
      <Sfx name="golpe" from={0} volume={0.7} />
      <Sfx name="subida" from={30} volume={0.5} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {dot(S.x, S.y, interpolate(frame, [8, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}
        <path
          d={path}
          fill="none"
          stroke={C.fg}
          strokeWidth={6}
          strokeDasharray={`${len}`}
          strokeDashoffset={len * (1 - p)}
          strokeLinecap="round"
        />
        {p >= 1 ? (
          <polygon points={arrowHead(L, { x: 1000, y: 960 })} fill={C.fg} />
        ) : null}
        
      </svg>
      <FadeIn from={10} style={{ position: "absolute", left: S.x + 36, top: S.y - 20 }}>
        <Label>Santiago · Chile</Label>
      </FadeIn>
      <FadeIn from={120} style={{ position: "absolute", left: L.x - 60, top: L.y + 60 }}>
        <Label>Perú</Label>
      </FadeIn>
      <FadeIn from={125} y={0} style={{ position: "absolute", left: 760, top: 150 }}>
        <SlowZoom duration={470} delay={125} to={1.12}>
          <Headline size={280}>LIMA</Headline>
        </SlowZoom>
      </FadeIn>
      <Sfx name="golpe" from={125} volume={0.6} />
    </Scene>
  );
};
