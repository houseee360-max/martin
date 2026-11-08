import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Historia original: un robot diminuto vive dentro de la pared y genera la
 * electricidad pedaleando cuando enchufas tu cargador.
 * 9 clips, cada uno con UNA acción, cámara fija, sin texto.
 * Robot: "RobotExpressive" (Quaternius, CC0).
 */
export type RobotProps = { clip: number };
export const ER_FPS = 30;
export const ER_W = 1080;
export const ER_H = 1920;
export const ER_DUR: Record<number, number> = { 1: 90, 2: 120, 3: 90, 4: 90, 5: 120, 6: 90, 7: 90, 8: 90, 9: 90 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (f: number, a: number[], b: number[], e = Easing.inOut(Easing.cubic)) => interpolate(f, a, b, { ...clamp, easing: e });
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------- Texturas generadas (sin imágenes externas) ----------
const lienzo = (w: number, h: number, dibujar: (x: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  dibujar(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
const texMadera = () =>
  lienzo(512, 512, (x) => {
    const tonos = ["#8a5a35", "#7d5030", "#94633b", "#6f4628", "#87582f"];
    for (let i = 0; i < 8; i++) {
      x.fillStyle = tonos[i % tonos.length];
      x.fillRect(0, i * 64, 512, 64);
      for (let k = 0; k < 40; k++) {
        x.strokeStyle = `rgba(40,20,8,${0.05 + Math.random() * 0.12})`;
        x.beginPath();
        const y = i * 64 + Math.random() * 64;
        x.moveTo(0, y);
        x.bezierCurveTo(170, y + Math.random() * 6 - 3, 340, y + Math.random() * 6 - 3, 512, y);
        x.stroke();
      }
      x.fillStyle = "rgba(20,10,4,.55)";
      x.fillRect(0, i * 64, 512, 2);
      x.fillRect(((i * 197) % 400) + 40, i * 64, 2, 64);
    }
  });
const texPapel = () =>
  lienzo(512, 512, (x) => {
    x.fillStyle = "#d9c7a6";
    x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? "rgba(150,110,70,.10)" : "rgba(255,255,255,.06)";
      x.fillRect(i * 32, 0, 16, 512);
    }
  });
const texPantalla = () =>
  lienzo(400, 800, (x) => {
    x.fillStyle = "#05060a";
    x.fillRect(0, 0, 400, 800);
    // batería casi vacía + rayo de carga (sin texto)
    x.strokeStyle = "#f2f2f2";
    x.lineWidth = 14;
    x.beginPath();
    x.roundRect(90, 300, 200, 110, 22);
    x.stroke();
    x.fillStyle = "#f2f2f2";
    x.beginPath();
    x.roundRect(296, 330, 18, 50, 6);
    x.fill();
    x.fillStyle = "#ff3b30";
    x.beginPath();
    x.roundRect(106, 316, 16, 78, 8);
    x.fill();
    x.fillStyle = "#34c759";
    x.beginPath();
    x.moveTo(205, 470);
    x.lineTo(160, 560);
    x.lineTo(196, 560);
    x.lineTo(180, 640);
    x.lineTo(240, 535);
    x.lineTo(204, 535);
    x.lineTo(222, 470);
    x.closePath();
    x.fill();
  });
const texHalo = (() => {
  let t: THREE.Texture | null = null;
  return () =>
    (t ??= lienzo(128, 128, (x) => {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(255,255,255,.75)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
    }));
})();

const useMat = () =>
  useMemo(() => {
    const madera = texMadera();
    madera.wrapS = madera.wrapT = THREE.RepeatWrapping;
    madera.repeat.set(2, 2);
    const maderaPiso = texMadera();
    maderaPiso.wrapS = maderaPiso.wrapT = THREE.RepeatWrapping;
    maderaPiso.repeat.set(4, 4);
    return {
      yeso: new THREE.MeshStandardMaterial({ color: "#efebe4", roughness: 0.9 }),
      corte: new THREE.MeshStandardMaterial({ color: "#c9bfae", roughness: 1 }),
      ladrilloInt: new THREE.MeshStandardMaterial({ map: texPapel(), roughness: 0.85 }),
      madera: new THREE.MeshStandardMaterial({ map: madera, roughness: 0.6 }),
      piso: new THREE.MeshStandardMaterial({ map: maderaPiso, roughness: 0.45, metalness: 0.05 }),
      placa: new THREE.MeshPhysicalMaterial({ color: "#f8f7f3", roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.15 }),
      hueco: new THREE.MeshStandardMaterial({ color: "#0d0d0d", roughness: 0.9 }),
      cargador: new THREE.MeshPhysicalMaterial({ color: "#f4f4f2", roughness: 0.35, clearcoat: 0.4 }),
      plata: new THREE.MeshStandardMaterial({ color: "#dfe2e6", metalness: 1, roughness: 0.2 }),
      cobre: new THREE.MeshStandardMaterial({ color: "#d77b4b", metalness: 1, roughness: 0.28 }),
      acero: new THREE.MeshStandardMaterial({ color: "#8d949c", metalness: 0.9, roughness: 0.35 }),
      rojo: new THREE.MeshStandardMaterial({ color: "#c8302b", metalness: 0.3, roughness: 0.35 }),
      goma: new THREE.MeshStandardMaterial({ color: "#1b1b1d", roughness: 0.8 }),
      tela: new THREE.MeshStandardMaterial({ color: "#3e6fb0", roughness: 0.95 }),
      almohada: new THREE.MeshStandardMaterial({ color: "#f3efe6", roughness: 0.95 }),
      vidrio: new THREE.MeshPhysicalMaterial({ color: "#0b0c10", roughness: 0.08, metalness: 0.2, clearcoat: 1 }),
    };
  }, []);
type Mats = ReturnType<typeof useMat>;

const Caja: React.FC<{ p: [number, number, number]; s: [number, number, number]; m: THREE.Material; r?: [number, number, number] }> = ({ p, s, m, r }) => (
  <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
    <boxGeometry args={s} />
  </mesh>
);
const Cil: React.FC<{ p: [number, number, number]; r: number; h: number; m: THREE.Material; rot?: [number, number, number]; seg?: number }> = ({ p, r, h, m, rot, seg = 40 }) => (
  <mesh position={p} rotation={rot} material={m} castShadow receiveShadow>
    <cylinderGeometry args={[r, r, h, seg]} />
  </mesh>
);
const Tubo: React.FC<{ c: THREE.Curve<THREE.Vector3>; r: number; m: THREE.Material }> = ({ c, r, m }) => {
  const g = useMemo(() => new THREE.TubeGeometry(c, 140, r, 16, false), [c, r]);
  return <mesh geometry={g} material={m} castShadow receiveShadow />;
};

const Entorno: React.FC = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.32;
    scene.background = new THREE.Color("#2a2420");
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.92;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    return () => {
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  return null;
};

// ---------- Mundo (cm) ----------
// Pared frontal en z=0. Enchufe en (0, 6). Cuarto secreto: x -12..12, y -14..2, z -10..-0.8.
// Piso exterior en y=-20.
const PISO_CUARTO = -14;
const SLOT_Y = 6.85;

const Pared: React.FC<{ abrir: number; m: Mats }> = ({ abrir, m }) => (
  <group>
    {/* Pared exterior con el hueco del cuarto */}
    <Caja p={[-28, 0, -6]} s={[32, 60, 12]} m={m.yeso} />
    <Caja p={[28, 0, -6]} s={[32, 60, 12]} m={m.yeso} />
    <Caja p={[0, 16, -6]} s={[24, 28, 12]} m={m.yeso} />
    <Caja p={[0, -17, -6]} s={[24, 6, 12]} m={m.yeso} />
    {/* Zócalo y piso exterior */}
    <Caja p={[0, -19, 0.4]} s={[80, 2, 0.8]} m={m.madera} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 20]} material={m.piso} receiveShadow>
      <planeGeometry args={[120, 40]} />
    </mesh>
    {/* Tapa de pared que se abre (bisagra abajo, cae hacia adelante) */}
    <group position={[0, PISO_CUARTO, 0]} rotation={[abrir * 1.45, 0, 0]}>
      <Caja p={[0, 8, -0.4]} s={[24, 16, 0.8]} m={m.yeso} />
      <Caja p={[0, 8, -0.85]} s={[23.6, 15.6, 0.1]} m={m.corte} />
    </group>
  </group>
);

const Enchufe: React.FC<{ m: Mats }> = ({ m }) => (
  <group position={[0, 6, 0]}>
    <Caja p={[0, 0, 0.25]} s={[7, 11.4, 0.5]} m={m.placa} />
    <Cil p={[0, 0, 0.6]} r={2.2} h={0.25} m={m.placa} rot={[Math.PI / 2, 0, 0]} seg={64} />
    <Caja p={[-0.65, 0.85, 0.74]} s={[0.26, 0.82, 0.04]} m={m.hueco} />
    <Caja p={[0.65, 0.93, 0.74]} s={[0.26, 1.0, 0.04]} m={m.hueco} />
    <Cil p={[0, -1.15, 0.74]} r={0.3} h={0.04} m={m.hueco} rot={[Math.PI / 2, 0, 0]} />
    <Cil p={[0, 3.9, 0.52]} r={0.32} h={0.1} m={m.plata} rot={[Math.PI / 2, 0, 0]} />
    <Cil p={[0, -4.1, 0.52]} r={0.32} h={0.1} m={m.plata} rot={[Math.PI / 2, 0, 0]} />
  </group>
);

/** Cargador de celular (2 patas). z = distancia a la placa */
const Cargador: React.FC<{ z: number; m: Mats }> = ({ z, m }) => {
  const cable = useMemo(() => new THREE.CatmullRomCurve3([V(0, 5.2, 2.6), V(1.5, 3.6, 3.4), V(10, 2.6, 2.4), V(14.5, -4, 1.4), V(15, -16, 1.6), V(14, -19.7, 6), V(8, -19.7, 18), V(3.5, -19.7, 22.5)]), []);
  return (
    <group position={[0, 0, z]}>
      <Caja p={[-0.65, SLOT_Y, 0.2]} s={[0.12, 0.62, 1.4]} m={m.plata} />
      <Caja p={[0.65, SLOT_Y, 0.2]} s={[0.12, 0.62, 1.4]} m={m.plata} />
      <mesh position={[0, 6.5, 1.85]} material={m.cargador} castShadow>
        <boxGeometry args={[2.6, 2.8, 2.2]} />
      </mesh>
      <Tubo c={cable} r={0.18} m={m.cargador} />
    </group>
  );
};

// ---------- Cuarto secreto ----------
const BICI_X = 2.5;
const GEN = V(8.4, PISO_CUARTO + 1.6, -5);
const VOLANTE = V(BICI_X - 0.6, PISO_CUARTO + 1.9, -5);

const Cuarto: React.FC<{ f: number; m: Mats; giro: number; baliza: number; aguja: number; rayosX: number }> = ({ f, m, giro, baliza, aguja, rayosX }) => {
  const correa = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const r1 = 1.6;
    const r2 = 0.6;
    for (let a = 0; a <= Math.PI; a += 0.1) pts.push(V(VOLANTE.x - Math.sin(a) * r1, VOLANTE.y + Math.cos(a) * r1, -5.9));
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.1) pts.push(V(GEN.x + 0.9 - Math.sin(a) * r2, GEN.y + 0.3 + Math.cos(a) * r2, -5.9));
    return new THREE.CatmullRomCurve3(pts, true);
  }, []);
  const cables = useMemo(
    () => [
      new THREE.CatmullRomCurve3([V(GEN.x, GEN.y + 1.6, -5.4), V(GEN.x, 0.5, -6.5), V(4, 1.6, -6), V(-0.4, 2.2, -3), V(-0.65, SLOT_Y - 0.3, -1.4)]),
      new THREE.CatmullRomCurve3([V(GEN.x + 0.5, GEN.y + 1.6, -4.6), V(GEN.x + 0.5, 0.5, -5.5), V(4.6, 1.6, -5), V(0.6, 2.2, -2.4), V(0.65, SLOT_Y - 0.3, -1.4)]),
    ],
    [],
  );
  const haloGen = useMemo(() => new THREE.SpriteMaterial({ map: texHalo(), color: "#86d9ff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const parpadeoBaliza = baliza * (0.55 + 0.45 * Math.sin(f * 0.9));
  return (
    <group>
      {/* Paredes del cuarto */}
      <Caja p={[0, -6, -10.4]} s={[24, 18, 0.8]} m={m.ladrilloInt} />
      <Caja p={[-12.2, -6, -5.4]} s={[0.4, 18, 10]} m={m.corte} />
      <Caja p={[12.2, -6, -5.4]} s={[0.4, 18, 10]} m={m.corte} />
      <Caja p={[0, 2.2, -5.4]} s={[24.8, 0.4, 10]} m={m.corte} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PISO_CUARTO, -5.4]} material={m.piso} receiveShadow>
        <planeGeometry args={[24, 10]} />
      </mesh>
      {/* Cama */}
      <group position={[-8, PISO_CUARTO, -5.6]}>
        <Caja p={[0, 0.6, 0]} s={[6.4, 1.2, 3.4]} m={m.madera} />
        <Caja p={[0, 1.45, 0]} s={[6, 0.6, 3.1]} m={m.almohada} />
        <Caja p={[0.6, 1.8, 0]} s={[4.2, 0.18, 3.15]} m={m.tela} />
        <Caja p={[-2.4, 1.95, 0]} s={[1.2, 0.5, 2]} m={m.almohada} />
        <Caja p={[-3.2, 1.6, 0]} s={[0.3, 3.2, 3.4]} m={m.madera} />
      </group>
      {/* Lámpara de pared (luz cálida) */}
      <Cil p={[-3.5, -4.5, -9.6]} r={0.5} h={0.8} m={m.acero} rot={[Math.PI / 2, 0, 0]} />
      <mesh position={[-3.5, -5.2, -9.2]}>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshStandardMaterial color="#fff1c9" emissive="#ffcf7a" emissiveIntensity={2.5} />
      </mesh>
      <pointLight position={[-3.5, -5.6, -8.4]} intensity={18} distance={22} decay={1.6} color="#ffc98a" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      {/* Baliza roja en el techo */}
      <group position={[0, 1.6, -5]}>
        <Cil p={[0, 0.3, 0]} r={0.7} h={0.3} m={m.acero} />
        <mesh position={[0, -0.2, 0]}>
          <sphereGeometry args={[0.6, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#ff4a3a" emissive="#ff2a1a" emissiveIntensity={0.2 + 3 * parpadeoBaliza} transparent opacity={0.9} />
        </mesh>
        <pointLight position={[0, -1, 0]} intensity={30 * parpadeoBaliza} distance={20} decay={1.5} color="#ff3020" />
      </group>
      {/* Medidor en la pared (sin números) */}
      <group position={[3.5, -5.2, -9.9]}>
        <Cil p={[0, 0, 0.1]} r={1.5} h={0.2} m={m.acero} rot={[Math.PI / 2, 0, 0]} />
        <Cil p={[0, 0, 0.22]} r={1.3} h={0.05} m={m.almohada} rot={[Math.PI / 2, 0, 0]} />
        <mesh position={[0, 0, 0.27]} rotation={[0, 0, Math.PI / 2 - aguja * Math.PI]}>
          <boxGeometry args={[1.1, 0.08, 0.04]} />
          <meshStandardMaterial color="#c8302b" />
        </mesh>
        <mesh position={[0.95, 0.55, 0.26]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.4, 0.16, 0.02]} />
          <meshStandardMaterial color="#c8302b" />
        </mesh>
      </group>
      {/* Bicicleta fija */}
      <group>
        <Cil p={[VOLANTE.x, VOLANTE.y, -5]} r={1.6} h={0.35} m={m.acero} rot={[Math.PI / 2, 0, 0]} seg={48} />
        <group position={[VOLANTE.x, VOLANTE.y, -5]} rotation={[0, 0, -giro]}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Caja key={i} p={[0, 0, -0.2]} s={[3, 0.12, 0.08]} m={m.goma} r={[0, 0, (i * Math.PI) / 6]} />
          ))}
        </group>
        <Cil p={[VOLANTE.x, VOLANTE.y, -4.4]} r={0.22} h={2.2} m={m.acero} rot={[Math.PI / 2, 0, 0]} />
        <Tubo c={useMemo(() => new THREE.CatmullRomCurve3([V(BICI_X - 2.4, PISO_CUARTO + 0.2, -5), V(BICI_X - 0.6, PISO_CUARTO + 1.9, -5), V(BICI_X + 0.6, PISO_CUARTO + 4.6, -5)]), [])} r={0.16} m={m.rojo} />
        <Tubo c={useMemo(() => new THREE.CatmullRomCurve3([V(BICI_X - 0.6, PISO_CUARTO + 1.9, -5), V(BICI_X + 1.6, PISO_CUARTO + 2.6, -5), V(BICI_X + 3, PISO_CUARTO + 5.2, -5)]), [])} r={0.16} m={m.rojo} />
        <Caja p={[BICI_X - 0.2, PISO_CUARTO + 0.15, -5]} s={[5, 0.3, 2.6]} m={m.goma} />
        <Caja p={[BICI_X + 0.6, PISO_CUARTO + 4.8, -5]} s={[1.3, 0.3, 0.8]} m={m.goma} />
        <Caja p={[BICI_X + 3, PISO_CUARTO + 5.3, -5]} s={[0.2, 0.2, 2.4]} m={m.goma} />
        {/* Pedales girando */}
        {[0, Math.PI].map((d, i) => (
          <group key={i}>
            <Caja p={[VOLANTE.x + Math.cos(giro + d) * 0.45, VOLANTE.y + Math.sin(giro + d) * 0.45, i ? -5.5 : -3.6]} s={[0.9, 0.12, 0.12]} m={m.acero} r={[0, 0, giro + d]} />
            <Caja p={[VOLANTE.x + Math.cos(giro + d) * 0.9, VOLANTE.y + Math.sin(giro + d) * 0.9, i ? -5.7 : -3.1]} s={[0.8, 0.16, 0.9]} m={m.goma} />
          </group>
        ))}
      </group>
      {/* Correa al generador */}
      <Tubo c={correa} r={0.08} m={m.goma} />
      {/* Generador: carcasa que se vuelve transparente (rayos X) y bobinas de cobre */}
      <group position={[GEN.x, GEN.y, GEN.z]}>
        <mesh castShadow>
          <cylinderGeometry args={[1.6, 1.6, 3, 40]} />
          <meshPhysicalMaterial color="#2f6db5" metalness={0.5} roughness={0.35} transparent opacity={1 - 0.8 * rayosX} depthWrite={rayosX < 0.5} />
        </mesh>
        <group rotation={[0, giro * 0.8, 0]}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI) / 3) * 0.9, 0, Math.sin((i * Math.PI) / 3) * 0.9]} material={m.cobre}>
              <torusGeometry args={[0.38, 0.18, 12, 24]} />
            </mesh>
          ))}
        </group>
        <Cil p={[0, 1.65, 0]} r={1.7} h={0.3} m={m.acero} />
        <Cil p={[0, -1.65, 0]} r={1.7} h={0.3} m={m.acero} />
        <Cil p={[0.9, 0.3, -0.9]} r={0.6} h={0.4} m={m.acero} rot={[Math.PI / 2, 0, 0]} />
        {rayosX > 0 ? <pointLight intensity={14 * rayosX} distance={10} color="#7fd6ff" /> : null}
        {rayosX > 0 ? <sprite scale={[6 * rayosX, 6 * rayosX, 1]} material={haloGen} /> : null}
      </group>
      {/* Cables de cobre hacia el enchufe */}
      {cables.map((c, i) => (
        <Tubo key={i} c={c} r={0.14} m={m.cobre} />
      ))}
    </group>
  );
};
export const CABLE_ENERGIA = new THREE.CatmullRomCurve3([V(GEN.x, GEN.y + 1.6, -5.4), V(GEN.x, 0.5, -6.5), V(4, 1.6, -6), V(-0.4, 2.2, -3), V(-0.65, SLOT_Y - 0.3, -1.4), V(-0.65, SLOT_Y, 1), V(0, 5.2, 2.6), V(1.5, 3.6, 3.4), V(10, 2.6, 2.4), V(14.5, -4, 1.4)]);

/** Pulsos de energía por una curva */
const Energia: React.FC<{ c: THREE.Curve<THREE.Vector3>; f: number; a: number; b: number; color?: string }> = ({ c, f, a, b, color = "#9be2ff" }) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: texHalo(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }), [color]);
  const out = [];
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 6; i++) {
      const u = ((((f - a) / (b - a) - k / 3 - i * 0.02) % 1) + 1) % 1;
      if (f < a + (k * (b - a)) / 3) continue;
      const s = 1.3 - i * 0.15;
      out.push(<sprite key={`${k}-${i}`} position={c.getPoint(u)} scale={[s, s, s]} material={mat} />);
    }
  }
  return <group>{out}</group>;
};

// ---------- Robot ----------
const useRobot = () => {
  const { advance } = useThree();
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [handle] = useState(() => delayRender("robot"));
  useEffect(() => {
    new GLTFLoader().load(staticFile("enchufe/robot.glb"), (g) => {
      g.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      setGltf(g);
    }, undefined, (e) => console.error("Robot no cargó", String(e)));
  }, []);
  useEffect(() => {
    if (!gltf) return;
    // esperar a que React y three pinten el robot antes de capturar el cuadro
    // el lienzo solo se repinta al cambiar de cuadro: forzar un repintado con el robot ya montado
    const id = requestAnimationFrame(() => {
      advance(performance.now());
      requestAnimationFrame(() => continueRender(handle));
    });
    return () => cancelAnimationFrame(id);
  }, [gltf, handle, advance]);
  const mixer = useMemo(() => (gltf ? new THREE.AnimationMixer(gltf.scene) : null), [gltf]);
  return { gltf, mixer };
};

const Robot: React.FC<{ anim: string; t: number; pos: [number, number, number]; rotY: number; una?: boolean; escala?: number }> = ({ anim, t, pos, rotY, una = false, escala = 0.62 }) => {
  const { gltf, mixer } = useRobot();
  if (!gltf || !mixer) return null;
  const clip = gltf.animations.find((a) => a.name === anim)!;
  mixer.stopAllAction();
  const act = mixer.clipAction(clip);
  act.reset();
  act.setLoop(una ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  act.clampWhenFinished = true;
  act.play();
  mixer.setTime(una ? Math.min(t, clip.duration - 0.001) : t);
  return <primitive object={gltf.scene} position={pos} rotation={[0, rotY, 0]} scale={escala} />;
};

// ---------- Cámaras y clips ----------
const CAM: Record<number, { pos: [number, number, number]; mira: [number, number, number]; fov: number }> = {
  1: { pos: [9, 4, 20], mira: [0, 5.6, 0], fov: 32 },
  2: { pos: [0, -2, 40], mira: [0, -5, -4], fov: 36 },
  3: { pos: [-2, -7.5, 9], mira: [-8, -11.6, -5.6], fov: 40 },
  4: { pos: [0, -6, 24], mira: [-1, -9, -5], fov: 40 },
  5: { pos: [9, -7, 11], mira: [3.5, -10.2, -5], fov: 42 },
  6: { pos: [13, -8, 6], mira: [8.4, -12, -5], fov: 40 },
  7: { pos: [12, 3, 16], mira: [2.5, 0, -3], fov: 46 },
  8: { pos: [4, -2, 34], mira: [1, -19.6, 26], fov: 40 },
  9: { pos: [8, -7, 13], mira: [2, -11, -4], fov: 44 },
};
const Camara: React.FC<{ clip: number }> = ({ clip }) => {
  const { camera } = useThree();
  const c = CAM[clip];
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = c.fov;
  cam.near = 0.1;
  cam.far = 500;
  cam.position.set(...c.pos);
  cam.lookAt(...c.mira);
  cam.updateProjectionMatrix();
  return null;
};

const Telefono: React.FC<{ f: number; enciende: number; m: Mats }> = ({ enciende, m }) => {
  const pantalla = useMemo(() => texPantalla(), []);
  return (
    <group position={[1, -19.6, 26]} rotation={[-Math.PI / 2, 0, 0.35]}>
      <mesh material={m.vidrio} castShadow receiveShadow>
        <boxGeometry args={[6.8, 14, 0.8]} />
      </mesh>
      <mesh position={[0, 0, 0.41]}>
        <planeGeometry args={[6.2, 13.4]} />
        <meshStandardMaterial map={pantalla} emissiveMap={pantalla} emissive="#ffffff" emissiveIntensity={1.4 * enciende} color={enciende > 0.05 ? "#ffffff" : "#000000"} />
      </mesh>
    </group>
  );
};

const Escena: React.FC<{ clip: number }> = ({ clip }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = useMat();
  const s = f / fps;

  const enchufado = clip === 1 ? lerp(f, [8, 72], [9, 0]) : 0;
  const abrir = clip === 1 ? 0 : clip === 2 ? lerp(f, [12, 96], [0, 1], Easing.inOut(Easing.quad)) : 1;
  const pedaleando = clip === 5 || clip === 6 || clip === 7;
  const giro = pedaleando ? s * (clip === 5 ? 4 + s * 3 : 14) : clip === 9 ? 14 * lerp(f, [0, 60], [1, 0], Easing.out(Easing.cubic)) : 0;
  const baliza = clip >= 3 && clip <= 4 ? 1 : 0;
  const aguja = clip === 5 ? lerp(f, [10, 115], [0.05, 0.85]) : clip === 6 || clip === 7 ? 0.85 : clip === 9 ? lerp(f, [10, 70], [0.85, 0.08]) : 0.05;
  const rayosX = clip === 6 ? lerp(f, [10, 50], [0, 1]) : clip === 7 ? 1 : 0;

  // Robot según el clip (una acción por clip)
  const robot = (() => {
    const cama: [number, number, number] = [-8.6, PISO_CUARTO + 2.05, -5.6];
    if (clip === 2) return <Robot anim="Death" t={99} una pos={cama} rotY={-Math.PI / 2} />;
    if (clip === 3) {
      const salta = f >= 14;
      return salta ? (
        <Robot anim="Jump" t={(f - 14) / fps} una pos={[-8.2, PISO_CUARTO + 1.85, -5.2]} rotY={0.4} />
      ) : (
        <Robot anim="Death" t={99} una pos={cama} rotY={-Math.PI / 2} />
      );
    }
    if (clip === 4) {
      // corre por delante de la bici (z más cerca de cámara) y se detiene a su lado, sin tocarla
      const x = lerp(f, [4, 80], [-6.5, -1.4], Easing.inOut(Easing.sin));
      return <Robot anim={f > 78 ? "Idle" : "Running"} t={s} pos={[x, PISO_CUARTO, -3.2]} rotY={Math.PI / 2} />;
    }
    // sentado en el asiento, del lado de la cámara: no cruza la rueda ni los tubos
    if (pedaleando) return <Robot anim="Running" t={s * (clip === 5 ? 1 + s * 0.25 : 2)} pos={[BICI_X + 0.5, PISO_CUARTO + 3.1, -2.9]} rotY={Math.PI / 2} escala={1.05} />;
    if (clip === 9) {
      // se desploma hacia atrás y baja hasta apoyarse en el piso
      const y = lerp(f, [14, 36], [PISO_CUARTO + 3.1, PISO_CUARTO + 0.05], Easing.in(Easing.quad));
      const x = lerp(f, [14, 36], [BICI_X + 0.5, BICI_X + 0.1], Easing.out(Easing.quad));
      return <Robot anim="Death" t={Math.max(0, (f - 6) / fps)} una pos={[x, y, -2.0]} rotY={Math.PI / 2} escala={1.05} />;
    }
    return null;
  })();

  return (
    <>
      <Camara clip={clip} />
      <Entorno />
      <ambientLight intensity={0.2} />
      <directionalLight position={[14, 18, 26]} intensity={1.6} color="#fff3e3" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-bias={-0.0004} />
      <directionalLight position={[-16, 6, 10]} intensity={0.35} color="#c9dcff" />
      <Pared abrir={abrir} m={m} />
      <Enchufe m={m} />
      <Cargador z={enchufado} m={m} />
      <Cuarto f={f} m={m} giro={giro} baliza={baliza} aguja={aguja} rayosX={rayosX} />
      {robot}
      {clip === 7 ? <Energia c={CABLE_ENERGIA} f={f} a={0} b={60} /> : null}
      {clip === 8 ? <Telefono f={f} enciende={lerp(f, [20, 34], [0, 1])} m={m} /> : <Telefono f={f} enciende={0} m={m} />}
    </>
  );
};

export const EnchufeRobot: React.FC<RobotProps> = ({ clip }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#2a2420" }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <Escena clip={clip} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
