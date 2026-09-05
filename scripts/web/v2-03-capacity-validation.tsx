import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import type { Json } from '../../src/lib/supabase/database.types'
import type { EquippedAccessoryInstance } from '../../src/features/accessories/accessoryTypes'
import { PlacementPhysicsWorld } from '../../src/features/placement/PlacementPhysicsWorld'
import type { PlacementGeometry } from '../../src/features/placement/placementGeometry'
import type { PlacementTransform } from '../../src/features/placement/placementTypes'
import type { RockPose } from '../../src/features/rockMovement/rockMovementTypes'
import { AccessoryModel } from '../../src/scene/AccessoryModel'

interface ManifestBudget {
  runtimeModelBytes?: number
}

interface ManifestAccessory {
  id: string
  name: string
  category: string
  modelPath: string
  previewPath: string
  triangleCount: number
  dimensions: Json
  scaleMin: number
  scaleMax: number
  physics: Json
  collision: Json
  budget: ManifestBudget
}

interface Manifest {
  schemaVersion: number
  accessories: ManifestAccessory[]
}

interface GpuSnapshot {
  geometries: number
  textures: number
  calls: number
  triangles: number
}

const V2_IDS = new Set([
  'mask-scan',
  'mouse-ears',
  'traffic-cone',
  'bebe-assets',
  'chicken',
  'crocodile-dog-toy',
  'garden-gnome',
  'model',
  'poo-scan',
  'skull',
  'worn-flip-flop',
])

const USER_ROCK_ID = '10f30000-0000-4000-8000-000000000099'
const ZERO_ROCK_POSE: RockPose = { position: [0, 0, 0], rotation: [0, 0, 0, 1] }
const STABLE_AT = '2026-09-05T06:00:00.000Z'

function runtimeModelBytes(item: ManifestAccessory) {
  return typeof item.budget?.runtimeModelBytes === 'number' ? item.budget.runtimeModelBytes : 0
}

function benchmarkPosition(index: number, count: number): [number, number, number] {
  if (count <= 1) return [0, 1.42, 0]
  const radius = count <= 4 ? 1.05 : 1.62
  const angle = (index / count) * Math.PI * 2
  return [
    Math.cos(angle) * radius,
    1.35 + (index % 2) * 0.14,
    Math.sin(angle) * radius,
  ]
}

function makeInstance(item: ManifestAccessory, index: number, count: number): EquippedAccessoryInstance {
  const suffix = String(index + 1).padStart(12, '0')
  const scale = Math.min(item.scaleMax, Math.max(item.scaleMin, 0.68))
  return {
    id: `10f30000-0000-4000-8000-${suffix}`,
    userRockId: USER_ROCK_ID,
    accessoryId: item.id,
    category: item.category,
    name: item.name,
    modelPath: item.modelPath,
    previewPath: item.previewPath,
    scaleMin: item.scaleMin,
    scaleMax: item.scaleMax,
    triangleCount: item.triangleCount,
    dimensions: item.dimensions,
    physics: item.physics,
    collision: item.collision,
    budget: item.budget as Json,
    equippedAt: STABLE_AT,
    updatedAt: STABLE_AT,
    stabilizedAt: STABLE_AT,
    localPosition: benchmarkPosition(index, count),
    localRotation: [0, 0, 0, 1],
    uniformScale: scale,
  }
}

function GpuProbe() {
  const gl = useThree((state) => state.gl)
  const frameRef = useRef(0)

  useFrame(() => {
    frameRef.current += 1
    if (frameRef.current % 12 !== 0) return
    const output = document.querySelector('#v2-03-capacity-state')
    if (!output) return
    const snapshot: GpuSnapshot = {
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    }
    output.setAttribute('data-gpu', JSON.stringify(snapshot))
  })

  return null
}

function CameraTarget() {
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    camera.lookAt(0, 0.45, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function Fixture() {
  const requestedCount = Number(new URLSearchParams(window.location.search).get('count') ?? '1')
  const objectCount = requestedCount === 4 || requestedCount === 8 ? requestedCount : 1
  const [instances, setInstances] = useState<EquippedAccessoryInstance[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [readyIds, setReadyIds] = useState<string[]>([])
  const [settledIds, setSettledIds] = useState<string[]>([])
  const [loadDurations, setLoadDurations] = useState<Record<string, number>>({})
  const [loadAllMs, setLoadAllMs] = useState<number | null>(null)
  const [settling, setSettling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const benchmarkStartedRef = useRef<number | null>(null)
  const loadStartedRef = useRef(new Map<string, number>())

  useEffect(() => {
    let active = true
    void fetch('/assets/accessories/catalog.json', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error(`catalogue HTTP ${response.status}`)
      const manifest = await response.json() as Manifest
      if (manifest.schemaVersion !== 2) throw new Error(`schema catalogue inattendu: ${manifest.schemaVersion}`)
      const candidates = manifest.accessories
        .filter((item) => V2_IDS.has(item.id))
        .sort((left, right) => runtimeModelBytes(right) - runtimeModelBytes(left))
      if (candidates.length !== V2_IDS.size) {
        throw new Error(`catalogue V2 incomplet: ${candidates.length}/${V2_IDS.size}`)
      }
      const selected = candidates.slice(0, objectCount)
      if (!active) return
      benchmarkStartedRef.current = performance.now()
      setSelectedIds(selected.map((item) => item.id))
      setInstances(selected.map((item, index) => makeInstance(item, index, objectCount)))
    }).catch((nextError) => {
      if (!active) return
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    })
    return () => {
      active = false
    }
  }, [objectCount])

  useEffect(() => {
    if (loadAllMs !== null || readyIds.length !== objectCount || benchmarkStartedRef.current === null) return
    setLoadAllMs(performance.now() - benchmarkStartedRef.current)
  }, [loadAllMs, objectCount, readyIds.length])

  const handleGeometryReady = useCallback((_instanceId: string, _geometry: PlacementGeometry | null) => undefined, [])

  const handleLoadState = useCallback((instanceId: string, state: 'loading' | 'ready' | 'error', message?: string) => {
    if (state === 'loading') {
      if (!loadStartedRef.current.has(instanceId)) loadStartedRef.current.set(instanceId, performance.now())
      return
    }
    if (state === 'error') {
      setError(`${instanceId}: ${message ?? 'erreur de chargement'}`)
      return
    }
    const startedAt = loadStartedRef.current.get(instanceId) ?? benchmarkStartedRef.current ?? performance.now()
    setLoadDurations((current) => current[instanceId] !== undefined
      ? current
      : { ...current, [instanceId]: performance.now() - startedAt })
    setReadyIds((current) => current.includes(instanceId) ? current : [...current, instanceId])
  }, [])

  const handleSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    setInstances((current) => current.map((instance) => instance.id === instanceId
      ? {
          ...instance,
          localPosition: [...transform.position],
          localRotation: [...transform.rotation],
          uniformScale: transform.scale,
          stabilizedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : instance))
    setSettledIds((current) => current.includes(instanceId) ? current : [...current, instanceId])
  }, [])

  const allReady = instances.length === objectCount && readyIds.length === objectCount && !error
  const allSettled = settledIds.length === objectCount && objectCount > 0
  const totalTriangles = instances.reduce((sum, instance) => sum + (instance.triangleCount ?? 0), 0)
  const totalModelBytes = instances.reduce((sum, instance) => {
    const budget = instance.budget && typeof instance.budget === 'object' && !Array.isArray(instance.budget)
      ? instance.budget as Record<string, Json | undefined>
      : {}
    return sum + (typeof budget.runtimeModelBytes === 'number' ? budget.runtimeModelBytes : 0)
  }, 0)

  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#e5e1d8' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas
          camera={{ position: [0, 3.6, 5.8], fov: 42, near: 0.05, far: 100 }}
          dpr={1}
          frameloop="always"
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#e5e1d8']} />
          <ambientLight intensity={0.62} />
          <directionalLight position={[4, 6, 4]} intensity={2.1} />
          <directionalLight position={[-3, 3, -2]} intensity={0.7} />
          <PlacementPhysicsWorld paused={false}>
            {instances.map((instance) => (
              <AccessoryModel
                key={instance.id}
                instance={instance}
                selected={false}
                rockPose={ZERO_ROCK_POSE}
                compositionFrozen={false}
                globalSettling={false}
                settlingRequested={settling && !settledIds.includes(instance.id)}
                onSettledWorld={handleSettled}
                onPlacementGeometryReady={handleGeometryReady}
                onLoadStateChange={handleLoadState}
              />
            ))}
          </PlacementPhysicsWorld>
          <GpuProbe />
          <CameraTarget />
        </Canvas>
      </div>

      <button
        id="start-settlement"
        type="button"
        disabled={!allReady || settling || allSettled}
        onClick={() => {
          setSettledIds([])
          setSettling(true)
        }}
        style={{ position: 'fixed', left: 12, top: 12, zIndex: 5 }}
      >
        Stabiliser
      </button>

      <output
        id="v2-03-capacity-state"
        data-ready={allReady ? 'true' : 'false'}
        data-count={objectCount}
        data-ready-count={readyIds.length}
        data-settled-count={settledIds.length}
        data-settling={settling && !allSettled ? 'true' : 'false'}
        data-load-all-ms={loadAllMs ?? ''}
        data-load-durations={JSON.stringify(loadDurations)}
        data-selected-ids={JSON.stringify(selectedIds)}
        data-triangle-total={totalTriangles}
        data-model-bytes-total={totalModelBytes}
        data-error={error ?? ''}
        style={{ position: 'fixed', left: -10000, top: 0 }}
      >
        capacity-state
      </output>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
