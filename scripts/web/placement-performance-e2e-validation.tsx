import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { getRockCatalogEntryById } from '../../src/content/rockCatalog'
import type { EquippedAccessoryInstance } from '../../src/features/accessories/accessoryTypes'
import { PlacementBody } from '../../src/features/placement/PlacementBody'
import type { PlacementBodyPhysicsConfig } from '../../src/features/placement/PlacementBody'
import type { PlacementCollisionMotion } from '../../src/features/placement/placementCollisionSolver'
import type { PlacementGeometry } from '../../src/features/placement/placementGeometry'
import { accessoryPlacementTarget, rockPlacementTarget } from '../../src/features/placement/placementObject'
import { worldCompositionToPersistence } from '../../src/features/placement/placementPersistence'
import type { SettledWorldComposition } from '../../src/features/placement/placementPersistence'
import { PlacementPhysicsWorld } from '../../src/features/placement/PlacementPhysicsWorld'
import {
  buildPlacementSettlementPlan,
  createPlacementSession,
  updatePlacementSession,
} from '../../src/features/placement/placementSession'
import type { PlacementSessionState, PlacementSettlementPlan } from '../../src/features/placement/placementSession'
import type { PlacementTarget, PlacementTransform } from '../../src/features/placement/placementTypes'
import { usePlacementCollisionResolver } from '../../src/features/placement/usePlacementCollisionResolver'
import type { RockPose } from '../../src/features/rockMovement/rockMovementTypes'
import { ShowroomScene } from '../../src/scene/ShowroomScene'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'

const rock = getRockCatalogEntryById('rock-018')
const INITIAL_POSE: RockPose = { position: [0, 1.35, 0], rotation: [0, 0, 0, 1] }
const USER_ROCK_ID = '10f10000-0000-4000-8000-000000000099'

const INSTANCE_POSITIONS: Array<[number, number, number]> = [
  [0, 0.16, 0.76],
  [-1.2, 0.2, -0.9],
  [1.2, 0.2, -0.9],
  [-1.2, 0.2, 0.9],
  [1.2, 0.2, 0.9],
  [0, 0.2, -1.4],
  [-1.4, 0.2, 0],
  [1.4, 0.2, 0],
]

function makeInstance(index: number): EquippedAccessoryInstance {
  const glasses = index % 2 === 1
  const suffix = String(index + 1).padStart(12, '0')
  return {
    id: `10f10000-0000-4000-8000-${suffix}`,
    userRockId: USER_ROCK_ID,
    accessoryId: glasses ? 'round-glasses' : 'monocle',
    category: 'visage',
    name: glasses ? 'Lunettes rondes' : 'Monocle',
    modelPath: glasses
      ? '/assets/accessories/round-glasses/model.glb'
      : '/assets/accessories/monocle/model.glb',
    previewPath: glasses
      ? '/assets/accessory-previews/round-glasses.png'
      : '/assets/accessory-previews/monocle.png',
    scaleMin: glasses ? 0.6 : 0.65,
    scaleMax: glasses ? 1.5 : 1.35,
    triangleCount: glasses ? 7386 : 665,
    dimensions: glasses ? [0.78, 0.656022, 0.307408] : [0.440386, 0.626706, 0.725703],
    physics: glasses
      ? {
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
        }
      : {
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
    equippedAt: `2026-09-04T12:00:${String(index).padStart(2, '0')}.000Z`,
    updatedAt: `2026-09-04T12:00:${String(index).padStart(2, '0')}.000Z`,
    stabilizedAt: `2026-09-04T12:00:${String(index).padStart(2, '0')}.000Z`,
    localPosition: [...INSTANCE_POSITIONS[index]!] as [number, number, number],
    localRotation: [0, 0, 0, 1],
    uniformScale: 1,
  }
}

const PROBE_GEOMETRY: PlacementGeometry = {
  supportPoints: [
    [-0.22, -0.22, -0.22], [-0.22, -0.22, 0.22], [-0.22, 0.22, -0.22], [-0.22, 0.22, 0.22],
    [0.22, -0.22, -0.22], [0.22, -0.22, 0.22], [0.22, 0.22, -0.22], [0.22, 0.22, 0.22],
  ],
  colliderBounds: { min: [-0.22, -0.22, -0.22], max: [0.22, 0.22, 0.22] },
}

const PROBE_PHYSICS: PlacementBodyPhysicsConfig = {
  collider: 'cuboid',
  mass: 1,
  friction: 0.7,
  restitution: 0,
  linearDamping: 1,
  angularDamping: 1,
  gravityScale: 0,
  ccd: false,
  settlingCcd: false,
  baseSolverIterations: 1,
  settlingSolverIterations: 4,
  settleTimeoutMs: 1_500,
  settleLinearVelocityY: 0,
}

interface TimingSummary {
  samples: number
  averageMs: number
  p95Ms: number
  maxMs: number
}

type CollisionBenchmark = Record<PlacementCollisionMotion, TimingSummary>

function summarize(values: number[]): TimingSummary {
  const sorted = [...values].sort((left, right) => left - right)
  const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1)
  return {
    samples: sorted.length,
    averageMs: sorted.reduce((sum, value) => sum + value, 0) / Math.max(1, sorted.length),
    p95Ms: sorted[p95Index] ?? 0,
    maxMs: sorted.at(-1) ?? 0,
  }
}

function CollisionCostProbe({
  objectCount,
  target,
  onResult,
}: {
  objectCount: number
  target: PlacementTarget
  onResult: (result: CollisionBenchmark) => void
}) {
  const resolveCollision = usePlacementCollisionResolver(target, PROBE_GEOMETRY)
  const completed = useRef(false)

  useEffect(() => {
    if (completed.current) return
    completed.current = true
    const timer = window.setTimeout(() => {
      const current: PlacementTransform = {
        position: [0, 1, 0],
        rotation: [0, 0, 0, 1],
        scale: 1,
      }
      const angle = Math.PI / 10
      const desired: Record<PlacementCollisionMotion, PlacementTransform> = {
        translation: { ...current, position: [0.18, 1, 0] },
        rotation: { ...current, rotation: [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)] },
        scale: { ...current, scale: 1.14 },
      }
      const result = {} as CollisionBenchmark

      for (const motion of ['translation', 'rotation', 'scale'] as const) {
        for (let warmup = 0; warmup < 8; warmup += 1) {
          resolveCollision(current, desired[motion], motion)
        }
        const durations: number[] = []
        for (let sample = 0; sample < 80; sample += 1) {
          const started = performance.now()
          resolveCollision(current, desired[motion], motion)
          durations.push(performance.now() - started)
        }
        result[motion] = summarize(durations)
      }

      onResult(result)
    }, 220 + objectCount * 10)
    return () => window.clearTimeout(timer)
  }, [objectCount, onResult, resolveCollision])

  return null
}

function CollisionBenchmarkWorld({ objectCount, onResult }: { objectCount: number; onResult: (result: CollisionBenchmark) => void }) {
  const activeInstance = useMemo(() => makeInstance(0), [])
  const target = useMemo(() => accessoryPlacementTarget(activeInstance), [activeInstance])
  const current: PlacementTransform = useMemo(() => ({ position: [0, 1, 0], rotation: [0, 0, 0, 1], scale: 1 }), [])
  const obstacleTransforms = useMemo(() => Array.from({ length: Math.max(0, objectCount - 1) }, (_, index) => {
    const angle = (index / Math.max(1, objectCount - 1)) * Math.PI * 2
    return {
      position: [Math.cos(angle) * 1.4, 1, Math.sin(angle) * 1.4] as [number, number, number],
      rotation: [0, 0, 0, 1] as [number, number, number, number],
      scale: 1,
    }
  }), [objectCount])

  return (
    <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: 64, height: 64, opacity: 0, pointerEvents: 'none' }}>
      <Canvas frameloop="demand" camera={{ position: [2, 2, 3], fov: 40 }}>
        <Suspense fallback={null}>
          <PlacementPhysicsWorld paused={false}>
            <PlacementBody
              bodyKey={`accessory:${activeInstance.id}`}
              state="editing"
              transform={current}
              geometry={PROBE_GEOMETRY}
              physics={PROBE_PHYSICS}
            >
              <mesh><boxGeometry args={[0.44, 0.44, 0.44]} /><meshBasicMaterial /></mesh>
            </PlacementBody>
            {obstacleTransforms.map((transform, index) => (
              <PlacementBody
                key={index}
                bodyKey={`accessory:lot-f-obstacle-${index}`}
                state="editing"
                transform={transform}
                geometry={PROBE_GEOMETRY}
                physics={PROBE_PHYSICS}
              >
                <mesh><boxGeometry args={[0.44, 0.44, 0.44]} /><meshBasicMaterial /></mesh>
              </PlacementBody>
            ))}
            <CollisionCostProbe objectCount={objectCount} target={target} onResult={onResult} />
          </PlacementPhysicsWorld>
        </Suspense>
      </Canvas>
    </div>
  )
}

function cloneInstances(instances: EquippedAccessoryInstance[]) {
  return instances.map((instance) => ({
    ...instance,
    localPosition: [...instance.localPosition] as EquippedAccessoryInstance['localPosition'],
    localRotation: [...instance.localRotation] as EquippedAccessoryInstance['localRotation'],
  }))
}

function Fixture() {
  const requestedCount = Number(new URLSearchParams(window.location.search).get('count') ?? '1')
  const objectCount = requestedCount === 4 || requestedCount === 8 ? requestedCount : 1
  const [instances, setInstances] = useState<EquippedAccessoryInstance[]>(() => cloneInstances(Array.from({ length: objectCount }, (_, index) => makeInstance(index))))
  const [pose, setPose] = useState<RockPose>(INITIAL_POSE)
  const [session, setSession] = useState<PlacementSessionState>(() => createPlacementSession(INITIAL_POSE, instances))
  const [target, setTarget] = useState<PlacementTarget | null>(null)
  const [mode, setMode] = useState<'placement' | 'settling' | 'orbit'>('placement')
  const [settlementPlan, setSettlementPlan] = useState<PlacementSettlementPlan | null>(null)
  const [rockReady, setRockReady] = useState(false)
  const [readyAccessoryIds, setReadyAccessoryIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [settled, setSettled] = useState(false)
  const [collisionBenchmark, setCollisionBenchmark] = useState<CollisionBenchmark | null>(null)

  const selectedAccessoryId = target?.kind === 'accessory' ? target.instanceId : null
  const selectedWorld = selectedAccessoryId ? session.accessories[selectedAccessoryId] ?? null : null

  const handleRockDraft = useCallback((nextPose: RockPose) => {
    setPose(nextPose)
    setSession((current) => updatePlacementSession(current, { kind: 'rock' }, {
      position: [...nextPose.position],
      rotation: [...nextPose.rotation],
      scale: 1,
    }))
  }, [])

  const handleAccessoryDraft = useCallback((instanceId: string, transform: PlacementTransform) => {
    setSession((current) => updatePlacementSession(current, { kind: 'accessory', instanceId }, transform))
  }, [])

  const handleDone = useCallback(() => {
    const plan = buildPlacementSettlementPlan(session)
    if (!plan) {
      setError('Aucun transform n’a été modifié avant Terminer.')
      return
    }
    setSettlementPlan(plan)
    setMode('settling')
  }, [session])

  const handleCompositionSettled = useCallback((world: SettledWorldComposition) => {
    const draft = worldCompositionToPersistence(world)
    setPose(draft.rockPose)
    setInstances((current) => current.map((instance) => {
      const transform = draft.accessories.find((candidate) => candidate.instanceId === instance.id)
      return transform ? { ...instance, ...transform } : instance
    }))
    setSettlementPlan(null)
    setTarget(null)
    setMode('orbit')
    setSettled(true)
  }, [])

  const ready = rockReady && readyAccessoryIds.length >= objectCount && collisionBenchmark !== null

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', minHeight: '100dvh', overflow: 'hidden', background: '#e5e1d8' }}>
      <ShowroomScene
        rock={rock}
        retryKey={0}
        reducedMotion={false}
        onLoadStateChange={(state, message) => {
          setRockReady(state === 'ready')
          if (state === 'error') setError(message ?? 'Erreur de chargement du caillou.')
        }}
        onInteractionChange={() => undefined}
        interactionMode={mode}
        rockPose={pose}
        onRockPoseDraft={handleRockDraft}
        onCompositionSettled={handleCompositionSettled}
        placementTarget={target}
        placementTool="position"
        placementSession={session}
        settlementPlan={settlementPlan}
        cameraControlActive={false}
        onRockSelect={() => setTarget(rockPlacementTarget())}
        onAccessorySelect={(instanceId) => {
          const instance = instances.find((candidate) => candidate.id === instanceId)
          if (instance) setTarget(accessoryPlacementTarget(instance))
        }}
        accessories={instances}
        selectedAccessoryId={selectedAccessoryId}
        onAccessoryPlacementDraft={handleAccessoryDraft}
        onAccessorySettled={() => undefined}
        onAccessoryLoadStateChange={(instanceId, state, message) => {
          if (state === 'ready') {
            setReadyAccessoryIds((current) => current.includes(instanceId) ? current : [...current, instanceId])
          } else if (state === 'error') {
            setError(message ?? `Erreur de chargement ${instanceId}`)
          }
        }}
      />

      <div style={{ position: 'absolute', zIndex: 20, top: 8, left: 8, display: 'flex', gap: 8 }}>
        <button
          id="select-first-accessory"
          type="button"
          onClick={() => {
            const first = instances[0]
            if (first) setTarget(accessoryPlacementTarget(first))
          }}
        >Sélection accessoire</button>
        <button id="finish-placement" type="button" onClick={handleDone}>Terminer</button>
      </div>

      <CollisionBenchmarkWorld objectCount={objectCount} onResult={setCollisionBenchmark} />

      <output
        id="placement-performance-e2e-state"
        hidden
        data-ready={String(ready)}
        data-count={String(objectCount)}
        data-mode={mode}
        data-target={target?.kind === 'rock' ? 'rock' : target?.kind === 'accessory' ? target.instanceId : ''}
        data-rock-position={JSON.stringify(pose.position)}
        data-session-rock-position={JSON.stringify(session.rock.position)}
        data-selected-world-position={JSON.stringify(selectedWorld?.position ?? null)}
        data-settled={String(settled)}
        data-ready-accessories={String(readyAccessoryIds.length)}
        data-collision-benchmark={JSON.stringify(collisionBenchmark)}
        data-error={error ?? ''}
      />
    </div>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing Placement Lot F performance fixture root')
createRoot(root).render(<Fixture />)
