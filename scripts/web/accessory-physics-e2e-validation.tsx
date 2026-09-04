import { Canvas } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { getRockCatalogEntryById } from '../../src/content/rockCatalog'
import { ACCESSORY_WORLD_GRAVITY } from '../../src/features/accessories/accessoryPhysics'
import type { EquippedAccessoryInstance } from '../../src/features/accessories/accessoryTypes'
import { accessoryPlacementTarget } from '../../src/features/placement/placementObject'
import type { SettledWorldComposition } from '../../src/features/placement/placementPersistence'
import { buildPlacementSettlementPlan, createPlacementSession, updatePlacementSession } from '../../src/features/placement/placementSession'
import type { PlacementSessionState, PlacementSettlementPlan } from '../../src/features/placement/placementSession'
import type { PlacementTool, PlacementTransform } from '../../src/features/placement/placementTypes'
import { DEFAULT_ROCK_POSE } from '../../src/features/rockMovement/rockMovementRules'
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
  const [selectedId, setSelectedId] = useState(INITIAL_INSTANCES[0]!.id)
  const [tool, setTool] = useState<PlacementTool>('position')
  const [mode, setMode] = useState<'placement' | 'settling' | 'orbit'>('placement')
  const [loadedIds, setLoadedIds] = useState<string[]>([])
  const [draftCount, setDraftCount] = useState(0)
  const [placementSession, setPlacementSession] = useState<PlacementSessionState>(() => createPlacementSession(DEFAULT_ROCK_POSE, INITIAL_INSTANCES))
  const [settlementPlan, setSettlementPlan] = useState<PlacementSettlementPlan | null>(null)
  const [settledCount, setSettledCount] = useState(0)
  const [lastSettled, setLastSettled] = useState<{ instanceId: string; transform: PlacementTransform } | null>(null)
  const [probe, setProbe] = useState({ collision: 0, settled: false, finalY: 1 })

  const selectedWorld = useMemo(() => placementSession.accessories[selectedId] ?? null, [placementSession, selectedId])
  const selectedInstance = useMemo(
    () => INITIAL_INSTANCES.find((instance) => instance.id === selectedId) ?? null,
    [selectedId],
  )
  const placementTarget = mode === 'orbit' || !selectedInstance
    ? null
    : accessoryPlacementTarget(selectedInstance)

  const select = useCallback((instanceId: string) => {
    setSelectedId(instanceId)
    setTool('position')
    setMode('placement')
  }, [])

  const handleDraft = useCallback((instanceId: string, transform: PlacementTransform) => {
    setPlacementSession((current) => updatePlacementSession(current, { kind: 'accessory', instanceId }, transform))
    setDraftCount((current) => current + 1)
  }, [])

  const handleSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    setLastSettled({ instanceId, transform })
    setPlacementSession((current) => updatePlacementSession(current, { kind: 'accessory', instanceId }, transform))
    setSettledCount((current) => current + 1)
  }, [])

  const handleCompositionSettled = useCallback((world: SettledWorldComposition) => {
    const plannedIds = settlementPlan?.accessoryIds ?? []
    const lastId = plannedIds.at(-1)
    const last = world.accessories.find((candidate) => candidate.instanceId === lastId)
    if (last) setLastSettled({ instanceId: last.instanceId, transform: last.transform })
    if (plannedIds.length > 0) setSettledCount((current) => current + plannedIds.length)
    setPlacementSession((current) => {
      let next = current
      for (const accessory of world.accessories) {
        next = updatePlacementSession(next, { kind: 'accessory', instanceId: accessory.instanceId }, accessory.transform)
      }
      return { ...next, dirtyRock: false, dirtyAccessoryIds: [] }
    })
    setSettlementPlan(null)
    setMode('orbit')
  }, [settlementPlan])

  const requestSettlement = useCallback(() => {
    const plan = buildPlacementSettlementPlan(placementSession)
    if (!plan) return
    setSettlementPlan(plan)
    setMode('settling')
  }, [placementSession])

  const handleLoadState = useCallback((instanceId: string, state: 'loading' | 'ready' | 'error') => {
    setLoadedIds((current) => {
      if (state === 'loading') return current.filter((id) => id !== instanceId)
      if (state === 'ready' && !current.includes(instanceId)) return [...current, instanceId]
      return current
    })
  }, [])

  return (
    <div className={`pedestal-shell${mode === 'placement' ? ' is-placement-mode' : ''}`}>
      <PhysicsProbe onState={setProbe} />
      <main className="pedestal-main">
        <section className="pedestal-stage" data-accessory-count={INITIAL_INSTANCES.length}>
          <ShowroomScene
            rock={rock}
            retryKey={0}
            reducedMotion={false}
            onLoadStateChange={() => undefined}
            onInteractionChange={() => undefined}
            interactionMode={mode}
            rockPose={DEFAULT_ROCK_POSE}
            placementTarget={placementTarget}
            placementTool={tool}
            placementSession={placementSession}
            settlementPlan={settlementPlan}
            accessories={INITIAL_INSTANCES}
            selectedAccessoryId={selectedId}
            onAccessorySelect={select}
            onAccessoryPlacementDraft={handleDraft}
            onAccessorySettled={handleSettled}
            onCompositionSettled={handleCompositionSettled}
            onAccessoryLoadStateChange={handleLoadState}
          />
          <div className="physics-fixture-controls" style={{ position: 'absolute', zIndex: 30, right: 8, bottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 280 }}>
            <button id="physics-select-monocle" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => select(INITIAL_INSTANCES[0]!.id)}>Monocle</button>
            <button id="physics-select-glasses" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => select(INITIAL_INSTANCES[1]!.id)}>Lunettes</button>
            <button id="physics-position" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => { setMode('placement'); setTool('position') }}>Position</button>
            <button id="physics-orientation" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => { setMode('placement'); setTool('orientation') }}>Orientation</button>
            <button id="physics-settle" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={requestSettlement}>Lâcher</button>
          </div>
        </section>
      </main>

      <output
        id="accessory-physics-e2e-state"
        hidden
        data-mode={mode}
        data-instance-count={INITIAL_INSTANCES.length}
        data-loaded-count={loadedIds.length}
        data-selected-id={selectedId}
        data-draft-count={draftCount}
        data-settled-count={settledCount}
        data-probe-collisions={probe.collision}
        data-probe-settled={String(probe.settled)}
        data-probe-final-y={probe.finalY.toFixed(5)}
        data-selected-world-position={JSON.stringify(selectedWorld?.position ?? null)}
        data-selected-world-rotation={JSON.stringify(selectedWorld?.rotation ?? null)}
        data-selected-scale={String(selectedWorld?.scale ?? 0)}
        data-last-settled-position={JSON.stringify(lastSettled?.transform.position ?? null)}
        data-last-settled-rotation={JSON.stringify(lastSettled?.transform.rotation ?? null)}
        data-session-accessories={JSON.stringify(placementSession.accessories)}
      />
    </div>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing accessory physics E2E fixture root')
createRoot(root).render(<PhysicsFixture />)
