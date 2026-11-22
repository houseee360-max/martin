import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Dominó infinito: cada dominó mide 1,5 veces el anterior y la cámara se aleja exactamente
 * a ese ritmo. La escena es igual a sí misma a otra escala, así que el video hace bucle perfecto.
 * Todo se dibuja en coordenadas relativas al dominó "activo" (sin problemas de precisión).
 */
export const DI_FPS = 30;
export const DI_W = 1080;
export const DI_H = 1920;
const T = 0.5; // segundos entre un dominó y el siguiente
const COLORES = ["#ff6b6b", "#ff9f43", "#feca57", "#1dd1a1", "#48dbfb", "#a29bfe"];
const PERIODO = COLORES.length; // tras 6 dominós la imagen es idéntica
export const DI_TOTAL = Math.round(PERIODO * T * DI_FPS) * 5; // 5 ciclos = 15 s, bucle perfecto

const R = 1.5;
const K = 3 * (0.5 / R + 0.16); // posición geométrica de la cara delantera
const DUR = T / 0.55; // duración de cada caída (toca al siguiente al 55 %)

const anguloRel = (u: number) => {
  // u = segundos desde que empezó a caer
  const p = u / DUR;
  if (p <= 0) return 0;
  const golpe = Math.asin(Math.min(0.95, 0.5 / 1 + 0.16 * R));
  const reposo = (76 * Math.PI) / 180;
  if (p < 0.55) return golpe * Math.pow(p / 0.55, 2);
  return golpe + (reposo - golpe) * (1 - Math.pow(1 - Math.min(1, (p - 0.55) / 1.2), 3));
};

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
const cara = (fondo: string, k: number) =>
  lienzo(256, 512, (x) => {
    x.fillStyle = fondo;
    x.fillRect(0, 0, 256, 512);
    x.fillStyle = "rgba(255,255,255,.95)";
    x.fillRect(28, 250, 200, 12);
    const p = (cx: number, cy: number) => {
      x.beginPath();
      x.arc(cx, cy, 22, 0, Math.PI * 2);
      x.fill();
    };
    const arriba = [[[128, 128]], [[64, 64], [192, 192]], [[64, 64], [128, 128], [192, 192]], [[64, 64], [192, 64], [64, 192], [192, 192]], [[64, 64], [192, 64], [128, 128], [64, 192], [192, 192]], [[64, 64], [192, 64], [64, 128], [192, 128], [64, 192], [192, 192]]][k % 6];
    arriba.forEach(([a, b]) => p(a, b));
    arriba.forEach(([a, b]) => p(256 - a, b + 256));
  });

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

const Escena: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { gl, scene, camera } = useThree();
  const t = (f % Math.round(PERIODO * T * fps)) / fps; // tiempo dentro de un ciclo (bucle exacto)
  const a = t / T; // índice activo continuo

  // Entorno y cámara fijos (la escena es autosemejante)
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const tx = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return tx;
  }, [gl]);
  scene.environment = env;
  scene.environmentIntensity = 0.5;
  scene.background = null;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.0;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  const cam = camera as THREE.PerspectiveCamera;
  const objetivo = new THREE.Vector3(K * 1.15, 1.25, 0);
  cam.fov = 46;
  cam.near = 0.002;
  cam.far = 400;
  cam.position.copy(objetivo.clone().add(new THREE.Vector3(-0.7, 0.3, 0.85).normalize().multiplyScalar(4.4)));
  cam.lookAt(objetivo);
  cam.updateProjectionMatrix();

  const mats = useMemo(
    () =>
      COLORES.map((c, k) => {
        const lado = new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 });
        const frente = new THREE.MeshStandardMaterial({ map: cara(c, k), roughness: 0.3 });
        return [frente, frente, lado, lado, lado, lado];
      }),
    [],
  );
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const fichas = [];
  const base = Math.floor(a);
  for (let n = base - 14; n <= base + 6; n++) {
    const k = n - a; // tamaño relativo: 1.5^k
    const h = Math.pow(R, k);
    const x = K * h;
    const angulo = anguloRel(t - n * T);
    const color = ((n % PERIODO) + PERIODO) % PERIODO;
    fichas.push(
      <group key={n} position={[x, 0, 0]} rotation={[0, 0, -angulo]}>
        <mesh geometry={geo} material={mats[color]} position={[-0.16 * h * 0.5, h / 2, 0]} scale={[0.16 * h, h, 0.5 * h]} castShadow receiveShadow />
      </group>,
    );
  }

  return (
    <>
      <Repintar />
      <hemisphereLight args={["#fff6ee", "#c7b8d8", 0.7]} />
      <directionalLight position={[-3, 7, 5]} intensity={2.4} color="#fff4e6" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={0.5} shadow-camera-far={40} shadow-bias={-0.0004} shadow-radius={6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial opacity={0.28} />
      </mesh>
      {fichas}
    </>
  );
};

export const DominoInfinito: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 38%, #fff7ef 0%, #ffe3ea 45%, #e4dcff 100%)" }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
        <Escena />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
