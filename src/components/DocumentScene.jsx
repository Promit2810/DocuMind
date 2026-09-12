import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, RoundedBox } from "@react-three/drei";
import { useRef } from "react";

function Document() {
  const group = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    group.current.rotation.y = Math.sin(t * 0.45) * 0.12;
    group.current.rotation.x = Math.sin(t * 0.3) * 0.04;
    group.current.position.y = Math.sin(t * 0.8) * 0.08;
  });

  return (
    <group ref={group} rotation={[0.02, -0.15, -0.08]}>
      {/* Back document */}
      <RoundedBox
        args={[3.9, 5.1, 0.12]}
        radius={0.08}
        smoothness={4}
        position={[-0.22, 0.05, -0.22]}
        rotation={[0, 0, -0.035]}
      >
        <meshStandardMaterial
          color="#282632"
          roughness={0.82}
          metalness={0.05}
        />
      </RoundedBox>

      {/* Main document */}
      <RoundedBox
        args={[3.9, 5.1, 0.16]}
        radius={0.08}
        smoothness={4}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color="#dedbe6"
          roughness={0.72}
          metalness={0.03}
        />
      </RoundedBox>

      {/* Document heading */}
      <RoundedBox
        args={[2.65, 0.18, 0.035]}
        radius={0.025}
        smoothness={3}
        position={[-0.15, 1.65, 0.105]}
      >
        <meshStandardMaterial
          color="#7660e8"
          roughness={0.6}
        />
      </RoundedBox>

      {/* Document subtitle */}
      <RoundedBox
        args={[1.65, 0.11, 0.035]}
        radius={0.02}
        smoothness={3}
        position={[-0.65, 1.25, 0.105]}
      >
        <meshStandardMaterial
          color="#777181"
          roughness={0.7}
        />
      </RoundedBox>

      {/* Text lines */}
      <RoundedBox
        args={[2.9, 0.075, 0.03]}
        radius={0.015}
        smoothness={3}
        position={[0, 0.55, 0.105]}
      >
        <meshStandardMaterial color="#8b8795" roughness={0.8} />
      </RoundedBox>

      <RoundedBox
        args={[2.75, 0.075, 0.03]}
        radius={0.015}
        smoothness={3}
        position={[-0.08, 0.22, 0.105]}
      >
        <meshStandardMaterial color="#8b8795" roughness={0.8} />
      </RoundedBox>

      <RoundedBox
        args={[2.95, 0.075, 0.03]}
        radius={0.015}
        smoothness={3}
        position={[0.02, -0.11, 0.105]}
      >
        <meshStandardMaterial color="#8b8795" roughness={0.8} />
      </RoundedBox>

      <RoundedBox
        args={[2.35, 0.075, 0.03]}
        radius={0.015}
        smoothness={3}
        position={[-0.28, -0.44, 0.105]}
      >
        <meshStandardMaterial color="#8b8795" roughness={0.8} />
      </RoundedBox>

      {/* Highlighted chunk */}
      <RoundedBox
        args={[1.55, 0.18, 0.04]}
        radius={0.025}
        smoothness={3}
        position={[0.62, -1.05, 0.12]}
      >
        <meshStandardMaterial
          color="#9b82ee"
          roughness={0.5}
        />
      </RoundedBox>

      {/* Small source indicator */}
      <mesh position={[-1.35, -1.55, 0.13]}>
        <sphereGeometry args={[0.09, 24, 24]} />
        <meshStandardMaterial
          color="#7660e8"
          emissive="#7660e8"
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}

function AIOrb() {
  const group = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    group.current.rotation.y = t * 0.55;
    group.current.rotation.x = Math.sin(t * 0.4) * 0.15;
    group.current.position.y = 0.15 + Math.sin(t * 0.9) * 0.12;
  });

  return (
    <group ref={group} position={[2.15, 0.05, 0.55]}>
      {/* Orb */}
      <mesh>
        <sphereGeometry args={[0.58, 48, 48]} />
        <meshStandardMaterial
          color="#8065df"
          emissive="#5e43bd"
          emissiveIntensity={0.32}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Orb ring */}
      <mesh rotation={[Math.PI / 2.8, 0.15, 0]}>
        <torusGeometry args={[0.78, 0.035, 12, 80]} />
        <meshStandardMaterial
          color="#a991ff"
          emissive="#8065df"
          emissiveIntensity={0.25}
          roughness={0.4}
        />
      </mesh>

      {/* Second ring */}
      <mesh rotation={[0.8, Math.PI / 3, 0]}>
        <torusGeometry args={[0.9, 0.025, 10, 80]} />
        <meshStandardMaterial
          color="#6250aa"
          roughness={0.5}
        />
      </mesh>

      {/* AI core */}
      <mesh position={[0, 0, 0.57]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial
          color="#eee9ff"
          emissive="#c9baff"
          emissiveIntensity={0.9}
        />
      </mesh>
    </group>
  );
}

const PARTICLE_COUNT = 70;
const PARTICLE_POSITIONS = new Float32Array(PARTICLE_COUNT * 3);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  PARTICLE_POSITIONS[i * 3] = (Math.sin(i * 99) * 0.5) * 8;
  PARTICLE_POSITIONS[i * 3 + 1] = (Math.cos(i * 33) * 0.5) * 6;
  PARTICLE_POSITIONS[i * 3 + 2] = (Math.sin(i * 17) * 0.5) * 3;
}

function Particles() {
  const points = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (points.current) {
      points.current.rotation.y = t * 0.025;
      points.current.rotation.x = Math.sin(t * 0.15) * 0.02;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={PARTICLE_POSITIONS}
          itemSize={3}
        />
      </bufferGeometry>

      <pointsMaterial
        color="#a99aff"
        size={0.025}
        transparent
        opacity={0.42}
        sizeAttenuation
      />
    </points>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={1.1} />

      <directionalLight
        position={[4, 5, 6]}
        intensity={2}
      />

      <pointLight
        position={[2, 1, 2]}
        intensity={18}
        distance={5}
        color="#8166e8"
      />

      <pointLight
        position={[-3, -2, 2]}
        intensity={8}
        distance={5}
        color="#8f82c4"
      />

      <Float
        speed={1.4}
        rotationIntensity={0.18}
        floatIntensity={0.35}
      >
        <Document />
      </Float>

      <Float
        speed={1.8}
        rotationIntensity={0.25}
        floatIntensity={0.5}
      >
        <AIOrb />
      </Float>

      <Particles />

      <Environment preset="city" environmentIntensity={0.25}
       />
    </>
  );
}

export default function DocumentScene() {
  return (
    <div className="document-scene">
      <Canvas
        camera={{
          position: [0, 0, 8],
          fov: 42,
        }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#15141d"]} />

        <Scene />
      </Canvas>
    </div>
  );
}