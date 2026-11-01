import { Easing, interpolate } from "remotion";

/** Contador que sube con easing de salida */
export const countUp = (
  frame: number,
  to: number,
  { from = 0, delay = 0, duration = 45 }: { from?: number; delay?: number; duration?: number } = {},
) =>
  interpolate(frame, [delay, delay + duration], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

export const progress = (frame: number, start: number, duration: number, easing = Easing.inOut(Easing.cubic)) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
