import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GRID_X = 120;
const GRID_Z = 60;
const SPACING = 0.35;
const AMPLITUDE = 1.8;
const FREQUENCY = 0.4;

function WavePoints() {
  const meshRef = useRef<THREE.Points>(null);

  const { positions, basePositions } = useMemo(() => {
    const count = GRID_X * GRID_Z;
    const positions = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);

    for (let ix = 0; ix < GRID_X; ix++) {
      for (let iz = 0; iz < GRID_Z; iz++) {
        const idx = (ix * GRID_Z + iz) * 3;
        const x = (ix - GRID_X / 2) * SPACING;
        const z = (iz - GRID_Z / 2) * SPACING;
        positions[idx] = x;
        positions[idx + 1] = 0;
        positions[idx + 2] = z;
        basePositions[idx] = x;
        basePositions[idx + 1] = 0;
        basePositions[idx + 2] = z;
      }
    }

    return { positions, basePositions };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const time = state.clock.elapsedTime * 0.6;

    for (let i = 0; i < GRID_X * GRID_Z; i++) {
      const bx = basePositions[i * 3];
      const bz = basePositions[i * 3 + 2];

      const wave1 = Math.sin(bx * FREQUENCY + time) * AMPLITUDE * 0.5;
      const wave2 = Math.sin(bz * FREQUENCY * 0.8 + time * 0.7) * AMPLITUDE * 0.3;
      const wave3 = Math.sin((bx + bz) * FREQUENCY * 0.5 + time * 1.2) * AMPLITUDE * 0.2;

      posAttr.array[i * 3 + 1] = wave1 + wave2 + wave3;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef} rotation={[-0.5, 0.15, 0.1]} position={[2, 2, -5]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={GRID_X * GRID_Z}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#6BA3FF"
        size={0.055}
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function ParticleWave() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 55 }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
        gl={{ antialias: false, alpha: true }}
      >
        <WavePoints />
      </Canvas>
    </div>
  );
}
