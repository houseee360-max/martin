import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DISPLAY, MONO } from "../theme";

/**
 * "Un dominó de 5 mm puede tumbar un rascacielos."
 * Base real: L. Whitehead (1983, American Journal of Physics 51, p. 182): un dominó puede
 * tumbar a otro ~1,5 veces más grande. S. Morris (U. de Toronto): con 29 dominós desde 5 mm,
 * el último sería tan alto como el Empire State; con 13, la energía se multiplica ~2.000 millones de veces.
 */
export const DO_FPS = 30;
export const DO_W = 1080;
export const DO_H = 1920;

const N = 29;
const H = (n: number) => 0.005 * Math.pow(1.5, n - 1); // metros
const TH = (n: number) => H(n) * 0.16; // grosor
const AN = (n: number) => H(n) * 0.5; // ancho
const GAP = (n: number) => H(n) * 0.5; // separación hasta el siguiente

// X[n] = cara delantera del dominó n (cae hacia +x girando sobre ese borde)
const X: number[] = [0, 0];
for (let n = 2; n <= N; n++) X[n] = X[n - 1] + GAP(n - 1) + TH(n);

// Tiempos de caída (segundos): los grandes caen más lento
const INICIO = 2.4;
const DUR = (n: number) => 0.25 + 0.07 * n;
const GOLPE = 0.55; // fracción de la caída en que toca al siguiente
const S: number[] = [0, INICIO];
for (let n = 2; n <= N; n++) S[n] = S[n - 1] + GOLPE * DUR(n - 1);
const FIN_CAIDA = S[N] + DUR(N) * 0.62;
const T_REGALO = FIN_CAIDA + 1.6;
const T_BUCLE = T_REGALO + 6.4;
export const DO_TOTAL = Math.ceil((T_BUCLE + 1.0) * DO_FPS);
export const DO_TIEMPOS = { S, FIN_CAIDA, T_REGALO, T_BUCLE };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = (p: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Ángulo de caída del dominó n en el segundo t */
const angulo = (n: number, t: number) => {
  const d = DUR(n);
  const u = (t - S[n]) / d;
  if (u <= 0) return 0;
  const golpe = Math.asin(Math.min(0.95, (GAP(n) + TH(n + 1 <= N ? n + 1 : n)) / H(n)));
  const reposo = n === N ? Math.PI / 2 : (78 * Math.PI) / 180;
  if (u < GOLPE) return golpe * Math.pow(u / GOLPE, 2);
  if (n === N) return golpe + (reposo - golpe) * Math.pow(Math.min(1, (u - GOLPE) / (1 - GOLPE)), 2);
  return golpe + (reposo - golpe) * easeOut((u - GOLPE) / 1.1);
};

/** Índice "activo" continuo (para la cámara y el contador) */
const activo = (t: number) => {
  if (t <= S[1]) return 1;
  for (let n = 1; n < N; n++) if (t < S[n + 1]) return n + (t - S[n]) / (S[n + 1] - S[n]);
  return N;
};

// ---------- Texturas ----------
const lienzo = (w: number, h: number, dib: (x: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  dib(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
const texPuntos = (fondo: string, punto: string) =>
  lienzo(256, 512, (x) => {
    x.fillStyle = fondo;
    x.fillRect(0, 0, 256, 512);
    x.fillStyle = punto;
    x.fillRect(24, 250, 208, 12);
    const p = (cx: number, cy: number) => {
      x.beginPath();
      x.arc(cx, cy, 22, 0, Math.PI * 2);
      x.fill();
    };
    [[64, 64], [128, 128], [192, 192]].forEach(([a, b]) => p(a, b));
    [[64, 320], [192, 320], [64, 448], [192, 448], [128, 384]].forEach(([a, b]) => p(a, b));
  });
const texVentanas = () =>
  lienzo(128, 256, (x) => {
    x.fillStyle = "#3a414c";
    x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 22; j++) {
        x.fillStyle = rnd(i * 31 + j) > 0.55 ? "#ffd98a" : "#1b2028";
        x.fillRect(6 + i * 15, 6 + j * 11, 9, 7);
      }
  });
const texHalo = () =>
  lienzo(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  });

// ---------- Utilidades ----------
const Entorno: React.FC = () => {
  const { gl, scene } = useThree();
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  scene.environment = env;
  scene.environmentIntensity = 0.35;
  scene.background = new THREE.Color("#8fb0d2");
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 0.82;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  return null;
};
const Repintar: React.FC = () => {
  const { advance } = useThree();
  const [h] = useState(() => delayRender("repintar"));
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      advance(performance.now());
      requestAnimationFrame(() => {
        advance(performance.now());
        continueRender(h);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [advance, h]);
  return null;
};

// ---------- Escena ----------
const Escena: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { camera, scene } = useThree();
  const t = f / fps;
  const enBucle = t >= T_BUCLE;
  const tt = enBucle ? 0 : t; // en el bucle vuelve el estado inicial

  const mats = useMemo(() => {
    const blanco = new THREE.MeshStandardMaterial({ color: "#f7f3ea", roughness: 0.35 });
    const cara = new THREE.MeshStandardMaterial({ map: texPuntos("#f7f3ea", "#141414"), roughness: 0.35 });
    const rojo = new THREE.MeshStandardMaterial({ color: "#FF4D2E", roughness: 0.35 });
    const caraRoja = new THREE.MeshStandardMaterial({ map: texPuntos("#FF4D2E", "#ffffff"), roughness: 0.35 });
    return { normal: [cara, cara, blanco, blanco, blanco, blanco], ultimo: [caraRoja, caraRoja, rojo, rojo, rojo, rojo] };
  }, []);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  // ----- Cámara: sigue al dominó activo y se aleja en escala logarítmica -----
  let a = activo(tt);
  let dist = 5.2;
  let alto = 0.5;
  if (!enBucle && t > FIN_CAIDA - 0.4) {
    // al final se aleja para ver la ciudad
    const p = easeOut((t - (FIN_CAIDA - 0.4)) / 3.2);
    a = N;
    dist = 5.2 + p * 4.5;
    alto = 0.5 + p * 0.6;
  }
  if (t < S[1]) dist = 5.2 - (S[1] - t) * 0.6; // empuje lento al inicio
  const hc = 0.005 * Math.pow(1.5, a - 1);
  const n0 = Math.min(N, Math.max(1, Math.floor(a)));
  const fr = a - n0;
  const xc = n0 >= N ? X[N] : X[n0] + (X[n0 + 1] - X[n0]) * fr;
  const objetivo = new THREE.Vector3(xc - TH(n0) * 0.5 + hc * 0.15, hc * alto, 0);
  const dir = new THREE.Vector3(-0.52, 0.36, 0.9).normalize();
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = 42;
  cam.near = hc * 0.02;
  cam.far = hc * 900;
  cam.position.copy(objetivo.clone().add(dir.multiplyScalar(dist * hc)));
  cam.lookAt(objetivo);
  cam.updateProjectionMatrix();
  // niebla a escala (se crea una sola vez; Entorno ya no la toca)
  if (!(scene.fog instanceof THREE.Fog)) scene.fog = new THREE.Fog("#8fb0d2", 1, 2);
  (scene.fog as THREE.Fog).near = hc * 25;
  (scene.fog as THREE.Fog).far = hc * 260;

  // ----- Sol que sigue la escala (sombras siempre nítidas) -----
  const sol = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    const l = sol.current;
    if (!l) return;
    l.target.position.copy(objetivo);
    l.target.updateMatrixWorld();
  });
  const sombra = hc * 10;

  // ----- Ciudad al fondo (aparece cuando los dominós ya son edificios) -----
  const ciudad = useRef<THREE.InstancedMesh>(null);
  const datosCiudad = useMemo(
    () =>
      Array.from({ length: 160 }, (_, i) => {
        const lado = i % 3 === 0 ? 1 : -1; // casi todo al fondo
        const x = X[24] + rnd(i) * (X[N] - X[24] + 1400) - 200;
        const z = lado * (420 + rnd(i + 7) * 1600);
        const h = 25 + Math.pow(rnd(i + 3), 2) * 190;
        const w = 25 + rnd(i + 5) * 45;
        return { x, z, h, w };
      }).filter((b) => Math.abs(b.z) > 400),
    [],
  );
  useLayoutEffect(() => {
    const im = ciudad.current;
    if (!im) return;
    const o = new THREE.Object3D();
    datosCiudad.forEach((b, i) => {
      o.position.set(b.x, b.h / 2, b.z);
      o.scale.set(b.w, b.h, b.w);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  }, [datosCiudad]);
  const matCiudad = useMemo(() => {
    const t = texVentanas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
  }, []);

  // ----- Polvo del gran golpe -----
  const halo = useMemo(() => new THREE.SpriteMaterial({ map: texHalo(), color: "#d9cbb8", transparent: true, depthWrite: false }), []);
  const golpeT = S[N] + DUR(N) * 0.98;
  const polvo = !enBucle && t > golpeT ? Math.min(1, (t - golpeT) / 2.2) : 0;
  const xImpacto = X[N] + H(N) * 0.9;

  // ----- Canica que empuja al primero -----
  const r = 0.0017;
  const xCanica = interpolate(tt, [0.9, S[1]], [X[1] - TH(1) - 0.04, X[1] - TH(1) - r], { ...clamp, easing: Easing.in(Easing.quad) });

  return (
    <>
      <Repintar />
      <Entorno />
      <hemisphereLight args={["#dfeaff", "#5a5248", 0.45]} />
      <directionalLight
        ref={sol}
        position={[objetivo.x - 6 * hc, objetivo.y + 9 * hc, objetivo.z + 5 * hc]}
        intensity={2.3}
        color="#ffe9cc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-sombra}
        shadow-camera-right={sombra}
        shadow-camera-top={sombra}
        shadow-camera-bottom={-sombra}
        shadow-camera-near={hc * 0.5}
        shadow-camera-far={hc * 40}
        shadow-bias={-0.0004}
        shadow-normalBias={hc * 0.01}
      />
      {/* Piso */}
      {/* Piso a escala de la cámara (un plano gigante pierde precisión cuando la cámara está a milímetros) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[xc, 0, 0]} scale={[hc * 3000, hc * 3000, 1]} receiveShadow>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#9d968a" roughness={0.9} />
      </mesh>
      {/* Rejillas de escala: 1 cm, 10 cm, 1 m, 10 m, 100 m */}
      {[0.01, 0.1, 1, 10, 100].map((paso) => {
        const tam = paso * 400;
        const vis = Math.max(0, 1 - Math.abs(Math.log10(hc / (paso * 6))) / 1.1);
        return vis > 0.02 ? (
          <gridHelper key={paso} args={[tam, 400, "#8d877c", "#aaa498"]} position={[xc, hc * 0.0005 + paso * 0.0001, 0]} material-transparent material-opacity={0.45 * vis} />
        ) : null;
      })}
      {/* Dominós */}
      {Array.from({ length: N }, (_, i) => {
        const n = i + 1;
        const h = H(n);
        // ocultar los muy pequeños cuando la cámara ya está lejos (no se ven y ahorran trabajo)
        if (h < hc * 0.004 && !enBucle) return null;
        if (h > hc * 400) return null;
        const ang = angulo(n, tt);
        return (
          <group key={n} position={[X[n], 0, 0]} rotation={[0, 0, -ang]}>
            <mesh geometry={geo} material={n === N ? mats.ultimo : mats.normal} position={[-TH(n) / 2, h / 2, 0]} scale={[TH(n), h, AN(n)]} castShadow receiveShadow />
          </group>
        );
      })}
      {/* Referencias de tamaño */}
      {hc < 0.08 ? (
        <mesh position={[X[4] + 0.012, 0.001, -0.03]} castShadow receiveShadow>
          <cylinderGeometry args={[0.0118, 0.0118, 0.002, 40]} />
          <meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.3} />
        </mesh>
      ) : null}
      {hc > 0.02 && hc < 2 ? (
        <group position={[X[10] - 0.05, 0.004, 0.17]} rotation={[0, 0.5, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.075, 0.008, 0.155]} />
            <meshStandardMaterial color="#111318" roughness={0.2} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.0045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.068, 0.145]} />
            <meshStandardMaterial color="#1d3550" emissive="#2b6fa8" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ) : null}
      {hc > 0.3 && hc < 30 ? (
        <group position={[X[15] + 0.6, 0, 1.6]}>
          <mesh position={[0, 0.82, 0]} castShadow>
            <capsuleGeometry args={[0.2, 0.9, 6, 16]} />
            <meshStandardMaterial color="#2f5fa8" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.58, 0]} castShadow>
            <sphereGeometry args={[0.13, 20, 16]} />
            <meshStandardMaterial color="#c99a7a" roughness={0.7} />
          </mesh>
        </group>
      ) : null}
      {hc > 1 && hc < 120 ? (
        <group position={[X[19] + 6, 0, -16]}>
          <mesh position={[0, 3, 0]} castShadow receiveShadow>
            <boxGeometry args={[8, 6, 7]} />
            <meshStandardMaterial color="#e8dfcf" roughness={0.8} />
          </mesh>
          <mesh position={[0, 7.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[6.4, 2.6, 4]} />
            <meshStandardMaterial color="#9c3b2b" roughness={0.7} />
          </mesh>
        </group>
      ) : null}
      {hc > 40 ? (
        <>
          <instancedMesh ref={ciudad} args={[geo, matCiudad, datosCiudad.length]} castShadow receiveShadow />
          {/* rascacielos de referencia (~443 m con antena) */}
          <group position={[X[N] - 260, 0, -330]}>
            {[
              [90, 80, 0],
              [62, 240, 80],
              [44, 60, 320],
              [28, 20, 380],
            ].map(([w, h, y], i) => (
              <mesh key={i} position={[0, y + h / 2, 0]} castShadow receiveShadow material={matCiudad}>
                <boxGeometry args={[w, h, w * 0.7]} />
              </mesh>
            ))}
            <mesh position={[0, 421, 0]} castShadow>
              <cylinderGeometry args={[1.5, 4, 43, 12]} />
              <meshStandardMaterial color="#b9c0c8" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        </>
      ) : null}
      {/* Canica */}
      {hc < 0.05 ? (
        <mesh position={[xCanica, r, 0]} castShadow>
          <sphereGeometry args={[r, 24, 18]} />
          <meshStandardMaterial color="#3a7bd5" metalness={0.3} roughness={0.15} />
        </mesh>
      ) : null}
      {/* Polvo */}
      {polvo > 0
        ? Array.from({ length: 36 }, (_, i) => {
            const ang = rnd(i) * Math.PI * 2;
            const rad = (40 + rnd(i + 1) * 220) * easeOut(polvo * 1.4);
            const s = (60 + rnd(i + 2) * 140) * (0.4 + polvo);
            return <sprite key={i} position={[xImpacto + Math.cos(ang) * rad, s * 0.25 + rnd(i + 3) * 30 * polvo, Math.sin(ang) * rad]} scale={[s, s, s]} material={halo} />;
          })
        : null}
    </>
  );
};

// ---------- Textos ----------
const fmt = (m: number) => (m < 0.01 ? `${(m * 1000).toFixed(0)} mm` : m < 1 ? `${(m * 100).toFixed(m < 0.1 ? 1 : 0).replace(".", ",")} cm` : `${m < 10 ? m.toFixed(2).replace(".", ",") : Math.round(m)} m`);
const HITOS: [number, string][] = [
  [10, "Más grande que un celular"],
  [15, "Casi como una persona"],
  [17, "Más alto que el techo de tu casa"],
  [20, "Como un edificio de 3 pisos"],
  [23, "Como un edificio de 12 pisos"],
  [25, "Casi la Estatua de la Libertad"],
  [29, "Tan alto como el Empire State"],
];
const vb = (u: number) => {
  if (u <= 0) return 0;
  if (u < 0.22) return (u / 0.22) ** 2;
  const w = u - 0.22;
  if (w > 0.8) return 1;
  return 1 + ((2 / 0.22) * 0.08 * Math.sin(2.5 * w * 2 * Math.PI)) / Math.exp(5 * w);
};
const sombraTxt = "0 4px 0 rgba(0,0,0,.55), 0 10px 30px rgba(0,0,0,.45)";
const Bloque: React.FC<{ t: number; desde: number; hasta: number; top: number; children: React.ReactNode }> = ({ t, desde, hasta, top, children }) => {
  const p = vb((t - desde) * 1.8);
  const sal = 1 - interpolate(t, [hasta - 0.2, hasta], [0, 1], clamp);
  if (t < desde || t > hasta) return null;
  return <div style={{ position: "absolute", left: 40, right: 40, top, textAlign: "center", opacity: Math.min(1, p * 1.5) * sal, transform: `scale(${0.7 + 0.3 * p})` }}>{children}</div>;
};

const Textos: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / DO_FPS;
  const enBucle = t >= T_BUCLE;
  const tt = enBucle ? 0 : t;
  const a = activo(tt);
  const n = Math.min(N, Math.max(1, Math.round(a)));
  const contador = !enBucle && t >= S[1] - 0.1 && t < T_REGALO;
  const golpe = (n2: number) => Math.max(0, 1 - Math.abs(t - (S[n2] + GOLPE * DUR(n2))) * 6);
  const pulso = contador ? golpe(Math.max(1, n - 1)) : 0;
  const hito = HITOS.find(([k]) => !enBucle && t >= S[k] && t < S[k] + Math.max(1.4, DUR(k)));
  const g = { fontFamily: DISPLAY, color: "#fff", textShadow: sombraTxt, lineHeight: 1.02 } as const;
  return (
    <AbsoluteFill>
      {/* Gancho (también es el cuadro del bucle) */}
      <Bloque t={tt} desde={-1} hasta={S[1] + 0.1} top={230}>
        <div style={{ ...g, fontSize: 92 }}>Este dominó mide</div>
        <div style={{ ...g, fontSize: 190, color: "#FF4D2E" }}>5 mm</div>
      </Bloque>
      <Bloque t={tt} desde={1.1} hasta={S[1] + 0.9} top={1400}>
        <div style={{ ...g, fontSize: 70 }}>…y puede tumbar</div>
        <div style={{ ...g, fontSize: 92, color: "#ffd23f" }}>un rascacielos.</div>
      </Bloque>
      {/* Contador */}
      {contador ? (
        <div style={{ position: "absolute", top: 190, left: 0, right: 0, textAlign: "center", transform: `scale(${1 + pulso * 0.08})` }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 6, color: "#fff", textShadow: sombraTxt }}>DOMINÓ</div>
          <div style={{ ...g, fontSize: 210, color: n === N ? "#FF4D2E" : "#fff", fontVariantNumeric: "tabular-nums" }}>#{n}</div>
          <div style={{ display: "inline-block", marginTop: 6, padding: "8px 26px", borderRadius: 999, background: "rgba(20,20,20,.72)", fontFamily: MONO, fontWeight: 800, fontSize: 54, color: "#ffd23f", fontVariantNumeric: "tabular-nums" }}>{fmt(H(n))}</div>
        </div>
      ) : null}
      {hito ? (
        <div style={{ position: "absolute", top: 1390, left: 40, right: 40, textAlign: "center", transform: `scale(${vb((t - S[hito[0]]) * 1.8)})` }}>
          <div style={{ display: "inline-block", padding: "14px 30px", borderRadius: 22, background: hito[0] === N ? "#FF4D2E" : "rgba(20,20,20,.8)", ...g, fontSize: 64 }}>{hito[1]}</div>
        </div>
      ) : null}
      {/* Regalo final: el dato real (con fondo oscuro para que se lea) */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,12,16,.82) 0%, rgba(10,12,16,.55) 38%, transparent 60%)", opacity: interpolate(t, [T_REGALO - 0.3, T_REGALO, T_BUCLE - 0.2, T_BUCLE], [0, 1, 1, 0], clamp) }} />
      <Bloque t={t} desde={T_REGALO} hasta={T_REGALO + 1.6} top={300}>
        <div style={{ ...g, fontSize: 104 }}>No es un truco.</div>
      </Bloque>
      <Bloque t={t} desde={T_REGALO + 1.6} hasta={T_REGALO + 3.9} top={260}>
        <div style={{ ...g, fontSize: 64 }}>Un físico lo demostró en 1983:</div>
        <div style={{ ...g, fontSize: 82, color: "#ffd23f", marginTop: 14 }}>cada dominó tumba a uno</div>
        <div style={{ ...g, fontSize: 120, color: "#ffd23f" }}>1,5 veces</div>
        <div style={{ ...g, fontSize: 82, color: "#ffd23f" }}>más grande.</div>
      </Bloque>
      <Bloque t={t} desde={T_REGALO + 3.9} hasta={T_REGALO + 6.4} top={260}>
        <div style={{ ...g, fontSize: 64 }}>Con solo 13 dominós, el empujón</div>
        <div style={{ ...g, fontSize: 64 }}>del primero se multiplica</div>
        <div style={{ ...g, fontSize: 150, color: "#FF4D2E", marginTop: 10 }}>2.000</div>
        <div style={{ ...g, fontSize: 86, color: "#FF4D2E" }}>MILLONES DE VECES</div>
      </Bloque>
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 210, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 22, color: "rgba(255,255,255,.85)", textShadow: "0 2px 8px #000", opacity: t >= T_REGALO && t < T_BUCLE ? 1 : 0 }}>
        Fuente: L. Whitehead, Am. J. Physics (1983) · S. Morris, U. de Toronto
      </div>
    </AbsoluteFill>
  );
};

export const Domino: React.FC = () => {
  const { width, height } = useVideoConfig();
  const f = useCurrentFrame();
  const t = f / DO_FPS;
  const flash = Math.max(0, 1 - Math.abs(t - (S[N] + DUR(N) * 0.98)) * 3) * 0.6;
  const temblor = t > S[N] + DUR(N) * 0.98 && t < S[N] + DUR(N) * 0.98 + 1 ? (rnd(f) - 0.5) * 30 * (1 - (t - S[N] - DUR(N) * 0.98)) : 0;
  return (
    <AbsoluteFill style={{ background: "#c9d6e3" }}>
      <AbsoluteFill style={{ transform: `translate(${temblor}px, ${-temblor * 0.6}px)` }}>
        <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true }}>
          <Escena />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 50%, transparent 60%, rgba(0,0,0,.45) 100%)" }} />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <Textos />
    </AbsoluteFill>
  );
};
