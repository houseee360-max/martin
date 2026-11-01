import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, MONO } from "../theme";

export type Word = { text: string; startMs: number; endMs: number };

/**
 * Normaliza public/subtitulos.json. Formatos aceptados:
 *  - [{ "text": "Hola", "start": 0.0, "end": 0.4 }]        (segundos)
 *  - [{ "text": "Hola", "startMs": 0, "endMs": 400 }]       (milisegundos, @remotion/captions)
 *  - { "words": [...] }  o  { "segments": [{ "words": [{ "word", "start", "end" }] }] }  (WhisperX)
 */
export const parseSubtitles = (raw: unknown): Word[] => {
  type Rec = Record<string, unknown>;
  let list: Rec[] = [];
  if (Array.isArray(raw)) list = raw as Rec[];
  else if (raw && typeof raw === "object") {
    const o = raw as Rec;
    if (Array.isArray(o.words)) list = o.words as Rec[];
    else if (Array.isArray(o.segments))
      list = (o.segments as Rec[]).flatMap((s) =>
        Array.isArray(s.words) ? (s.words as Rec[]) : [],
      );
  }
  const out: Word[] = [];
  for (const w of list) {
    const text = String(w.text ?? w.word ?? "").trim();
    if (!text) continue;
    const startMs =
      typeof w.startMs === "number" ? w.startMs : typeof w.start === "number" ? w.start * 1000 : NaN;
    const endMs =
      typeof w.endMs === "number" ? w.endMs : typeof w.end === "number" ? w.end * 1000 : NaN;
    if (Number.isNaN(startMs)) continue;
    out.push({ text, startMs, endMs: Number.isNaN(endMs) ? startMs + 300 : endMs });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
};

/** Agrupa palabras en "páginas" cortas */
const paginate = (words: Word[], maxWords = 6, maxGapMs = 700) => {
  const pages: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const breakHere =
      cur.length >= maxWords ||
      (prev && w.startMs - prev.endMs > maxGapMs) ||
      (prev && /[.?!…]$/.test(prev.text));
    if (breakHere && cur.length) {
      pages.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) pages.push(cur);
  return pages;
};

/** Subtítulos palabra por palabra en la mitad inferior */
export const Subtitles: React.FC<{ words: Word[]; bottom?: number }> = ({
  words,
  bottom = 110,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = useMemo(() => paginate(words), [words]);
  const ms = (frame / fps) * 1000;

  const page = pages.find(
    (p) => ms >= p[0].startMs && ms <= p[p.length - 1].endMs + 250,
  );
  if (!page) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          padding: "14px 28px",
          backgroundColor: "rgba(20,20,20,0.82)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 18px",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 50,
          lineHeight: 1.25,
          color: C.fg,
        }}
      >
        {page.map((w, i) => {
          const spoken = ms >= w.startMs;
          const active = spoken && ms < w.endMs;
          return (
            <span
              key={i}
              style={{
                opacity: spoken ? 1 : 0,
                transform: `scale(${active ? 1.06 : 1})`,
                textDecoration: active ? "underline" : "none",
                textUnderlineOffset: 10,
                textDecorationThickness: 4,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
