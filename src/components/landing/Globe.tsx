import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { mockPolicies, mockPayouts } from '@/lib/mockData';

const GLOBE_RADIUS = 2;

function latLngToVector3(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function GlobeWireframe() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main wireframe sphere */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#4B83F2"
          wireframe
          transparent
          opacity={0.06}
        />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 0.98, 32, 32]} />
        <meshBasicMaterial
          color="#1e40af"
          transparent
          opacity={0.02}
        />
      </mesh>
      {/* Equator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[GLOBE_RADIUS, 0.005, 16, 100]} />
        <meshBasicMaterial color="#4B83F2" transparent opacity={0.2} />
      </mesh>
      {/* Latitude lines */}
      {[-60, -30, 30, 60].map((lat) => {
        const r = GLOBE_RADIUS * Math.cos((lat * Math.PI) / 180);
        const y = GLOBE_RADIUS * Math.sin((lat * Math.PI) / 180);
        return (
          <mesh key={lat} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.003, 8, 64]} />
            <meshBasicMaterial color="#4B83F2" transparent opacity={0.08} />
          </mesh>
        );
      })}
    </group>
  );
}

function PolicyDot({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + phase) * 0.3;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

function PayoutRipple({ position }: { position: [number, number, number] }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const t = (state.clock.elapsedTime % 3) / 3;
      const scale = 0.5 + t * 2;
      ringRef.current.scale.setScalar(scale);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
    }
  });

  const normal = new THREE.Vector3(...position).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal
  );

  return (
    <mesh ref={ringRef} position={position} quaternion={quaternion}>
      <torusGeometry args={[0.06, 0.004, 8, 32]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} />
    </mesh>
  );
}

function PolicyPoints() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  const typeColors: Record<string, string> = {
    earthquake: '#4B83F2',
    flood: '#3b82f6',
    drought: '#60a5fa',
  };

  return (
    <group ref={groupRef}>
      {mockPolicies.map((policy) => {
        const pos = latLngToVector3(policy.lat, policy.lng, GLOBE_RADIUS);
        return (
          <PolicyDot
            key={policy.id}
            position={pos}
            color={typeColors[policy.type]}
          />
        );
      })}
      {mockPayouts.map((payout) => {
        const pos = latLngToVector3(payout.lat, payout.lng, GLOBE_RADIUS);
        return <PayoutRipple key={`payout-${payout.id}`} position={pos} />;
      })}
    </group>
  );
}

function GlobeScene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#4B83F2" />
      <pointLight position={[-10, -5, -10]} intensity={0.2} color="#3b82f6" />
      <GlobeWireframe />
      <PolicyPoints />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.25}
      />
    </>
  );
}

function GlobeLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export default function Globe() {
  return (
    <div className="w-full h-[500px] lg:h-[600px] relative">
      <Suspense fallback={<GlobeLoader />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          dpr={[1, 2]}
          style={{ background: 'transparent' }}
        >
          <GlobeScene />
        </Canvas>
      </Suspense>
      {/* Radial gradient overlay for blending */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,hsl(0_0%_2%)_100%)]" />
    </div>
  );
}