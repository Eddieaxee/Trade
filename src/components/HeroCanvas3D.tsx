'use client';

/**
 * Abstract futuristic hero scene (three.js + @react-three/fiber):
 *  - perspective grid floor receding to a glowing horizon
 *  - slow-rotating wireframe globe + two orbital rings
 *  - rising "price pulse" bars and a drifting particle field
 *  - soft pointer parallax on the camera (no cartoon faces)
 * Rendered client-only (dynamic import, ssr:false).
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type PointerRef = { current: { x: number; y: number } };

/** Smooth camera drift + subtle pointer parallax. */
function Rig({ pointer }: { pointer: PointerRef }) {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const px = pointer.current.x;
    const py = pointer.current.y;
    state.camera.position.x += (Math.sin(t * 0.12) * 0.35 + px * 0.55 - state.camera.position.x) * 0.04;
    state.camera.position.y += (1.15 + Math.sin(t * 0.18) * 0.12 + py * 0.3 - state.camera.position.y) * 0.04;
    state.camera.lookAt(0, 0.4, 0);
  });
  return null;
}

/** Endless glowing grid floor receding to the horizon. */
function GridFloor() {
  const grp = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (grp.current) grp.current.position.z = (state.clock.elapsedTime * 0.6) % 1;
  });
  const cells = useMemo(() => {
    const rows = 26;
    const cols = 26;
    const out: Array<{ key: string; x: number; z: number; opacity: number; near: boolean }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          key: `${r}-${c}`,
          x: (c - cols / 2) * 0.5,
          z: -r * 0.5,
          opacity: Math.max(0.05, 0.34 - r * 0.012),
          near: r < 3
        });
      }
    }
    return out;
  }, []);
  return (
    <group ref={grp} position={[0, -1.1, 2]}>
      {cells.map((c) => (
        <mesh key={c.key} position={[c.x, 0, c.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.44, 0.44]} />
          <meshBasicMaterial color={c.near ? '#3aa5ff' : '#17304d'} transparent opacity={c.opacity} />
        </mesh>
      ))}
    </group>
  );
}

/** Slow rotating wireframe globe at the vanishing point. */
function Globe() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.08;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.12;
  });
  return (
    <mesh ref={ref} position={[0, 1.0, -4.5]}>
      <icosahedronGeometry args={[1.9, 2]} />
      <meshBasicMaterial color="#2b5d8f" wireframe transparent opacity={0.38} />
    </mesh>
  );
}

/** Two thin orbital rings around the globe. */
function Rings() {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (a.current) a.current.rotation.z += delta * 0.14;
    if (b.current) b.current.rotation.z -= delta * 0.1;
  });
  return (
    <group position={[0, 1.0, -4.5]}>
      <mesh ref={a} rotation={[Math.PI / 2.4, 0.3, 0]}>
        <torusGeometry args={[2.55, 0.012, 8, 120]} />
        <meshBasicMaterial color="#3aa5ff" transparent opacity={0.6} />
      </mesh>
      <mesh ref={b} rotation={[Math.PI / 1.7, -0.5, 0.4]}>
        <torusGeometry args={[2.9, 0.01, 8, 120]} />
        <meshBasicMaterial color="#26c281" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

/** Rising "price pulse" bars along the horizon — abstract market motion. */
function PulseBars() {
  const bars = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: (i - 10.5) * 0.42,
        phase: i * 0.55,
        speed: 0.7 + (i % 5) * 0.16,
        hue: i % 2 === 0 ? '#26c281' : '#3aa5ff'
      })),
    []
  );
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const b = bars[i];
      const h = 0.18 + Math.abs(Math.sin(t * b.speed + b.phase)) * 0.85;
      m.scale.y = h;
      m.position.y = -0.92 + (h * 0.9) / 2;
    });
  });
  return (
    <group>
      {bars.map((b, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} position={[b.x, -0.92, 1.6]}>
          <boxGeometry args={[0.14, 0.9, 0.14]} />
          <meshBasicMaterial color={b.hue} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Drifting particle field. */
function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = Math.random() * 6 - 1;
      pos[i * 3 + 2] = -Math.random() * 12 + 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.22) * 0.12;
    }
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.035} color="#7db6ff" transparent opacity={0.5} sizeAttenuation />
    </points>
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
      camera={{ position: [0, 1.15, 6.4], fov: 52 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      onCreated={() => {
        window.addEventListener('pointermove', onMove, { passive: true });
      }}
    >
      <fog attach="fog" args={['#070a10', 6, 14]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 6, 5]} intensity={0.9} color="#bcd9ff" />
      <GridFloor />
      <Globe />
      <Rings />
      <PulseBars />
      <Dust />
      <Rig pointer={pointer} />
    </Canvas>
  );
}

