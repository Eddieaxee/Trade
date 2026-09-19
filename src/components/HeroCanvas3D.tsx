'use client';

/**
 * Abstract futuristic hero scene (three.js + @react-three/fiber):
 *  - slow-rotating wireframe globe + two orbital rings
 *  - a drifting particle field
 *  - soft pointer parallax on the camera (no cartoon faces, no floating boxes)
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
      <Globe />
      <Rings />
      <Dust />
      <Rig pointer={pointer} />
    </Canvas>
  );
}

