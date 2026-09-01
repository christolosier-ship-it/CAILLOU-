import { Canvas } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { Suspense, useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { getRockCatalogEntryById } from '../../src/content/rockCatalog'
import { AccessoryEditor } from '../../src/features/accessories/AccessoryEditor'
import { ACCESSORY_WORLD_GRAVITY } from '../../src/features/accessories/accessoryPhysics'
import type { AccessoryTransform, EquippedAccessoryInstance } from '../../src/features/accessories/accessoryTypes'
import { ShowroomScene } from '../../src/scene/ShowroomScene'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'
import '../../src/styles/adoption.css'
import '../../src/styles/accessories.css'
import '../../src/styles/accessory-placement.css'

const rock = getRockCatalogEntryById('rock-012')

const INITIAL_INSTANCES: EquippedAccessoryInstance[] = [
  {
    id: '10d10000-0000-4000-8000-000000000001',
    userRockId: '10d10000-0000-4000-8000-000000000099',
    accessoryId: 'monocle',
    category: 'visage',
    name: 'Monocle',
    modelPath: '/assets/accessories/monocle/model.glb',
    previewPath: '/assets/accessory-previews/monocle.png',
    scaleMin: 0.65,
    scaleMax: 1.35,
    triangleCount: 665,
    dimensions: [0.440386, 0.626706, 0.725703],
    physics: {
      enabled: true,
      dynamic: true,
      collider: 'convexHull',
      mass: 0.18,
      friction: 0.68,
      restitution: 0.06,
      linearDamping: 1.6,
      angularDamping: 2.1,
      gravityScale: 0.9,
      ccd: true,
    },
    equippedAt: '2026-09-01T21:00:00.000Z',
    updatedAt: '2026-09-01T21:00:00.000Z',
    stabilizedAt: '2026-09-01T21:00:00.000Z',
    localPosition: [0, 0.16, 0.76],
    localRotation: [0, 0, 0, 1],
    uniformScale: 1,
  },
  {
    id: '10d10000-0000-4000-8000-000000000002',
    userRockId: '10d10000-0000-4000-8000-000000000099',
    accessoryId: 'round-glasses',
    category: 'visage',
    name: 'Lunettes rondes',
    modelPath: '/assets/accessories/round-glasses/model.glb',
    previewPath: '/assets/accessory-previews/round-glasses.png',
    scaleMin: 0.6,
    scaleMax: 1.5,
    triangleCount: 7386,
    dimensions: [0.78, 0.656022, 0.307408],
    physics: {
      enabled: true,
      dynamic: true,
      collider: 'convexHull',
      mass: 0.22,
      friction: 0.66,
      restitution: 0.05,
      linearDamping: 1.6,
      angularDamping: 2,
      gravityScale: 0.88,
      ccd: true,
    },
    equippedAt: '2026-09-01T21:00:01.000Z',
    updatedAt: '2026-09-01T21:00:01.000Z',
    stabilizedAt: '2026-09-01T21:00:01.000Z',
    localPosition: [-0.22, 0.2, 0.82],
    localRotation: [0, 0, 0, 1],
    uniformScale: 1,
  },
]

function PhysicsProbe({ onState }: { onState: (next: { collision: number; settled: boolean; finalY: number }) => void }) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const collisionCount = useRef(0)

  return (
    <Canvas
      id="physics-probe-canvas"
      frameloop="demand"
      camera={{ position: [1.8, 1.3, 2.4], fov: 42 }}
      style={{ width: 180, height: 120, position: 'absolute', top: 8, left: 8, zIndex: 20 }}
    >
      <ambientLight intensity={1.4} />
      <Suspense fallback={null}>
        <Physics
          gravity={[ACCESSORY_WORLD_GRAVITY[0], ACCESSORY_WORLD_GRAVITY[1], ACCESSORY_WORLD_GRAVITY[2]]}
          updateLoop="independent"
          colliders={false}
        >
          <RigidBody
            ref={bodyRef}
            type="dynamic"
            position={[0, 1, 0]}
            colliders={false}
            canSleep
            ccd
            friction={0.72}
            restitution={0.02}
            linearDamping={2.8}
            angularDamping={3.2}
            onCollisionEnter={() => {
              collisionCount.current += 1
              onState({ collision: collisionCount.current, settled: false, finalY: bodyRef.current?.translation().y ?? 1 })
            }}
            onSleep={() => {
              onState({ collision: collisionCount.current, settled: true, finalY: bodyRef.current?.translation().y ?? 1 })
            }}
          >
            <CuboidCollider args={[0.1, 0.1, 0.1]} />
            <mesh castShadow>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshStandardMaterial color="#9a784d" />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" position={[0, -0.3, 0]} colliders={false} friction={0.8}>
            <CuboidCollider args={[1, 0.1, 1]} />
            <mesh>
              <boxGeometry args={[2, 0.2, 2]} />
              <meshStandardMaterial color="#d8d2c8" />
            </mesh>
          </RigidBody>
        </Physics>
      </Suspense>
    </Canvas>
  )
}

function PhysicsFixture() {
  const [instances, setInstances] = useState(INITIAL_INSTANCES)
  const [selectedId, setSelectedId] = useState(INITIAL_INSTANCES[0].id)
  const [loadedIds, setLoadedIds] = useState<string[]>([])
  const [saveCount, setSaveCount] = useState(0)
  const [probe, setProbe] = useState({ collision: 0, settled: false, finalY: 1 })

  const commitTransform = useCallback((instanceId: string, transform: AccessoryTransform) => {
    setInstances((current) => current.map((instance) => instance.id === instanceId
      ? { ...instance, ...transform, stabilizedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      : instance))
    setSaveCount((current) => current + 1)
  }, [])

  const handleLoadState = useCallback((instanceId: string, state: 'loading' | 'ready' | 'error') => {
    setLoadedIds((current) => {
      if (state === 'loading') return current.filter((id) => id !== instanceId)
      if (state === 'ready' && !current.includes(instanceId)) return [...current, instanceId]
      return current
    })
  }, [])

  return (
    <div className="pedestal-shell is-accessory-mode">
      <PhysicsProbe onState={setProbe} />
      <main className="pedestal-main">
        <section className="pedestal-stage" data-accessory-count={instances.length}>
          <ShowroomScene
            rock={rock}
            retryKey={0}
            reducedMotion={false}
            onLoadStateChange={() => undefined}
            onInteractionChange={() => undefined}
            interactionMode="accessory"
            accessories={instances}
            selectedAccessoryId={selectedId}
            onAccessorySelect={setSelectedId}
            onAccessoryTransformCommit={commitTransform}
            onAccessoryLoadStateChange={handleLoadState}
          />
          <AccessoryEditor
            instances={instances}
            selectedId={selectedId}
            busy={false}
            message={probe.settled ? 'Physique stabilisée.' : 'Simulation Rapier en cours…'}
            maxInstances={8}
            onSelect={setSelectedId}
            onTransform={commitTransform}
            onRemove={() => undefined}
            onOpenShop={() => undefined}
            onDone={() => undefined}
          />
        </section>
      </main>

      <output
        id="accessory-physics-e2e-state"
        hidden
        data-instance-count={instances.length}
        data-loaded-count={loadedIds.length}
        data-selected-id={selectedId}
        data-save-count={saveCount}
        data-probe-collisions={probe.collision}
        data-probe-settled={String(probe.settled)}
        data-probe-final-y={probe.finalY.toFixed(5)}
        data-transforms={JSON.stringify(instances.map((instance) => ({
          id: instance.id,
          position: instance.localPosition,
          rotation: instance.localRotation,
          scale: instance.uniformScale,
          stabilizedAt: instance.stabilizedAt,
        })))}
      />
    </div>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing accessory physics E2E fixture root')
createRoot(root).render(<PhysicsFixture />)
