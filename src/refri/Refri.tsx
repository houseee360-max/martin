import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Caja, Cil, Mats, Robot, texHalo, useMat } from "../enchufe/EnchufeRobot";

/**
 * "¿Qué pasa en tu refrigerador cuando cierras la puerta?"
 * Historia original con el robot (RobotExpressive, Quaternius, CC0).
 * 9 clips, una acción por clip, cámara fija, sin texto.
 */
export type RefriProps = { clip: number; efectos?: boolean };
export const RF_FPS = 30;
export const RF_W = 1080;
export const RF_H = 1920;
export const RF_DUR: Record<number, number> = { 1: 90, 2: 90, 3: 90, 4: 120, 5: 90, 6: 90, 7: 90, 8: 90, 9: 90 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number[], b: number[], e = Easing.inOut(Easing.cubic)) => interpolate(f, a, b, { ...clamp, easing: e });

// ---------- Medidas (cm) ----------
// Interior: x -15..15, y 0..42, z -16..0 (la puerta va en z=0).
const REPISA = 14.2; // superficie de la repisa del medio, donde pasa todo
const CARRIL = -7; // carril libre por donde camina el robot
const FONDO = -12.3; // fila de comida al fondo
const MAYO: [number, number] = [11, -3.2]; // frasco grande adelante a la derecha (escondite)

const useMatRefri = () =>
  useMemo(
    () => ({
      interior: new THREE.MeshStandardMaterial({ color: "#f3f6f8", roughness: 0.55 }),
      exterior: new THREE.MeshPhysicalMaterial({ color: "#e4e7ea", metalness: 0.25, roughness: 0.35, clearcoat: 0.5 }),
      goma: new THREE.MeshStandardMaterial({ color: "#2a2c30", roughness: 0.8 }),
      vidrio: new THREE.MeshPhysicalMaterial({ color: "#cfeee6", roughness: 0.08, transparent: true, opacity: 0.28, depthWrite: false }),
      cajon: new THREE.MeshPhysicalMaterial({ color: "#bfe8d0", roughness: 0.15, transparent: true, opacity: 0.3, depthWrite: false }),
      queso: new THREE.MeshStandardMaterial({ color: "#f6c22e", roughness: 0.6 }),
      quesoHoyo: new THREE.MeshStandardMaterial({ color: "#d99a12", roughness: 0.8 }),
      tupper: new THREE.MeshPhysicalMaterial({ color: "#e9f3ff", roughness: 0.2, transparent: true, opacity: 0.38, depthWrite: false }),
      tapa: new THREE.MeshStandardMaterial({ color: "#e23b2e", roughness: 0.45 }),
      pasta: new THREE.MeshStandardMaterial({ color: "#f08a2c", roughness: 0.8 }),
      mayo: new THREE.MeshPhysicalMaterial({ color: "#fbf6e6", roughness: 0.25, clearcoat: 0.6 }),
      azul: new THREE.MeshStandardMaterial({ color: "#2458c5", roughness: 0.4 }),
      rojo: new THREE.MeshStandardMaterial({ color: "#d3312b", roughness: 0.35 }),
      verde: new THREE.MeshStandardMaterial({ color: "#5fb347", roughness: 0.8 }),
      verdeOsc: new THREE.MeshStandardMaterial({ color: "#3f8f38", roughness: 0.85 }),
      leche: new THREE.MeshStandardMaterial({ color: "#fafafa", roughness: 0.5 }),
      huevo: new THREE.MeshStandardMaterial({ color: "#f0d9b8", roughness: 0.6 }),
      carton: new THREE.MeshStandardMaterial({ color: "#9aa3a8", roughness: 0.95 }),
      lata: new THREE.MeshStandardMaterial({ color: "#e0392f", metalness: 0.8, roughness: 0.3 }),
      mermelada: new THREE.MeshPhysicalMaterial({ color: "#a3122a", roughness: 0.1, transparent: true, opacity: 0.85 }),
    }),
    [],
  );
type MR = ReturnType<typeof useMatRefri>;

const Entorno: React.FC<{ fuerza: number; fondo: string; exposicion: number }> = ({ fuerza, fondo, exposicion }) => {
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

/** Queso en cuña; `mordido` le quita un bocado redondo en la punta */
const Queso: React.FC<{ mordido: boolean; m: MR }> = ({ mordido, m }) => {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    // perfil visto de frente: cuña que baja hacia la derecha (hacia el robot)
    s.moveTo(-3, 0);
    s.lineTo(-3, 4.2);
    if (mordido) {
      s.lineTo(0.6, 1.92);
      s.absarc(1.9, 1.0, 1.55, Math.PI * 0.82, Math.PI * 1.22, false);
      s.lineTo(0.4, 0);
    } else {
      s.lineTo(3.4, 0.25);
      s.lineTo(3.4, 0);
    }
    s.lineTo(-3, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 4.4, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 });
    g.translate(0, 0, -2.2);
    return g;
  }, [mordido]);
  return (
    <group position={[-9.6, REPISA, FONDO]}>
      <mesh geometry={geo} material={m.queso} castShadow receiveShadow />
      {[
        [-1.8, 2.2, 2.33, 0.5],
        [-0.4, 1.0, 2.33, 0.36],
        [-2.2, 0.8, 2.33, 0.3],
        [-1.2, 3.1, 2.33, 0.26],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} material={m.quesoHoyo} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r, r, 0.04, 20]} />
        </mesh>
      ))}
    </group>
  );
};

const Refri: React.FC<{ m: Mats; r: MR; puerta: number; verPuerta: boolean; tapa: number; mordido: boolean; luz: number }> = ({ m, r, puerta, verPuerta, tapa, mordido, luz }) => (
  <group>
    {/* Cuerpo: paredes interiores */}
    <Caja p={[0, 21, -16.4]} s={[31.6, 43.6, 0.8]} m={r.interior} />
    <Caja p={[-15.4, 21, -8]} s={[0.8, 43.6, 17.6]} m={r.interior} />
    <Caja p={[15.4, 21, -8]} s={[0.8, 43.6, 17.6]} m={r.interior} />
    <Caja p={[0, 42.4, -8]} s={[31.6, 0.8, 17.6]} m={r.interior} />
    <Caja p={[0, -0.4, -8]} s={[31.6, 0.8, 17.6]} m={r.interior} />
    {/* Carcasa exterior metálica */}
    <Caja p={[-16.3, 21, -8.5]} s={[1, 45.4, 18.6]} m={r.exterior} />
    <Caja p={[16.3, 21, -8.5]} s={[1, 45.4, 18.6]} m={r.exterior} />
    <Caja p={[0, 43.3, -8.5]} s={[33.6, 1, 18.6]} m={r.exterior} />
    <Caja p={[0, -1.3, -8.5]} s={[33.6, 1, 18.6]} m={r.exterior} />
    {/* Lámpara del techo */}
    <mesh position={[0, 41.8, -8]}>
      <boxGeometry args={[9, 0.4, 4]} />
      <meshStandardMaterial color="#ffffff" emissive="#fff6e0" emissiveIntensity={0.05 + 3.2 * luz} />
    </mesh>
    {/* Repisas de vidrio con borde */}
    {[14, 28].map((y) => (
      <group key={y}>
        <mesh position={[0, y, -8.3]} material={r.vidrio} receiveShadow>
          <boxGeometry args={[30, 0.4, 15.4]} />
        </mesh>
        <Caja p={[0, y, -0.5]} s={[30, 0.7, 0.5]} m={r.interior} />
      </group>
    ))}
    {/* Cajón de verduras */}
    <mesh position={[0, 5.2, -1.2]} material={r.cajon}>
      <boxGeometry args={[29.4, 10, 0.5]} />
    </mesh>
    <Caja p={[0, 10.6, -1.2]} s={[29.6, 0.8, 0.9]} m={r.interior} />
    <mesh position={[6, 3.4, -8]} material={r.verde} castShadow>
      <sphereGeometry args={[3.4, 24, 18]} />
    </mesh>
    <mesh position={[8.4, 4.6, -6.4]} material={r.verdeOsc} castShadow>
      <sphereGeometry args={[2.1, 20, 14]} />
    </mesh>
    {[
      [-9, 1.6, -5],
      [-11.4, 1.6, -8],
      [0.5, 1.6, -11],
    ].map(([x, y, z], i) => (
      <mesh key={i} position={[x, y, z]} material={r.rojo} castShadow>
        <sphereGeometry args={[1.6, 20, 16]} />
      </mesh>
    ))}
    {/* Repisa de arriba: leche, huevos, latas, mermelada */}
    <group position={[-10.5, 28.2, -9]}>
      <Caja p={[0, 4.5, 0]} s={[4.4, 9, 4.4]} m={r.leche} />
      <Caja p={[0, 7.2, 0]} s={[4.5, 2.2, 4.5]} m={r.azul} />
      <Caja p={[0, 10, 0]} s={[4.4, 2.2, 0.5]} m={r.leche} r={[0.5, 0, 0]} />
    </group>
    <group position={[1, 28.2, -8]}>
      <Caja p={[0, 0.9, 0]} s={[9, 1.8, 5]} m={r.carton} />
      {[-3, -1, 1, 3].map((x) =>
        [-1.1, 1.1].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 2.1, z]} material={r.huevo} scale={[1, 1.25, 1]} castShadow>
            <sphereGeometry args={[0.85, 16, 14]} />
          </mesh>
        )),
      )}
    </group>
    {[9.6, 12.4].map((x, i) => (
      <group key={i} position={[x, 28.2, -9 - i * 2.4]}>
        <Cil p={[0, 3, 0]} r={1.25} h={6} m={r.lata} />
        <Cil p={[0, 6.05, 0]} r={1.1} h={0.1} m={m.plata} />
      </group>
    ))}
    <group position={[7, 28.2, -4.4]}>
      <Cil p={[0, 2.3, 0]} r={1.7} h={4.6} m={r.mermelada} />
      <Cil p={[0, 4.9, 0]} r={1.8} h={0.7} m={m.plata} />
    </group>
    {/* Repisa del medio: queso, tupper y mayonesa */}
    <Queso mordido={mordido} m={r} />
    <group position={[2.5, REPISA, FONDO]}>
      <mesh position={[0, 1.9, 0]} material={r.tupper}>
        <boxGeometry args={[8, 3.8, 6]} />
      </mesh>
      <Caja p={[0, 1.3, 0]} s={[7.2, 2.4, 5.2]} m={r.pasta} />
      {/* tapa con bisagra atrás */}
      <group position={[0, 3.9, -3]} rotation={[-tapa * 1.25, 0, 0]}>
        <Caja p={[0, 0.25, 3]} s={[8.4, 0.5, 6.4]} m={r.tapa} />
      </group>
    </group>
    <group position={[MAYO[0], REPISA, MAYO[1]]}>
      <Cil p={[0, 3.6, 0]} r={2.9} h={7.2} m={r.mayo} seg={48} />
      <Cil p={[0, 3.4, 0]} r={2.93} h={3} m={r.azul} seg={48} />
      <Cil p={[0, 7.9, 0]} r={2.6} h={1.4} m={r.azul} seg={48} />
    </group>
    {/* Interruptor en la pared izquierda */}
    <group position={[-14.9, 20.4, CARRIL]}>
      <Caja p={[0, 0, 0]} s={[0.3, 4.4, 3]} m={m.plata} />
      <Caja p={[0.5, luz > 0.5 ? 0.8 : -0.8, 0]} s={[1, 1.5, 1]} m={r.rojo} r={[0, 0, luz > 0.5 ? 0.4 : -0.4]} />
    </group>
    {/* Puerta con bisagra a la izquierda */}
    {verPuerta ? (
      <group position={[-16.8, 21, 0.2]} rotation={[0, -puerta, 0]}>
        <Caja p={[16.8, 0, 1.4]} s={[33.6, 45.4, 2.6]} m={r.exterior} />
        <Caja p={[16.8, 0, 0.05]} s={[31.6, 43.4, 0.3]} m={r.interior} />
        <Caja p={[30.4, 0, 3.4]} s={[1.2, 20, 1.6]} m={r.goma} />
      </group>
    ) : null}
  </group>
);

const Cocina: React.FC<{ m: Mats }> = ({ m }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 20]} material={m.piso} receiveShadow>
      <planeGeometry args={[220, 160]} />
    </mesh>
    <Caja p={[0, 60, -18.4]} s={[220, 130, 0.6]} m={m.yeso} />
    <Caja p={[-60, 20.5, -9]} s={[52, 44.6, 18]} m={m.madera} />
    <Caja p={[62, 20.5, -9]} s={[56, 44.6, 18]} m={m.madera} />
    <Caja p={[0, 44.9, -9]} s={[180, 2, 19]} m={m.corte} />
  </group>
);

// ---------- Cámaras ----------
const CAM: Record<number, { pos: [number, number, number]; mira: [number, number, number]; fov: number }> = {
  1: { pos: [46, 38, 120], mira: [6, 22, 0], fov: 34 },
  2: { pos: [2, 9, 20], mira: [-3, 4.6, -7], fov: 40 },
  3: { pos: [-2, 22, 9], mira: [-11.5, 18.2, CARRIL], fov: 42 },
  4: { pos: [0, 19.5, 9], mira: [0, 17.4, CARRIL], fov: 44 },
  5: { pos: [-5, 24, 2.5], mira: [5, 16.6, FONDO], fov: 46 },
  6: { pos: [-5.5, 21, 4.5], mira: [-6.2, 16.6, FONDO], fov: 48 },
  7: { pos: [0, 21, 19], mira: [2, 17.4, CARRIL], fov: 44 },
  8: { pos: [-3, 23, 30], mira: [-3.5, 18, -8], fov: 46 },
  9: { pos: [4, 20.5, 21], mira: [8.6, 17.8, -4], fov: 36 },
};
const Camara: React.FC<{ clip: number }> = ({ clip }) => {
  const { camera } = useThree();
  const c = CAM[clip];
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = c.fov;
  cam.near = 0.1;
  cam.far = 600;
  cam.position.set(...c.pos);
  cam.lookAt(...c.mira);
  cam.updateProjectionMatrix();
  return null;
};

/** El lienzo solo se pinta al cambiar de cuadro: forzar un segundo pintado (entorno y efectos ya listos) */
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

const Halo: React.FC<{ p: [number, number, number]; s: number; color: string }> = ({ p, s, color }) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: texHalo(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), [color]);
  return <sprite position={p} scale={[s, s, s]} material={mat} />;
};

const Escena: React.FC<{ clip: number; efectos: boolean }> = ({ clip, efectos }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = useMat();
  const r = useMatRefri();
  const s = f / fps;

  // ----- Estado por clip (una acción cada uno) -----
  const puerta = clip === 1 ? lerp(f, [10, 62], [1.25, 0], Easing.in(Easing.quad)) : clip >= 7 ? (clip === 7 ? lerp(f, [4, 50], [0, 1.5], Easing.out(Easing.cubic)) : 1.5) : 0;
  const cerrada = puerta < 0.04;
  const encendido3 = f >= 34; // el golpe al interruptor
  // luz normal del refri (se apaga al cerrar), luz de "fiesta" que prende el robot
  const luzNormal = clip === 1 ? (cerrada ? 0 : 1) : clip === 7 ? lerp(f, [4, 14], [0, 1]) : clip >= 8 ? 1 : 0;
  const fiesta = clip === 3 ? (encendido3 ? 1 : 0) : clip >= 4 && clip <= 6 ? 1 : clip === 7 ? 1 - lerp(f, [4, 12], [0, 1]) : 0;
  const linterna = clip === 2 ? lerp(f, [24, 30], [0, 1]) : clip === 3 && !encendido3 ? 1 : 0;
  const tapa = clip === 5 ? lerp(f, [26, 62], [0, 1], Easing.out(Easing.back(1.6))) : clip === 6 || clip === 7 ? 1 : clip === 8 ? 0.16 * (1 - lerp(f, [30, 40], [0, 1], Easing.in(Easing.quad))) : clip === 9 ? 0 : 0;
  const mordido = (clip === 6 && f >= 44) || clip >= 7;
  const oscuro = clip === 2 || (clip === 3 && !encendido3) || (clip === 1 && cerrada);

  const robot = (() => {
    const y = REPISA;
    if (clip === 2) {
      // asoma detrás de la lechuga, dentro del cajón
      const sube = lerp(f, [30, 70], [-4.4, 0.2], Easing.out(Easing.cubic));
      return <Robot anim="Idle" t={s} pos={[-3, sube, -7.5]} rotY={0.25} escala={1} />;
    }
    if (clip === 3) return <Robot anim="Punch" t={Math.max(0, (f - 22) / fps)} una pos={[-11.2, y, CARRIL]} rotY={-Math.PI / 2} escala={1} />;
    if (clip === 4) return <Robot anim="Dance" t={s} pos={[0, y, CARRIL]} rotY={0} escala={1} />;
    if (clip === 5) return <Robot anim="Yes" t={Math.max(0, (f - 50) / fps)} pos={[9.3, y, FONDO + 0.4]} rotY={-Math.PI / 2} escala={1} />;
    if (clip === 6) {
      const x = f < 44 ? -4.4 : -4.4 + lerp(f, [44, 56], [0, 0.4]);
      return <Robot anim={f < 62 ? "Punch" : "Yes"} t={f < 62 ? Math.max(0, (f - 30) / fps) : (f - 62) / fps} una={f < 62} pos={[x, y, FONDO + 0.2]} rotY={-Math.PI / 2} escala={1} />;
    }
    if (clip === 7) {
      const x = lerp(f, [8, 60], [-5, MAYO[0] + 0.3], Easing.inOut(Easing.sin));
      return <Robot anim={f < 8 ? "Idle" : f < 60 ? "Running" : "Idle"} t={s * 1.4} pos={[x, y, CARRIL]} rotY={Math.PI / 2} escala={1} />;
    }
    if (clip === 9) {
      const x = MAYO[0] + 0.3 - lerp(f, [14, 50], [0, 4.6], Easing.out(Easing.cubic));
      return <Robot anim="Yes" t={s} pos={[x, y, CARRIL + 0.6]} rotY={0.25} escala={1} />;
    }
    return null; // clips 1 y 8: escondido
  })();

  // migas del mordisco
  const migas =
    clip === 6 && f >= 44 && f < 80
      ? Array.from({ length: 9 }, (_, i) => {
          const t = (f - 44) / fps;
          const a = i * 0.7;
          return (
            <mesh key={i} position={[-7.4 + Math.cos(a) * 3 * t + t * 1.5, REPISA + 1.6 + (4 + (i % 3)) * t - 22 * t * t, FONDO + Math.sin(a) * 2.4 * t + 1]} material={r.queso} visible={REPISA + 1.6 + (4 + (i % 3)) * t - 22 * t * t > REPISA}>
              <boxGeometry args={[0.28, 0.28, 0.28]} />
            </mesh>
          );
        })
      : null;

  const colores = ["#ff3fa4", "#35d6ff", "#ffd23f"];
  const exterior = clip === 1;
  return (
    <>
      <Camara clip={clip} />
      <Repintar />
      <Entorno fuerza={oscuro ? 0.02 : exterior ? 0.5 : 0.12 + 0.3 * luzNormal + 0.14 * fiesta} fondo={exterior ? "#3a332c" : "#07090c"} exposicion={exterior ? 1.0 : 1.05} />
      <ambientLight intensity={oscuro ? 0.015 : 0.12} color={oscuro ? "#6f8cff" : "#ffffff"} />
      {exterior ? (
        <>
          <directionalLight position={[30, 60, 70]} intensity={1.9} color="#fff1dc" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={70} shadow-camera-bottom={-20} shadow-bias={-0.0005} />
          <Cocina m={m} />
        </>
      ) : null}
      {/* Luz propia del refrigerador */}
      <pointLight position={[0, 39, -7]} intensity={75 * luzNormal} distance={90} decay={1.7} color="#f4f8ff" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.002} />
      {/* Luz de fiesta (cálida) + colores que giran */}
      <pointLight position={[0, 26.5, -6]} intensity={48 * fiesta} distance={70} decay={1.7} color="#ffcf8f" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.002} />
      <pointLight position={[-13, 24, -3]} intensity={16 * fiesta} distance={34} decay={1.6} color="#ff4fa8" />
      <pointLight position={[13, 24, -3]} intensity={16 * fiesta} distance={34} decay={1.6} color="#3fd2ff" />
      {fiesta > 0 && clip === 4
        ? colores.map((c, i) => {
            const a = s * 2.6 + (i * Math.PI * 2) / 3;
            const pulso = 0.55 + 0.45 * Math.sin(s * 12.6 + i * 2);
            return <pointLight key={c} position={[Math.cos(a) * 9, 22, CARRIL + Math.sin(a) * 5]} intensity={46 * pulso} distance={40} decay={1.6} color={c} />;
          })
        : null}
      {/* Luz que entra al abrir la puerta */}
      {clip === 7 ? <directionalLight position={[10, 30, 60]} intensity={1.1 * lerp(f, [4, 40], [0, 1])} color="#fff4e2" /> : null}
      {clip >= 8 ? <directionalLight position={[10, 30, 60]} intensity={0.9} color="#fff4e2" /> : null}
      {/* Linterna del robot */}
      {linterna > 0 ? (
        <>
          <pointLight position={clip === 2 ? [-1.6, 4.6, -5.4] : [-10.4, 17.2, CARRIL + 1.4]} intensity={22 * linterna} distance={26} decay={1.6} color="#fff3c4" />
          <Halo p={clip === 2 ? [-1.4, 3.3 + lerp(f, [30, 70], [-4.4, 0.2], Easing.out(Easing.cubic)), -5.2] : [-10.2, 17, CARRIL + 1.7]} s={3.4 * linterna} color="#fff0b8" />
        </>
      ) : null}
      <Refri m={m} r={r} puerta={puerta} verPuerta={clip === 1} tapa={tapa} mordido={mordido} luz={Math.max(luzNormal, fiesta)} />
      {robot}
      {migas}
      {efectos ? (
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette offset={0.28} darkness={0.62} />
        </EffectComposer>
      ) : null}
    </>
  );
};

export const RefriVideo: React.FC<RefriProps> = ({ clip, efectos = true }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#07090c" }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <Escena clip={clip} efectos={efectos} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
