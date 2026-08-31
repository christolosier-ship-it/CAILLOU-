import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'

function ValidationObject() {
  return (
    <mesh rotation={[0.08, -0.4, 0.04]} scale={[1.35, 0.82, 1.05]} castShadow>
      <icosahedronGeometry args={[1, 4]} />
      <meshStandardMaterial color="#756e64" roughness={0.88} metalness={0.02} />
    </mesh>
  )
}

export function FoundationScene() {
  return (
    <div
      className="scene-frame"
      role="img"
      aria-label="Objet 3D provisoire de validation technique. Aucun spécimen de production n'est chargé."
    >
      <Canvas
        aria-hidden="true"
        camera={{ position: [0, 0.25, 4.6], fov: 32, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#e5e1d8']} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 4, 5]} intensity={2.1} />
        <directionalLight position={[-3, 1, -2]} intensity={0.6} />
        <ValidationObject />
        <ContactShadows
          position={[0, -1.05, 0]}
          opacity={0.28}
          scale={6}
          blur={2.5}
          far={4}
          frames={1}
        />
        <OrbitControls
          enablePan={false}
          minDistance={3.2}
          maxDistance={5.8}
          minPolarAngle={Math.PI / 3.5}
          maxPolarAngle={Math.PI / 1.7}
        />
      </Canvas>
    </div>
  )
}
