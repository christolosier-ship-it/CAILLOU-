import { Bounds, ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useState } from 'react'
import { getRockCatalogEntry } from '../content/rockCatalog'
import { RockModel } from './RockModel'

const VERTICAL_SLICE = [getRockCatalogEntry(1), getRockCatalogEntry(2)] as const

export function FoundationScene() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedRock = VERTICAL_SLICE[selectedIndex] ?? VERTICAL_SLICE[0]

  function selectRelative(delta: number) {
    setSelectedIndex((current) => (current + delta + VERTICAL_SLICE.length) % VERTICAL_SLICE.length)
  }

  return (
    <div className="scene-frame scene-frame-production" aria-label="Validation 3D des deux premiers spécimens de production">
      <Canvas
        aria-hidden="true"
        camera={{ position: [3.1, 2.15, 4.4], fov: 32, near: 0.05, far: 100 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        shadows
      >
        <color attach="background" args={['#e5e1d8']} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[4, 5, 5]} intensity={2.35} castShadow />
        <directionalLight position={[-4, 2, -3]} intensity={0.7} />
        <directionalLight position={[1, 3, -4]} intensity={0.55} />

        <Suspense fallback={null}>
          <Bounds key={selectedRock.id} fit clip observe margin={1.18}>
            <RockModel path={selectedRock.modelPath} />
          </Bounds>
          <ContactShadows
            position={[0, -0.02, 0]}
            opacity={0.3}
            scale={5.5}
            blur={2.6}
            far={4}
            frames={1}
          />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={2.2}
          maxDistance={6}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>

      <div className="rock-slice-controls">
        <button type="button" onClick={() => selectRelative(-1)} aria-label="Spécimen précédent">‹</button>
        <p aria-live="polite">
          <strong>{selectedRock.label}</strong>
          <span>{selectedRock.catalogIndex} / 20 · validation production</span>
        </p>
        <button type="button" onClick={() => selectRelative(1)} aria-label="Spécimen suivant">›</button>
      </div>
    </div>
  )
}
