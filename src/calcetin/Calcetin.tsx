import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Caja, Cil, lienzo, Mats, Robot, texHalo, useMat } from "../enchufe/EnchufeRobot";

/**
 * "Tu lavadora se roba un calcetín en cada lavado" — historia original con el robot (CC0).
 * 8 clips, una acción por clip, cámara fija, sin texto. El clip 8 empalma con el 1 (bucle).
 */
export type CalcetinProps = { clip: number };
export const CA_FPS = 30;
export const CA_W = 1080;
export const CA_H = 1920;
export const CA_DUR: Record<number, number> = { 1: 90, 2: 105, 3: 150, 4: 90, 5: 105, 6: 180, 7: 90, 8: 90 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number[], b: number[], e = Easing.inOut(Easing.cubic)) => interpolate(f, a, b, { ...clamp, easing: e });
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const AMARILLO = "#ffc81f";

// ---------- Calcetín ----------
const geoCalcetin = (() => {
  let g: THREE.BufferGeometry | null = null;
  return () => {
    if (g) return g;
    const curva = new THREE.CatmullRomCurve3([V(0, 5.4, 0), V(0, 2.4, 0), V(0, 0.9, 0.25), V(0, 0.35, 1.3), V(0, 0.3, 3.3)]);
    const tubo = new THREE.TubeGeometry(curva, 28, 0.95, 14, false);
    const punta = new THREE.SphereGeometry(0.95, 14, 10);
    punta.translate(0, 0.3, 3.3);
    const talon = new THREE.SphereGeometry(1.02, 14, 10);
    talon.translate(0, 0.75, 0.15);
    const puno = new THREE.TorusGeometry(0.98, 0.2, 8, 18);
    puno.rotateX(Math.PI / 2);
    puno.translate(0, 5.3, 0);
    g = mergeGeometries([tubo, punta, talon, puno])!;
    g.translate(0, -2.6, -1.2); // centrar para que gire sobre sí mismo
    return g;
  };
})();
const texRayas = (() => {
  let t: THREE.Texture | null = null;
  return () =>
    (t ??= lienzo(64, 256, (x) => {
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, 64, 256);
      x.fillStyle = "#b9b9b9";
      for (let i = 0; i < 6; i++) x.fillRect(0, 20 + i * 40, 64, 14);
    }));
})();
const matCalcetin = (() => {
  let m: THREE.MeshStandardMaterial | null = null;
  return () => {
    if (m) return m;
    const tex = texRayas();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.rotation = Math.PI / 2;
    m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    return m;
  };
})();

const Calcetin: React.FC<{ p: [number, number, number]; r?: [number, number, number]; color?: string; s?: number }> = ({ p, r = [0, 0, 0], color = AMARILLO, s = 1 }) => {
  const mat = useMemo(() => {
    const m = matCalcetin().clone();
    m.color = new THREE.Color(color);
    return m;
  }, [color]);
  return <mesh geometry={geoCalcetin()} material={mat} position={p} rotation={r} scale={s} castShadow receiveShadow />;
};

/** Muchos calcetines en una sola malla (montaña y pared arcoíris) */
const Calcetines: React.FC<{ datos: { p: THREE.Vector3; r: THREE.Euler; c: THREE.Color; s: number }[] }> = ({ datos }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    const o = new THREE.Object3D();
    datos.forEach((d, i) => {
      o.position.copy(d.p);
      o.rotation.copy(d.r);
      o.scale.setScalar(d.s);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, d.c);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [datos]);
  return <instancedMesh ref={ref} args={[geoCalcetin(), matCalcetin(), datos.length]} castShadow receiveShadow />;
};

const PALETA = ["#ff4d4d", "#ff9a3c", "#ffd23f", "#59c36a", "#35b8e0", "#4a6cf7", "#a45ee5", "#ff6fb1", "#f2f2f2", "#3d3d46"];

// ---------- Texturas ----------
const texTambor = (() => {
  let t: THREE.Texture | null = null;
  return () => {
    if (t) return t;
    t = lienzo(512, 512, (x) => {
      const g = x.createLinearGradient(0, 0, 512, 0);
      g.addColorStop(0, "#aeb6bf");
      g.addColorStop(0.5, "#e6eaee");
      g.addColorStop(1, "#aeb6bf");
      x.fillStyle = g;
      x.fillRect(0, 0, 512, 512);
      x.fillStyle = "#2b2f36";
      for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
        x.beginPath();
        x.arc(i * 32 + (j % 2 ? 16 : 0) + 8, j * 32 + 16, 5, 0, Math.PI * 2);
        x.fill();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
})();
const useMatLav = () =>
  useMemo(() => {
    const tamborTex = texTambor().clone();
    tamborTex.needsUpdate = true;
    tamborTex.repeat.set(6, 2);
    return {
      tambor: new THREE.MeshStandardMaterial({ map: tamborTex, metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide }),
      acero: new THREE.MeshStandardMaterial({ color: "#c9d0d6", metalness: 0.9, roughness: 0.28, side: THREE.DoubleSide }),
      cuba: new THREE.MeshStandardMaterial({ color: "#8f979f", roughness: 0.7, side: THREE.DoubleSide }),
      goma: new THREE.MeshStandardMaterial({ color: "#3a3d42", roughness: 0.85 }),
      blanco: new THREE.MeshPhysicalMaterial({ color: "#f4f5f6", roughness: 0.3, clearcoat: 0.5 }),
      vidrio: new THREE.MeshPhysicalMaterial({ color: "#9fc4d8", roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
      negro: new THREE.MeshStandardMaterial({ color: "#07080a", roughness: 1, side: THREE.DoubleSide }),
      piedra: new THREE.MeshStandardMaterial({ color: "#2b2530", roughness: 0.95 }),
      pared: new THREE.MeshStandardMaterial({ color: "#241f2b", roughness: 0.95 }),
      baldosa: new THREE.MeshStandardMaterial({ color: "#cfd6da", roughness: 0.35 }),
      muro: new THREE.MeshStandardMaterial({ color: "#8fb7c9", roughness: 0.9 }),
    };
  }, []);
type ML = ReturnType<typeof useMatLav>;

// ---------- Utilidades de escena ----------
const Entorno: React.FC<{ fuerza: number; fondo: string; exposicion?: number }> = ({ fuerza, fondo, exposicion = 1.05 }) => {
  const { gl, scene } = useThree();
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  scene.environment = env;
  scene.environmentIntensity = fuerza;
  scene.background = new THREE.Color(fondo);
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = exposicion;
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
const Camara: React.FC<{ pos: [number, number, number]; mira: [number, number, number]; fov: number }> = ({ pos, mira, fov }) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = fov;
  cam.near = 0.1;
  cam.far = 900;
  cam.position.set(...pos);
  cam.lookAt(...mira);
  cam.updateProjectionMatrix();
  return null;
};
const Halo: React.FC<{ p: [number, number, number]; s: number; color: string }> = ({ p, s, color }) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: texHalo(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), [color]);
  return <sprite position={p} scale={[s, s, s]} material={mat} />;
};
const Efectos: React.FC<{ bloom?: number }> = ({ bloom = 0.6 }) => (
  <EffectComposer multisampling={4}>
    <Bloom intensity={bloom} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
    <Vignette offset={0.28} darkness={0.66} />
  </EffectComposer>
);

// ---------- Clip 1: dentro del tambor, el robo ----------
const DentroTambor: React.FC<{ f: number; fps: number; l: ML; conRobo: boolean }> = ({ f, fps, l, conRobo }) => {
  const s = f / fps;
  const w = 2.3; // rad/s
  const pared = useMemo(() => {
    const sh = new THREE.Shape();
    sh.absarc(0, 0, 14.2, 0, Math.PI * 2, false);
    const hueco = new THREE.Path();
    hueco.moveTo(-3.4, -8.9);
    hueco.lineTo(3.4, -8.9);
    hueco.lineTo(3.4, -2.1);
    hueco.lineTo(-3.4, -2.1);
    hueco.lineTo(-3.4, -8.9);
    sh.holes.push(hueco);
    return new THREE.ShapeGeometry(sh, 48);
  }, []);
  const orbita = (fase: number, radio: number, z: number): [number, number, number] => {
    const a = w * s + fase;
    return [Math.sin(a) * radio, -Math.cos(a) * radio * 0.92, z + Math.sin(a * 0.7 + fase) * 1.6];
  };
  const escotilla = conRobo ? lerp(f, [2, 12, 42, 54], [0, 1, 1, 0]) : 0;
  const pA = orbita(0.6, 7.6, -4.5);
  const pB0 = orbita(2.2, 7.8, -5.5);
  const robo = conRobo ? lerp(f, [18, 30], [0, 1], Easing.in(Easing.quad)) : 0;
  const meta: [number, number, number] = [0, -5.2, -9.4];
  const pB: [number, number, number] = [pB0[0] + (meta[0] - pB0[0]) * robo, pB0[1] + (meta[1] - pB0[1]) * robo, pB0[2] + (meta[2] - pB0[2]) * robo];
  const tiron = conRobo ? lerp(f, [30, 38], [0, 1]) : 0;
  return (
    <group>
      <group rotation={[0, 0, -w * s]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={l.tambor}>
          <cylinderGeometry args={[14.2, 14.2, 19, 64, 1, true]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <Caja key={i} p={[Math.cos((i * 2 * Math.PI) / 3) * 13, Math.sin((i * 2 * Math.PI) / 3) * 13, -1]} s={[2.2, 2.2, 15]} m={l.acero} r={[0, 0, (i * 2 * Math.PI) / 3]} />
        ))}
      </group>
      <mesh geometry={pared} material={l.acero} position={[0, 0, -9.5]} />
      {/* hueco oscuro detrás + compuerta */}
      <Caja p={[0, -5.5, -13]} s={[9, 9, 6]} m={l.negro} />
      <group position={[-3.4, -5.5, -9.45]} rotation={[0, -escotilla * 1.9, 0]}>
        <Caja p={[3.4, 0, 0]} s={[6.8, 6.8, 0.25]} m={l.acero} />
      </group>
      {conRobo && f < 56 ? <Robot anim="Punch" t={Math.max(0, (f - 10) / fps)} una pos={[0, -9.9, -11.6 + lerp(f, [2, 14, 32, 42], [0, 1.4, 1.4, 0])]} rotY={0} escala={1.15} /> : null}
      {conRobo && f < 54 ? <pointLight position={[0, -5.5, -10.5]} intensity={26 * escotilla} distance={16} color="#ffd9a0" /> : null}
      <Calcetin p={pA} r={[s * 2.2, s * 1.4, s * 1.8]} s={0.85} />
      {tiron < 1 ? <Calcetin p={[pB[0], pB[1], pB[2] - tiron * 3]} r={[s * 1.9 * (1 - robo), 1 + s * 1.2 * (1 - robo), s * 2.4 * (1 - robo)]} s={0.85 * (1 - tiron * 0.6)} /> : null}
      {/* gotas */}
      {Array.from({ length: 46 }, (_, i) => {
        const a = w * s * (0.6 + rnd(i) * 0.9) + rnd(i + 9) * 6.28;
        const r = 4 + rnd(i + 3) * 9;
        return (
          <mesh key={i} position={[Math.sin(a) * r, -Math.cos(a) * r, -8 + rnd(i + 5) * 15]}>
            <sphereGeometry args={[0.16 + rnd(i + 7) * 0.2, 8, 8]} />
            <meshStandardMaterial color="#cfeeff" emissive="#7fd0ff" emissiveIntensity={0.9} transparent opacity={0.75} />
          </mesh>
        );
      })}
      <pointLight position={[0, 4, 9]} intensity={20} distance={50} decay={1.6} color="#eaf6ff" />
      <pointLight position={[-9, -6, 4]} intensity={30} distance={40} color="#7fc8ff" />
    </group>
  );
};

// ---------- Clip 2: pasillo secreto ----------
const Pasillo: React.FC<{ f: number; fps: number; m: Mats; l: ML }> = ({ f, fps, m, l }) => {
  const s = f / fps;
  const x = lerp(f, [0, 105], [-13, 13], Easing.linear);
  const bob = Math.abs(Math.sin(s * 11)) * 0.35;
  return (
    <group>
      <Caja p={[0, -0.5, -2]} s={[80, 1, 16]} m={l.piedra} />
      <Caja p={[0, 14, -8.4]} s={[80, 30, 0.8]} m={l.pared} />
      {[5.5, 9, 12.5].map((y, i) => (
        <Cil key={i} p={[0, y, -7.4]} r={0.7 - i * 0.12} h={80} m={i === 1 ? m.acero : m.cobre} rot={[0, 0, Math.PI / 2]} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <group key={i}>
          <mesh position={[-20 + i * 5, 15.4 - Math.abs(Math.sin(i * 1.2)) * 0.8, -6]}>
            <sphereGeometry args={[0.38, 12, 12]} />
            <meshStandardMaterial color="#fff1c2" emissive={["#ffc45e", "#ff7fb0", "#7fd8ff"][i % 3]} emissiveIntensity={3} />
          </mesh>
          <pointLight position={[-20 + i * 5, 14.6, -5]} intensity={5} distance={14} color={["#ffc45e", "#ff7fb0", "#7fd8ff"][i % 3]} />
        </group>
      ))}
      <Robot anim="Running" t={s * 1.3} pos={[x, 0, 0]} rotY={Math.PI / 2} escala={1.1} />
      <Calcetin p={[x + 0.4, 6.6 + bob, 0]} r={[0, 0, Math.PI / 2 + Math.sin(s * 11) * 0.12]} s={0.7} />
      <pointLight position={[x + 2, 6, 6]} intensity={22} distance={22} color="#ffe9c4" />
    </group>
  );
};

// ---------- Clips 3 y 4: la bóveda de calcetines ----------
const Boveda: React.FC<{ f: number; fps: number; clip: number; m: Mats; l: ML }> = ({ f, fps, clip, l }) => {
  const s = f / fps;
  const montana = useMemo(() => {
    const H = 38;
    const R = 31;
    return Array.from({ length: 1100 }, (_, i) => {
      const h = Math.pow(rnd(i), 1.5) * H;
      const a = rnd(i + 1000) * Math.PI * 2;
      const r = (1 - h / H) * R * (0.82 + rnd(i + 2000) * 0.22);
      return {
        p: V(Math.cos(a) * r, h + 0.9, -32 + Math.sin(a) * r * 0.8),
        r: new THREE.Euler(rnd(i + 1) * 6.28, rnd(i + 2) * 6.28, rnd(i + 3) * 6.28),
        c: new THREE.Color(PALETA[Math.floor(rnd(i + 4) * PALETA.length)]),
        s: 0.8 + rnd(i + 5) * 0.35,
      };
    });
  }, []);
  const pared = useMemo(() => {
    const out = [];
    const cols = 22;
    const filas = 9;
    for (let j = 0; j < filas; j++)
      for (let i = 0; i < cols; i++) {
        out.push({
          p: V(-63 + i * 6, 8 + j * 7.4, -70),
          r: new THREE.Euler(0, 0, 0),
          c: new THREE.Color().setHSL(i / cols, 0.82, 0.56),
          s: 0.95,
        });
      }
    return out;
  }, []);
  // clip 3: las luces se encienden de a una (¡clac, clac, clac!). clip 4: todo encendido
  const e1 = clip === 4 ? 1 : lerp(f, [22, 28], [0, 1]);
  const e2 = clip === 4 ? 1 : lerp(f, [50, 56], [0, 1]);
  const e3 = clip === 4 ? 1 : lerp(f, [78, 84], [0, 1]);
  const robotPos: [number, number, number] = [7, 0, 22];
  const vuelo = clip === 4 ? lerp(f, [20, 58], [0, 1], Easing.linear) : 0;
  const destino = V(1, 17.5, -13);
  const origen = V(6.4, 6.6, 21.4);
  const pv = origen.clone().lerp(destino, vuelo);
  pv.y += Math.sin(vuelo * Math.PI) * 9;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]} material={l.piedra} receiveShadow>
        <planeGeometry args={[260, 200]} />
      </mesh>
      <Caja p={[0, 50, -74]} s={[260, 120, 1]} m={l.pared} />
      {/* base de la montaña para tapar huecos */}
      <mesh position={[0, 17, -32]} scale={[1, 1, 0.8]}>
        <coneGeometry args={[29.5, 37, 40]} />
        <meshStandardMaterial color="#5a3f6b" roughness={1} />
      </mesh>
      <Calcetines datos={montana} />
      {/* pared arcoíris con repisas */}
      {Array.from({ length: 9 }, (_, j) => (
        <Caja key={j} p={[0, 4.6 + j * 7.4, -71]} s={[136, 0.5, 3]} m={l.piedra} />
      ))}
      <Calcetines datos={pared} />
      {/* luces por etapas */}
      <pointLight position={[0, 62, 2]} intensity={1500 * e1} distance={190} decay={1.7} color="#fff0d2" />
      <Halo p={[0, 77, -6]} s={16 * e1} color="#ffe6b8" />
      <pointLight position={[-36, 44, -52]} intensity={900 * e2} distance={120} decay={1.7} color="#ffd7f0" />
      <pointLight position={[36, 44, -52]} intensity={900 * e2} distance={120} decay={1.7} color="#cfeaff" />
      {Array.from({ length: 13 }, (_, i) => {
        const x = -48 + i * 8;
        const y = 56 - Math.sin((i / 12) * Math.PI) * 9;
        const c = ["#ffc45e", "#ff7fb0", "#7fd8ff", "#9dff9a"][i % 4];
        return (
          <group key={i}>
            <mesh position={[x, y, -8]}>
              <sphereGeometry args={[0.9, 12, 12]} />
              <meshStandardMaterial color="#fff" emissive={c} emissiveIntensity={3.4 * e3 * (0.75 + 0.25 * Math.sin(s * 5 + i))} />
            </mesh>
          </group>
        );
      })}
      <pointLight position={[0, 40, 6]} intensity={500 * e3} distance={110} decay={1.7} color="#ffe2b8" />
      {/* robot en primer plano */}
      {clip === 3 ? (
        <>
          <Robot anim="Idle" t={s} pos={robotPos} rotY={Math.PI - 0.25} escala={1.15} />
          <Calcetin p={[6.4, 6.6, 21.4]} r={[0, 0, Math.PI / 2]} s={0.7} />
          <pointLight position={[7, 6, 28]} intensity={9} distance={16} color="#ffe9c4" />
        </>
      ) : (
        <>
          <Robot anim={f < 62 ? "Punch" : "ThumbsUp"} t={f < 62 ? Math.max(0, (f - 8) / fps) : (f - 62) / fps} una pos={robotPos} rotY={Math.PI - 0.25} escala={1.15} />
          {vuelo < 1 ? <Calcetin p={[pv.x, pv.y, pv.z]} r={[s * 7, s * 5, Math.PI / 2 + s * 6]} s={0.7 + vuelo * 0.3} /> : <Calcetin p={[destino.x, destino.y, destino.z]} r={[0.6, 0.4, 1.2]} s={1.0} />}
          <pointLight position={[7, 6, 28]} intensity={26} distance={22} color="#ffe9c4" />
        </>
      )}
    </group>
  );
};

// ---------- Clips 5 y 8: lavadora por fuera ----------
const Lavadora: React.FC<{ f: number; fps: number; clip: number; m: Mats; l: ML }> = ({ f, fps, clip, m, l }) => {
  const s = f / fps;
  const CY = 40;
  // 5: la puerta se abre. 8: los calcetines entran y la puerta se cierra
  const puerta = clip === 5 ? lerp(f, [14, 62], [0, 1.9], Easing.out(Easing.cubic)) : lerp(f, [40, 60], [1.9, 0], Easing.in(Easing.quad));
  const gira = clip === 8 && f > 62 ? ((f - 62) / fps) * 2.3 : 0;
  const entra = clip === 8 ? [lerp(f, [4, 30], [0, 1], Easing.linear), lerp(f, [10, 36], [0, 1], Easing.linear)] : [1, 1];
  const vuelo = (t: number, desde: THREE.Vector3, hasta: THREE.Vector3) => {
    const p = desde.clone().lerp(hasta, t);
    p.y += Math.sin(t * Math.PI) * 14;
    return p;
  };
  const a1 = vuelo(entra[0], V(18, 4, 62), V(-3, CY - 10.5, -12));
  const a2 = vuelo(entra[1], V(24, 2, 60), V(4, CY - 10.8, -10));
  const orb = (fase: number, r: number, z: number): [number, number, number] => [Math.sin(gira + fase) * r, CY - Math.cos(gira + fase) * r * 0.92, z];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 30]} material={l.baldosa} receiveShadow>
        <planeGeometry args={[240, 160]} />
      </mesh>
      <Caja p={[0, 70, -29]} s={[240, 150, 1]} m={l.muro} />
      {/* cuerpo: cuatro piezas alrededor del hueco de la puerta */}
      <Caja p={[0, 76, -27]} s={[60, 18, 55]} m={l.blanco} />
      <Caja p={[0, 9.5, -27]} s={[60, 19, 55]} m={l.blanco} />
      <Caja p={[-24.5, 43, -27]} s={[11, 48, 55]} m={l.blanco} />
      <Caja p={[24.5, 43, -27]} s={[11, 48, 55]} m={l.blanco} />
      <Caja p={[0, 43, -54]} s={[38, 48, 1]} m={l.blanco} />
      {/* panel */}
      <Caja p={[0, 76, 0.6]} s={[58, 12, 0.6]} m={m.plata} />
      <Cil p={[-16, 76, 1.4]} r={3.6} h={1.6} m={l.blanco} rot={[Math.PI / 2, 0, 0]} />
      <mesh position={[12, 76, 1]}>
        <boxGeometry args={[14, 5, 0.4]} />
        <meshStandardMaterial color="#0c1418" emissive="#35d6ff" emissiveIntensity={clip === 8 && f > 60 ? 1.6 : 0.5} />
      </mesh>
      {/* tambor */}
      <group position={[0, CY, -16]} rotation={[0, 0, -gira]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={l.tambor}>
          <cylinderGeometry args={[17.5, 17.5, 30, 56, 1, true]} />
        </mesh>
      </group>
      <mesh position={[0, CY, -31]} material={l.tambor}>
        <circleGeometry args={[17.5, 48]} />
      </mesh>
      <mesh position={[0, CY, 0.1]} material={l.goma}>
        <torusGeometry args={[18.4, 1.5, 14, 56]} />
      </mesh>
      <pointLight position={[0, CY + 10, -6]} intensity={150} distance={50} decay={1.7} color="#f2f8ff" />
      {/* calcetines */}
      {clip === 5 ? (
        <Calcetin p={[-1, CY - 15.6, -9]} r={[Math.PI / 2, 0.3, 1.1]} s={1.5} />
      ) : gira > 0 ? (
        <>
          <Calcetin p={orb(0.6, 10, -12)} r={[s * 2.2, s * 1.4, s * 1.8]} s={1.5} />
          <Calcetin p={orb(3.4, 10.5, -14)} r={[s * 1.9, 1 + s * 1.2, s * 2.4]} s={1.5} />
        </>
      ) : (
        <>
          <Calcetin p={[a1.x, a1.y, a1.z]} r={[s * 5 * (1 - entra[0]) + 1.5, s * 4 * (1 - entra[0]), 1]} s={1.5} />
          <Calcetin p={[a2.x, a2.y, a2.z]} r={[s * 4 * (1 - entra[1]) + 1.4, s * 5 * (1 - entra[1]) + 2, 0.4]} s={1.5} />
        </>
      )}
      {/* puerta redonda con bisagra a la izquierda */}
      <group position={[-20.5, CY, 1.6]} rotation={[0, -puerta, 0]}>
        <mesh position={[20.5, 0, 0]} material={m.plata} castShadow>
          <torusGeometry args={[17.4, 2.3, 16, 56]} />
        </mesh>
        <mesh position={[20.5, 0, 0.2]} material={l.vidrio}>
          <circleGeometry args={[16.4, 48]} />
        </mesh>
        <Caja p={[37.4, 0, 1.6]} s={[2.2, 8, 2]} m={l.goma} />
      </group>
    </group>
  );
};

// ---------- Clip 6: el dato real (corte lateral) ----------
const Corte: React.FC<{ f: number; fps: number; m: Mats; l: ML }> = ({ f, m, l }) => {
  // el calcetín pasa el borde del tambor y cae al espacio entre tambor y cuba
  const ruta = useMemo(() => new THREE.CatmullRomCurve3([V(-5, -11, 3), V(-3, -15, 11), V(0, -19.4, 16.4), V(0.5, -23.2, 17.4), V(0.5, -24.2, 13), V(0.5, -24.2, 6), V(0.5, -24.2, -2)]), []);
  const t = lerp(f, [24, 150], [0, 1], Easing.inOut(Easing.quad));
  const p = ruta.getPoint(t);
  const medio = (r: number, largo: number, mat: THREE.Material, z: number) => (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z]} material={mat}>
      <cylinderGeometry args={[r, r, largo, 56, 1, true, Math.PI, Math.PI]} />
    </mesh>
  );
  return (
    <group>
      <Caja p={[-40, 0, 0]} s={[1, 140, 140]} m={l.pared} />
      {/* carcasa cortada */}
      <Caja p={[-15, 31.5, 0]} s={[30, 1.6, 52]} m={l.blanco} />
      <Caja p={[-15, -31.5, 0]} s={[30, 1.6, 52]} m={l.blanco} />
      <Caja p={[-15, 0, -26]} s={[30, 62, 1.6]} m={l.blanco} />
      <Caja p={[-15, 27, 26]} s={[30, 8, 1.6]} m={l.blanco} />
      <Caja p={[-15, -27, 26]} s={[30, 8, 1.6]} m={l.blanco} />
      {/* cuba (gris) y tambor (acero perforado) */}
      {medio(27, 38, l.cuba, -1)}
      <mesh position={[0, 0, -20]} rotation={[0, 0, 0]} material={l.cuba}>
        <circleGeometry args={[27, 48, Math.PI / 2, Math.PI]} />
      </mesh>
      {medio(21, 31, l.tambor, -1)}
      <mesh position={[0, 0, -16.5]} material={l.acero}>
        <circleGeometry args={[21, 48, Math.PI / 2, Math.PI]} />
      </mesh>
      {/* bordes del corte: tambor (acero claro) y cuba (naranja) para que se lea el hueco */}
      {[21, -21].map((y) => (
        <Caja key={`t${y}`} p={[0, y, -1]} s={[1.2, 1.1, 31]} m={m.plata} />
      ))}
      <Caja p={[0, 0, -16.5]} s={[1.2, 42, 1.1]} m={m.plata} />
      {[27, -27].map((y) => (
        <mesh key={`c${y}`} position={[0, y, -1]}>
          <boxGeometry args={[1.2, 1.2, 38]} />
          <meshStandardMaterial color="#ff8a2a" emissive="#ff6a00" emissiveIntensity={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0, -20]}>
        <boxGeometry args={[1.2, 55, 1.2]} />
        <meshStandardMaterial color="#ff8a2a" emissive="#ff6a00" emissiveIntensity={0.35} />
      </mesh>
      {/* fuelle de goma y puerta */}
      <mesh position={[0, 0, 19.5]} rotation={[0, 0, Math.PI / 2]} material={l.goma}>
        <torusGeometry args={[23.5, 2.4, 14, 48, Math.PI]} />
      </mesh>
      <mesh position={[0, 0, 23]} scale={[1, 1, 0.45]} material={l.vidrio}>
        <sphereGeometry args={[19, 40, 24, Math.PI / 2, Math.PI]} />
      </mesh>
      {/* ropa dentro */}
      {[
        [-6, -15.5, -6, 6.5, "#4a6cf7"],
        [-9, -14, 4, 5.5, "#f2f2f2"],
        [-4, -16.6, 8, 4.6, "#ff6fb1"],
        [-10, -12, -11, 5, "#59c36a"],
      ].map(([x, y, z, r, c], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]} scale={[1, 0.6, 1.1]} castShadow>
          <sphereGeometry args={[r as number, 20, 14]} />
          <meshStandardMaterial color={c as string} roughness={0.95} />
        </mesh>
      ))}
      <Calcetin p={[p.x + 0.6, p.y, p.z]} r={[1.2 + t * 2.4, 0.3, 1.4 + t * 1.2]} s={1.15} />
      <Halo p={[p.x + 4, p.y, p.z]} s={11} color="#ffe07a" />
      <pointLight position={[14, p.y + 3, p.z]} intensity={70} distance={30} color="#ffe6a0" />
      <pointLight position={[30, 24, 20]} intensity={420} distance={120} decay={1.7} color="#f2f6ff" />
      <pointLight position={[26, -20, -10]} intensity={140} distance={90} decay={1.7} color="#bfdcff" />
      <Cil p={[-15, 0, -21.5]} r={3} h={5} m={m.acero} rot={[Math.PI / 2, 0, 0]} />
    </group>
  );
};

// ---------- Clip 7: el robot lo atrapa ----------
const Atrapa: React.FC<{ f: number; fps: number; l: ML }> = ({ f, fps, l }) => {
  const s = f / fps;
  const y = lerp(f, [4, 34], [22, 6.6], Easing.in(Easing.quad));
  const extras = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        p: V(-9.5 + rnd(i + 70) * 5, 0.8 + rnd(i + 71) * 3.4, -3.5 + rnd(i + 72) * 3),
        r: new THREE.Euler(rnd(i + 73) * 6, rnd(i + 74) * 6, rnd(i + 75) * 6),
        c: new THREE.Color(PALETA[i % PALETA.length]),
        s: 0.9,
      })),
    [],
  );
  return (
    <group>
      <Caja p={[0, -0.5, 0]} s={[60, 1, 30]} m={l.cuba} />
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 30, -2]} material={l.tambor}>
        <cylinderGeometry args={[23, 23, 60, 56, 1, true]} />
      </mesh>
      <Caja p={[0, 10, -12]} s={[60, 30, 1]} m={l.pared} />
      <Calcetines datos={extras} />
      <Robot anim={f < 34 ? "Idle" : "Jump"} t={f < 34 ? s : (f - 34) / fps} una={f >= 34} pos={[0, 0, 0]} rotY={0} escala={1.15} />
      <Calcetin p={[0.2, f < 34 ? y : 6.6 + Math.sin(Math.min(1, (f - 34) / 22) * Math.PI) * 2.6, 0.9]} r={[f < 34 ? s * 6 : 0.2, 0.4, Math.PI / 2]} s={0.95} />
      <pointLight position={[4, 9, 9]} intensity={95} distance={40} decay={1.7} color="#ffe6c2" />
      <pointLight position={[-10, 5, 4]} intensity={30} distance={30} color="#ff9fd0" />
      <pointLight position={[10, 5, 4]} intensity={30} distance={30} color="#8fdcff" />
    </group>
  );
};

const Escena: React.FC<{ clip: number }> = ({ clip }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = useMat();
  const l = useMatLav();
  if (clip === 1)
    return (
      <>
        <Camara pos={[0, 0.5, 9.2]} mira={[0, -2.6, -9]} fov={78} />
        <Repintar />
        <Entorno fuerza={0.38} fondo="#05070a" />
        <ambientLight intensity={0.12} />
        <DentroTambor f={f} fps={fps} l={l} conRobo />
        <Efectos bloom={0.45} />
      </>
    );
  if (clip === 2)
    return (
      <>
        <Camara pos={[0, 5, 24]} mira={[0, 4.6, 0]} fov={40} />
        <Repintar />
        <Entorno fuerza={0.1} fondo="#07060a" />
        <ambientLight intensity={0.06} />
        <Pasillo f={f} fps={fps} m={m} l={l} />
        <Efectos bloom={0.9} />
      </>
    );
  if (clip === 3 || clip === 4)
    return (
      <>
        {clip === 3 ? <Camara pos={[3, 3.6, 44]} mira={[0, 21, -32]} fov={60} /> : <Camara pos={[20, 6, 40]} mira={[3, 11, 0]} fov={46} />}
        <Repintar />
        <Entorno fuerza={0.015} fondo="#050408" />
        <ambientLight intensity={0.03} color="#8f9fff" />
        <Boveda f={f} fps={fps} clip={clip} m={m} l={l} />
        <Efectos bloom={1.0} />
      </>
    );
  if (clip === 5 || clip === 8)
    return (
      <>
        <Camara pos={[12, 44, 74]} mira={[-1, 40, 0]} fov={44} />
        <Repintar />
        <Entorno fuerza={0.55} fondo="#8fb7c9" exposicion={1.0} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[30, 80, 70]} intensity={1.7} color="#fff3e2" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={100} shadow-camera-bottom={-10} shadow-bias={-0.0005} />
        <Lavadora f={f} fps={fps} clip={clip} m={m} l={l} />
        <Efectos bloom={0.4} />
      </>
    );
  if (clip === 6)
    return (
      <>
        <Camara pos={[150, 2, 14]} mira={[0, -3, 1]} fov={31} />
        <Repintar />
        <Entorno fuerza={0.22} fondo="#0b0d12" />
        <ambientLight intensity={0.1} />
        <Corte f={f} fps={fps} m={m} l={l} />
        <Efectos bloom={0.8} />
      </>
    );
  return (
    <>
      <Camara pos={[0, 5.2, 15]} mira={[0, 4.4, 0]} fov={46} />
      <Repintar />
      <Entorno fuerza={0.12} fondo="#08070b" />
      <ambientLight intensity={0.06} />
      <Atrapa f={f} fps={fps} l={l} />
      <Efectos bloom={0.8} />
    </>
  );
};

export const CalcetinVideo: React.FC<CalcetinProps> = ({ clip }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#05070a" }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <Escena clip={clip} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
