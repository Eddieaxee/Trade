'use client';

/**
 * True 3D cartoon currency scene (three.js + @react-three/fiber):
 * - EUR € and USD $ coins in a subtle "tug of war" standoff at center
 * - GBP £, JPY ¥ and CHF coins orbiting slowly in the background
 * - every coin has cartoon eyes that track the mouse
 * - camera parallax follows the pointer; fog + soft lights for depth
 * Rendered client-only (dynamic import, ssr:false) to keep SSR clean.
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type PointerRef = { current: { x: number; y: number } };

/** Canvas texture: glossy coin face with a currency glyph. */
function faceTexture(symbol: string, c1: string, c2: string): THREE.CanvasTexture {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(s * 0.38, s * 0.32, 20, s / 2, s / 2, s * 0.62);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.485, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 7;
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.font = 'bold 128px "Segoe UI", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(symbol, s / 2, s / 2 + 8);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}

interface CoinProps {
  symbol: string;
  c1: string;
  c2: string;
  position: [number, number, number];
  phase: number;
  pointer: PointerRef;
  scale?: number;
}

/** One cartoon coin with mouse-tracking eyes. */
function Coin({ symbol, c1, c2, position, phase, pointer, scale = 1 }: CoinProps) {
  const grp = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const face = useMemo(() => faceTexture(symbol, c1, c2), [symbol, c1, c2]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = grp.current;
    if (!g) return;
    g.position.y = position[1] + Math.sin(t * 1.1 + phase) * 0.16;
    g.rotation.z = Math.sin(t * 0.7 + phase) * 0.08;
    g.rotation.y = Math.sin(t * 0.45 + phase * 1.3) * 0.35;
    const p = pointer.current;
    if (eyeL.current && eyeR.current) {
      const ex = THREE.MathUtils.clamp(p.x * 0.09, -0.06, 0.06);
      const ey = THREE.MathUtils.clamp(p.y * 0.07, -0.05, 0.05);
      eyeL.current.position.x = -0.16 + ex;
      eyeR.current.position.x = 0.16 + ex;
      eyeL.current.position.y = 0.28 + ey;
      eyeR.current.position.y = 0.28 + ey;
    }
  });

  const eye = (
    <group>
      <mesh>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshBasicMaterial color="#f4faff" />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <sphereGeometry args={[0.038, 12, 12]} />
        <meshBasicMaterial color="#0b0e14" />
      </mesh>
    </group>
  );

  return (
    <group ref={grp} position={position} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.14, 48]} />
        <meshStandardMaterial color={c2} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.073]}>
        <circleGeometry args={[0.62, 48]} />
        <meshStandardMaterial map={face} metalness={0.25} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, -0.073]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.62, 48]} />
        <meshStandardMaterial color={c2} metalness={0.55} roughness={0.4} />
      </mesh>
      <group ref={eyeL} position={[-0.16, 0.28, 0.078]}>{eye}</group>
      <group ref={eyeR} position={[0.16, 0.28, 0.078]}>{eye}</group>
    </group>
  );
}

/** Pointer-driven camera parallax. */
function Rig({ pointer }: { pointer: PointerRef }) {
  useFrame((state) => {
    const p = pointer.current;
    const cam = state.camera;
    cam.position.x += (p.x * 1.4 - cam.position.x) * 0.04;
    cam.position.y += (1.1 + p.y * 0.8 - cam.position.y) * 0.04;
    cam.lookAt(0, 0.4, 0);
  });
  return null;
}

/** Slow-drifting particle dust. */
function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 220;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = Math.random() * 6 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.035} color="#7db6ff" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

/** EUR/USD pair: each coin drifts toward and away from centre — a calm standoff. */
function TugCoin({
  symbol,
  c1,
  c2,
  phase,
  pointer,
  side
}: Omit<CoinProps, 'position' | 'scale'> & { side: number }) {
  const grp = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (grp.current) {
      grp.current.position.x = side * (1.35 + Math.sin(t * 0.5 + phase) * 0.28);
      grp.current.rotation.y = -side * 0.35 + Math.sin(t * 0.45 + phase) * 0.1;
    }
  });
  return (
    <group ref={grp} position={[side * 1.35, 0.55, 0]}>
      <Coin symbol={symbol} c1={c1} c2={c2} position={[0, 0, 0]} phase={phase} pointer={pointer} scale={1.25} />
    </group>
  );
}

/** Ring of orbiting coins behind the main pair. */
function Orbit({
  pointer,
  radius,
  height,
  speed,
  items
}: {
  pointer: PointerRef;
  radius: number;
  height: number;
  speed: number;
  items: Array<{ symbol: string; c1: string; c2: string; phase: number }>;
}) {
  const grp = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (grp.current) grp.current.rotation.y += delta * speed;
  });
  return (
    <group ref={grp} position={[0, height, -1.2]}>
      {items.map((it, i) => {
        const a = (i / items.length) * Math.PI * 2;
        return (
          <Coin
            key={it.symbol}
            symbol={it.symbol}
            c1={it.c1}
            c2={it.c2}
            position={[Math.cos(a) * radius, Math.sin(a * 2) * 0.25, Math.sin(a) * radius * 0.5]}
            phase={it.phase}
            pointer={pointer}
            scale={0.8}
          />
        );
      })}
    </group>
  );
}

export default function HeroCanvas3D() {
  const pointer = useRef({ x: 0, y: 0 });

  const onMove = (e: PointerEvent) => {
    pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.1, 6.2], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      onCreated={() => {
        window.addEventListener('pointermove', onMove, { passive: true });
      }}
    >
      <fog attach="fog" args={['#070a10', 7, 15]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} color="#bcd9ff" />
      <pointLight position={[-4, 2, 3]} intensity={12} color="#3aa5ff" distance={12} />
      <pointLight position={[4, -1, 2]} intensity={10} color="#26c281" distance={12} />

      <TugCoin pointer={pointer} side={-1} symbol="$" c1="#7ee2b0" c2="#157a4c" phase={0} />
      <TugCoin pointer={pointer} side={1} symbol="€" c1="#9fc9ff" c2="#1d5fae" phase={Math.PI} />

      <Orbit pointer={pointer} radius={3.3} height={0.9} speed={0.14} items={[
        { symbol: '£', c1: '#f0b7d4', c2: '#8e2f66', phase: 0 },
        { symbol: '¥', c1: '#f6d8a8', c2: '#a4681f', phase: 2.1 },
        { symbol: '₣', c1: '#b8e7f2', c2: '#22687a', phase: 4.2 }
      ]} />

      <Dust />
      <Rig pointer={pointer} />
    </Canvas>
  );
}

