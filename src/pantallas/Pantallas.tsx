import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, MONO } from "../theme";

/**
 * "¿El celular te pudre el cerebro?" — estudio PANIC (Universidad de Jyväskylä y
 * Universidad de Finlandia Oriental): 260 niños seguidos 8 años. Más pantalla se asoció
 * con mejor procesamiento cognitivo en la adolescencia (asociación, no causa).
 * Otro análisis del mismo grupo: más pantalla, más estrés y síntomas depresivos.
 */
export const PA_FPS = 30;
export const PA_W = 1080;
export const PA_H = 1920;
export const PA_TOTAL = 1146; // 38,2 s: sincronizado con la voz

// Inicio de cada escena = inicio de su frase en la voz (cuadro = segundo × 30)
const T = { ninos: 72, mejor: 240, ajuste: 379, ojo: 563, duele: 711, clave: 938, bucle: 1064 };
const C = { bg: "#0b0e14", cian: "#3fd8ff", cianCore: "#d6f8ff", rojo: "#FF4D2E", amarillo: "#ffd23f", gris: "#8a94a3", blanco: "#F2EFE9" };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number[], b: number[], e = Easing.inOut(Easing.cubic)) => interpolate(f, a, b, { ...clamp, easing: e });
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const vb = (t: number, fuerza = 0.08, llegada = 0.22) => {
  if (t <= 0) return 0;
  if (t < llegada) return (t / llegada) ** 2;
  const u = t - llegada;
  if (u > 0.8) return 1;
  return 1 + ((2 / llegada) * fuerza * Math.sin(2.5 * u * 2 * Math.PI)) / Math.exp(5 * u);
};

// ---------- Cerebro de puntos (vista lateral) ----------
const dentroCerebro = (x: number, y: number) => {
  const cer = ((x - 0) / 300) ** 2 + ((y + 20) / 205) ** 2 < 1 && y < 150;
  const cbl = ((x - 170) / 105) ** 2 + ((y - 150) / 62) ** 2 < 1;
  const tallo = x > 60 && x < 130 && y > 120 && y < 260 && Math.abs(x - 95 - (y - 120) * 0.12) < 32;
  return cer || cbl || tallo;
};
const NODOS = (() => {
  const out: { x: number; y: number; t: number; lado: number }[] = [];
  let i = 0;
  while (out.length < 340 && i < 9000) {
    const x = -320 + rnd(i) * 640;
    const y = -240 + rnd(i + 5000) * 520;
    i++;
    if (!dentroCerebro(x, y)) continue;
    out.push({ x, y, t: (x + 320) / 640 * 0.75 + rnd(i + 70) * 0.25, lado: x < 0 ? 0 : 1 });
  }
  return out;
})();
const ARISTAS = (() => {
  const out: [number, number][] = [];
  NODOS.forEach((a, i) => {
    const cerca = NODOS.map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    cerca.forEach((o) => {
      if (o.j > i && o.d < 75 ** 2) out.push([i, o.j]);
    });
  });
  return out;
})();
/** encendido: 0 apagado gris → 1 cian. rojo: 0..1 tiñe de rojo (desde la derecha) */
const Cerebro: React.FC<{ f: number; encendido: number; rojo: number; s?: number }> = ({ f, encendido, rojo, s = 1 }) => {
  const color = (n: { x: number; t: number }) => {
    const on = encendido >= n.t ? 1 : 0;
    const r = rojo > 0 && (n.x + 320) / 640 > 1 - rojo ? 1 : 0;
    if (r) return C.rojo;
    return on ? C.cian : C.gris;
  };
  return (
    <svg viewBox="-360 -280 720 580" width={720 * s} height={580 * s} style={{ overflow: "visible" }}>
      <defs>
        <filter id="brillo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#brillo)">
        {ARISTAS.map(([a, b], k) => {
          const A = NODOS[a];
          const B = NODOS[b];
          const c = color(A);
          return <line key={k} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={c} strokeOpacity={c === C.gris ? 0.32 : 0.55} strokeWidth={2} />;
        })}
        {NODOS.map((n, k) => {
          const c = color(n);
          const pulso = c === C.gris ? 1 : 1 + 0.35 * Math.sin(f / 5 + k);
          return <circle key={k} cx={n.x} cy={n.y} r={(c === C.gris ? 3.6 : 4.6) * pulso} fill={c} opacity={c === C.gris ? 0.8 : 1} />;
        })}
      </g>
    </svg>
  );
};

// ---------- Piezas ----------
const Telefono: React.FC<{ f: number; s?: number; children?: React.ReactNode }> = ({ f, s = 1, children }) => (
  <div style={{ width: 300 * s, height: 600 * s, borderRadius: 48 * s, background: "#06080c", border: `${8 * s}px solid #262b33`, boxShadow: `0 0 ${60 + 20 * Math.sin(f / 8)}px rgba(63,216,255,.35)`, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 12 * s, left: "50%", width: 90 * s, height: 22 * s, marginLeft: -45 * s, borderRadius: 12 * s, background: "#000" }} />
    {children}
  </div>
);

const Nino: React.FC<{ x: number; y: number; h: number; color: string; op?: number }> = ({ x, y, h, color, op = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${h})`} opacity={op}>
    <circle cx={0} cy={-15} r={6} fill={color} />
    <rect x={-6} y={-8} width={12} height={16} rx={5} fill={color} />
  </g>
);

const Texto: React.FC<{ f: number; at: number; fin?: number; top: number; children: React.ReactNode }> = ({ f, at, fin = 99999, top, children }) => {
  const p = vb((f - at) / 16);
  const sal = 1 - interpolate(f, [fin - 6, fin], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top, textAlign: "center", opacity: Math.min(1, p * 1.5) * sal, transform: `scale(${0.7 + 0.3 * p})` }}>
      {children}
    </div>
  );
};
const grande = (c: string, s: number): React.CSSProperties => ({ fontFamily: DISPLAY, fontSize: s, lineHeight: 1.03, color: c, textShadow: "0 6px 24px rgba(0,0,0,.8)" });
const mono = (c: string, s: number): React.CSSProperties => ({ fontFamily: MONO, fontWeight: 700, fontSize: s, color: c, letterSpacing: 2 });
const Fuente: React.FC<{ op: number }> = ({ op }) => (
  <div style={{ position: "absolute", left: 40, right: 40, bottom: 205, textAlign: "center", ...mono("rgba(242,239,233,.55)", 22), opacity: op }}>
    Fuente: estudio PANIC · Univ. de Jyväskylä y de Finlandia Oriental
  </div>
);

// ---------- Escenas ----------
const Gancho: React.FC<{ f: number; local: number }> = ({ f, local }) => {
  const grieta = lerp(local, [20, 60], [0, 1]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative" }}>
          <Cerebro f={f} encendido={0} rojo={0} s={1.25} />
          {/* grietas */}
          <svg viewBox="-360 -280 720 580" width={900} height={725} style={{ position: "absolute", left: 0, top: 0 }}>
            <path d={`M -60 -200 L -20 -120 L -70 -40 L -10 40 L -40 ${-40 + 160 * grieta}`} stroke={C.rojo} strokeWidth={8} fill="none" strokeDasharray={600} strokeDashoffset={600 * (1 - grieta)} strokeLinecap="round" />
            <path d={`M 120 -170 L 90 -90 L 140 -20`} stroke={C.rojo} strokeWidth={6} fill="none" strokeDasharray={300} strokeDashoffset={300 * (1 - grieta)} strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1240, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `translateY(${Math.sin(local / 10) * 8}px)` }}>
        <Telefono f={local} s={0.85}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#1b2a3a,#0b0e14)" }} />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 20, right: 20, height: 70, top: ((i * 90 - local * 9) % 540 + 540) % 540, borderRadius: 14, background: ["#ff4d6d", "#ffd23f", "#3fd8ff", "#9d6bff", "#4dff9a", "#ff8a3c"][i], opacity: 0.85 }} />
          ))}
        </Telefono>
      </div>
      <div style={{ position: "absolute", top: 220, left: 40, right: 40, textAlign: "center" }}>
        <div style={grande(C.blanco, 96)}>¿El celular te</div>
        <div style={grande(C.rojo, 128)}>PUDRE EL</div>
        <div style={grande(C.rojo, 128)}>CEREBRO?</div>
      </div>
    </AbsoluteFill>
  );
};

const Ninos: React.FC<{ f: number }> = ({ f }) => {
  const lf = f - T.ninos;
  const aparecen = lerp(lf, [6, 46], [0, 260], Easing.out(Easing.quad));
  const anios = Math.floor(lerp(lf, [108, 150], [0, 8], Easing.linear));
  const crecen = lerp(lf, [108, 150], [1, 1.45]);
  return (
    <AbsoluteFill>
      <Texto f={f} at={T.ninos} top={170}>
        <div style={grande(C.blanco, 84)}>En Finlandia siguieron a</div>
        <div style={{ ...grande(C.amarillo, 170), fontVariantNumeric: "tabular-nums" }}>{Math.round(aparecen)} NIÑOS</div>
      </Texto>
      <svg viewBox="0 0 1080 640" width={1080} height={640} style={{ position: "absolute", top: 690 }}>
        {Array.from({ length: 260 }, (_, i) => {
          const col = i % 20;
          const fila = Math.floor(i / 20);
          return i < aparecen ? <Nino key={i} x={70 + col * 50} y={60 + fila * 46} h={crecen} color={i % 7 === 0 ? C.cian : C.blanco} op={0.9} /> : null;
        })}
      </svg>
      <Texto f={f} at={T.ninos + 106} top={1330}>
        <div style={mono(C.gris, 34)}>DURANTE</div>
        <div style={{ ...grande(C.cian, 150), fontVariantNumeric: "tabular-nums" }}>{anios} AÑOS</div>
      </Texto>
    </AbsoluteFill>
  );
};

const Mejor: React.FC<{ f: number }> = ({ f }) => {
  const lf = f - T.mejor;
  const b1 = lerp(lf, [20, 50], [0, 0.55]);
  const b2 = lerp(lf, [28, 62], [0, 0.85], Easing.out(Easing.back(1.4)));
  return (
    <AbsoluteFill>
      <Texto f={f} at={T.mejor} top={190}>
        <div style={grande(C.blanco, 76)}>Los que usaban</div>
        <div style={grande(C.cian, 112)}>MÁS PANTALLAS…</div>
      </Texto>
      <div style={{ position: "absolute", top: 470, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Cerebro f={f} encendido={lerp(lf, [24, 70], [0, 1.05])} rojo={0} s={1.15} />
      </div>
      {/* barras comparativas */}
      <div style={{ position: "absolute", left: 160, right: 160, top: 1110, height: 300, display: "flex", alignItems: "flex-end", justifyContent: "space-around" }}>
        {[
          { v: b1, c: C.gris, t: "MENOS PANTALLA" },
          { v: b2, c: C.cian, t: "MÁS PANTALLA" },
        ].map((b, i) => (
          <div key={i} style={{ width: 260, textAlign: "center" }}>
            <div style={{ height: 280 * b.v, background: b.c, borderRadius: 16, boxShadow: i ? `0 0 40px ${C.cian}` : "none" }} />
            <div style={{ ...mono(i ? C.cian : C.gris, 24), marginTop: 12 }}>{b.t}</div>
          </div>
        ))}
      </div>
      <Texto f={f} at={T.mejor + 60} top={1520}>
        <div style={grande(C.amarillo, 72)}>…rindieron MEJOR</div>
        <div style={{ ...grande(C.blanco, 40), whiteSpace: "nowrap" }}>en pruebas mentales de adolescentes.</div>
      </Texto>
    </AbsoluteFill>
  );
};

const Ajuste: React.FC<{ f: number }> = ({ f }) => {
  const lf = f - T.ajuste;
  const item = (at: number, texto: string) => {
    const p = vb((lf - at) / 14);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 28, opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - Math.min(1, p)) * 80}px)`, marginTop: 40 }}>
        <div style={{ width: 92, height: 92, borderRadius: 24, background: C.cian, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${p})` }}>
          <svg viewBox="0 0 24 24" width={60} height={60}><path d="M4 12.5l5 5L20 6.5" stroke="#06202a" strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ ...grande(C.blanco, 58), textAlign: "left" }}>{texto}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <Texto f={f} at={T.ajuste} top={260}>
        <div style={grande(C.blanco, 84)}>Y no fue por</div>
        <div style={grande(C.amarillo, 112)}>casualidad</div>
      </Texto>
      <div style={{ position: "absolute", top: 700, left: 110, right: 80 }}>
        {item(110, "Comparando cómo eran de niños")}
        {item(134, "Y la educación de sus padres")}
      </div>
      <Texto f={f} at={T.ajuste + 52} top={1260}>
        <div style={grande(C.cian, 70)}>El resultado se mantuvo.</div>
      </Texto>
    </AbsoluteFill>
  );
};

const Ojo: React.FC<{ f: number }> = ({ f }) => {
  const lf = f - T.ojo;
  const sello = vb((lf - 100) / 12, 0.12, 0.18);
  const linea = (fase: number, color: string, dy: number) =>
    Array.from({ length: 61 }, (_, k) => {
      const x = 90 + k * 15;
      const y = 900 + dy + Math.sin(k * 0.22 + lf * 0.12 + fase) * 90;
      return `${x},${y}`;
    }).join(" ");
  return (
    <AbsoluteFill>
      <Texto f={f} at={T.ojo} top={210}>
        <div style={{ display: "inline-block", padding: "10px 34px", background: C.rojo, ...grande("#fff", 104) }}>PERO OJO</div>
      </Texto>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <polyline points={linea(0, C.cian, -40)} fill="none" stroke={C.cian} strokeWidth={8} strokeLinecap="round" />
        <polyline points={linea(0, C.amarillo, 40)} fill="none" stroke={C.amarillo} strokeWidth={8} strokeLinecap="round" />
        <text x={110} y={760} fontFamily={MONO} fontWeight={700} fontSize={30} fill={C.cian}>PANTALLA</text>
        <text x={110} y={1110} fontFamily={MONO} fontWeight={700} fontSize={30} fill={C.amarillo}>RESULTADOS</text>
      </svg>
      {lf > 100 ? (
        <div style={{ position: "absolute", top: 820, left: 0, right: 0, textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "12px 34px", border: `8px solid ${C.rojo}`, borderRadius: 16, background: "rgba(11,14,20,.9)", ...grande(C.rojo, 88), transform: `rotate(-7deg) scale(${1.6 - 0.6 * sello})`, opacity: Math.min(1, sello * 2) }}>
            ≠ CAUSA
          </div>
        </div>
      ) : null}
      <Texto f={f} at={T.ojo + 20} top={1300}>
        <div style={grande(C.blanco, 64)}>Van juntos…</div>
        <div style={grande(C.blanco, 64)}>pero eso no prueba</div>
        <div style={grande(C.blanco, 64)}>que uno cause lo otro.</div>
      </Texto>
    </AbsoluteFill>
  );
};

const Duele: React.FC<{ f: number }> = ({ f }) => {
  const lf = f - T.duele;
  const rojo = lerp(lf, [40, 110], [0, 0.55]);
  const latido = 1 + 0.03 * Math.max(0, Math.sin(lf / 4));
  return (
    <AbsoluteFill>
      <Texto f={f} at={T.duele} top={190}>
        <div style={grande(C.blanco, 76)}>Y otro análisis del</div>
        <div style={grande(C.blanco, 76)}>mismo grupo encontró</div>
        <div style={grande(C.rojo, 110)}>EL LADO QUE DUELE</div>
      </Texto>
      <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${latido})` }}>
        <Cerebro f={f} encendido={1.1} rojo={rojo} s={1.15} />
      </div>
      <Texto f={f} at={T.duele + 80} top={1270}>
        <div style={grande(C.blanco, 62)}>Más pantallas,</div>
        <div style={grande(C.rojo, 80)}>más estrés</div>
        <div style={grande(C.blanco, 62)}>y más síntomas de depresión.</div>
      </Texto>
    </AbsoluteFill>
  );
};

const Clave: React.FC<{ f: number }> = ({ f }) => {
  const lf = f - T.clave;
  const modo = (crear: boolean) => (
    <div style={{ textAlign: "center" }}>
      <Telefono f={f} s={0.78}>
        <div style={{ position: "absolute", inset: 0, background: crear ? "#06202a" : "#1a0b0b" }} />
        {crear ? (
          <div style={{ position: "absolute", inset: 30, top: 70, ...mono(C.cian, 22), lineHeight: 1.7, textAlign: "left" }}>
            {["crear()", "programar()", "resolver()", "dibujar()", "aprender()"].slice(0, Math.max(0, Math.floor((lf - 20) / 8))).map((l) => (
              <div key={l}>{"> " + l}</div>
            ))}
          </div>
        ) : (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 16, right: 16, height: 70, top: ((i * 90 - lf * 14) % 540 + 540) % 540, borderRadius: 12, background: "#5a2a2a", opacity: 0.8 }} />
          ))
        )}
      </Telefono>
      <div style={{ ...grande(crear ? C.cian : C.rojo, 44), marginTop: 18 }}>{crear ? "CREAR" : "SOLO DESLIZAR"}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Texto f={f} at={T.clave} top={190}>
        <div style={grande(C.blanco, 72)}>Los investigadores creen</div>
        <div style={grande(C.blanco, 72)}>que importa</div>
        <div style={grande(C.amarillo, 130)}>PARA QUÉ</div>
        <div style={grande(C.blanco, 72)}>la usas.</div>
      </Texto>
      <div style={{ position: "absolute", top: 830, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 70, opacity: lerp(lf, [10, 22], [0, 1]) }}>
        {modo(true)}
        {modo(false)}
      </div>
    </AbsoluteFill>
  );
};

export const Pantallas: React.FC = () => {
  const f = useCurrentFrame();
  const op = (a: number, b: number) => lerp(f, [a - 6, a + 4, b - 6, b], [0, 1, 1, 0]);
  const enBucle = f >= T.bucle;
  const fuenteOp = lerp(f, [T.ninos, T.ninos + 10, T.clave + 110, T.clave + 120], [0, 1, 1, 0]);
  const flash = Math.max(0, ...[T.mejor + 60, T.ojo + 100, T.duele + 40].map((p) => 1 - Math.abs(f - p) / 8)) * 0.35;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(90% 60% at 50% 45%, #14202e 0%, ${C.bg} 70%)`, overflow: "hidden" }}>
      {/* partículas de fondo */}
      <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 60 }, (_, i) => (
          <circle key={i} cx={rnd(i) * 1080} cy={((rnd(i + 1) * 1920 - f * (0.4 + rnd(i + 2))) % 1920 + 1920) % 1920} r={1.5 + rnd(i + 3) * 2.5} fill={C.cian} opacity={0.15 + rnd(i + 4) * 0.25} />
        ))}
      </svg>
      {f < T.ninos ? <AbsoluteFill style={{ opacity: 1 - lerp(f, [T.ninos - 6, T.ninos], [0, 1]) }}><Gancho f={f} local={f} /></AbsoluteFill> : null}
      {f >= T.ninos - 6 && f < T.mejor ? <AbsoluteFill style={{ opacity: op(T.ninos, T.mejor) }}><Ninos f={f} /></AbsoluteFill> : null}
      {f >= T.mejor - 6 && f < T.ajuste ? <AbsoluteFill style={{ opacity: op(T.mejor, T.ajuste) }}><Mejor f={f} /></AbsoluteFill> : null}
      {f >= T.ajuste - 6 && f < T.ojo ? <AbsoluteFill style={{ opacity: op(T.ajuste, T.ojo) }}><Ajuste f={f} /></AbsoluteFill> : null}
      {f >= T.ojo - 6 && f < T.duele ? <AbsoluteFill style={{ opacity: op(T.ojo, T.duele) }}><Ojo f={f} /></AbsoluteFill> : null}
      {f >= T.duele - 6 && f < T.clave ? <AbsoluteFill style={{ opacity: op(T.duele, T.clave) }}><Duele f={f} /></AbsoluteFill> : null}
      {f >= T.clave - 6 && f < T.bucle ? <AbsoluteFill style={{ opacity: op(T.clave, T.bucle) }}><Clave f={f} /></AbsoluteFill> : null}
      {/* bucle: vuelve el gancho tal como empieza el video */}
      {enBucle ? <AbsoluteFill style={{ opacity: lerp(f, [T.bucle, T.bucle + 10], [0, 1]) }}><Gancho f={f} local={f - PA_TOTAL} /></AbsoluteFill> : null}
      <Fuente op={fuenteOp} />
      <AbsoluteFill style={{ background: "#fff", opacity: flash, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 85% at 50% 50%, transparent 60%, rgba(0,0,0,.7) 100%)" }} />
    </AbsoluteFill>
  );
};
