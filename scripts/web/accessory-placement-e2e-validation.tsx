import { useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { getRockCatalogEntryById } from '../../src/content/rockCatalog'
import type { EquippedAccessoryInstance } from '../../src/features/accessories/accessoryTypes'
import { worldAccessoryToPersistence } from '../../src/features/placement/placementPersistence'
import type { PlacementTool, PlacementTransform } from '../../src/features/placement/placementTypes'
import { DEFAULT_ROCK_POSE } from '../../src/features/rockMovement/rockMovementRules'
import { ShowroomScene } from '../../src/scene/ShowroomScene'
import type { DisposalReport } from '../../src/scene/rockResources'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'
import '../../src/styles/adoption.css'
import '../../src/styles/accessories.css'
import '../../src/styles/accessory-placement.css'

const rock = getRockCatalogEntryById('rock-012')

const INITIAL_INSTANCES: EquippedAccessoryInstance[] = [
  {
    id: '10c10000-0000-4000-8000-000000000001',
    userRockId: '10c10000-0000-4000-8000-000000000099',
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
    equippedAt: '2026-09-01T20:00:00.000Z',
    updatedAt: '2026-09-01T20:00:00.000Z',
    stabilizedAt: '2026-09-01T20:00:00.000Z',
    localPosition: [0, 0.16, 0.76],
    localRotation: [0, 0, 0, 1],
    uniformScale: 1,
  },
  {
    id: '10c10000-0000-4000-8000-000000000002',
    userRockId: '10c10000-0000-4000-8000-000000000099',
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
    equippedAt: '2026-09-01T20:00:01.000Z',
    updatedAt: '2026-09-01T20:00:01.000Z',
    stabilizedAt: '2026-09-01T20:00:01.000Z',
    localPosition: [0, 0.16, 0.76],
    localRotation: [0, 0, 0, 1],
    uniformScale: 1,
  },
]

function cloneInstances(instances: EquippedAccessoryInstance[]) {
  return instances.map((instance) => ({
    ...instance,
    localPosition: [...instance.localPosition] as EquippedAccessoryInstance['localPosition'],
    localRotation: [...instance.localRotation] as EquippedAccessoryInstance['localRotation'],
  }))
}

function serializedTransforms(instances: EquippedAccessoryInstance[]) {
  return instances.map((instance) => ({
    id: instance.id,
    position: instance.localPosition,
    rotation: instance.localRotation,
    scale: instance.uniformScale,
  }))
}

function AccessoryPlacementFixture() {
  const [instances, setInstances] = useState(() => cloneInstances(INITIAL_INSTANCES))
  const [selectedId, setSelectedId] = useState(INITIAL_INSTANCES[0]!.id)
  const [tool, setTool] = useState<PlacementTool>('position')
  const [mode, setMode] = useState<'placement' | 'settling' | 'orbit'>('placement')
  const [loadedIds, setLoadedIds] = useState<string[]>([])
  const [draftCount, setDraftCount] = useState(0)
  const [saveCount, setSaveCount] = useState(0)
  const [disposeCount, setDisposeCount] = useState(0)
  const [disposedGeometries, setDisposedGeometries] = useState(0)
  const [reloadCount, setReloadCount] = useState(0)
  const serverInstances = useRef(cloneInstances(INITIAL_INSTANCES))

  const select = useCallback((instanceId: string) => {
    setSelectedId(instanceId)
    setTool('position')
    setMode('placement')
  }, [])

  const handleDraft = useCallback(() => {
    setDraftCount((current) => current + 1)
  }, [])

  const handleSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
    const persisted = worldAccessoryToPersistence(instanceId, transform, DEFAULT_ROCK_POSE)
    const commit = (current: EquippedAccessoryInstance[]) => current.map((instance) => instance.id === instanceId
      ? {
          ...instance,
          ...persisted,
          updatedAt: '2026-09-02T20:00:00.000Z',
          stabilizedAt: '2026-09-02T20:00:00.000Z',
        }
      : instance)
    setInstances(commit)
    serverInstances.current = commit(serverInstances.current)
    setSaveCount((current) => current + 1)
    setMode('orbit')
  }, [])

  const removeInstance = useCallback((instanceId: string) => {
    const next = serverInstances.current.filter((instance) => instance.id !== instanceId)
    serverInstances.current = cloneInstances(next)
    setInstances(cloneInstances(next))
    setSelectedId(next[0]?.id ?? '')
    setMode('orbit')
  }, [])

  const handleLoadState = useCallback((instanceId: string, state: 'loading' | 'ready' | 'error') => {
    setLoadedIds((current) => {
      if (state === 'loading') return current.filter((id) => id !== instanceId)
      if (state === 'ready' && !current.includes(instanceId)) return [...current, instanceId]
      return current
    })
  }, [])

  const handleDisposed = useCallback((instanceId: string, report: DisposalReport) => {
    void instanceId
    setDisposeCount((current) => current + 1)
    setDisposedGeometries((current) => current + report.geometries)
  }, [])

  const simulateReload = useCallback(() => {
    const canonical = cloneInstances(serverInstances.current)
    setLoadedIds([])
    setInstances([])
    setMode('orbit')

    window.setTimeout(() => {
      setInstances(canonical)
      setSelectedId(canonical[0]?.id ?? '')
      setTool('position')
      setMode('placement')
      setReloadCount((current) => current + 1)
    }, 0)
  }, [])

  return (
    <div className={`pedestal-shell${mode === 'placement' ? ' is-placement-mode' : ''}`}>
      <main className="pedestal-main">
        <section className="pedestal-stage" data-accessory-count={instances.length}>
          <ShowroomScene
            rock={rock}
            retryKey={0}
            reducedMotion={false}
            onLoadStateChange={() => undefined}
            onInteractionChange={() => undefined}
            interactionMode={mode}
            rockPose={DEFAULT_ROCK_POSE}
            placementTarget={mode === 'orbit' || !selectedId ? null : { kind: 'accessory', instanceId: selectedId }}
            placementTool={tool}
            accessories={instances}
            selectedAccessoryId={selectedId || null}
            onAccessorySelect={select}
            onAccessoryPlacementDraft={handleDraft}
            onAccessorySettled={handleSettled}
            onAccessoryLoadStateChange={handleLoadState}
            onAccessoryDisposed={handleDisposed}
          />

          <div className="placement-fixture-controls" style={{ position: 'absolute', zIndex: 30, right: 8, bottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 320 }}>
            <button id="placement-select-monocle" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => select(INITIAL_INSTANCES[0]!.id)}>Monocle</button>
            <button id="placement-select-glasses" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => select(INITIAL_INSTANCES[1]!.id)}>Lunettes</button>
            <button id="placement-position" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => { setMode('placement'); setTool('position') }}>Position</button>
            <button id="placement-orientation" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => { setMode('placement'); setTool('orientation') }}>Orientation</button>
            <button id="placement-size" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => { setMode('placement'); setTool('size') }}>Taille</button>
            <button id="placement-settle" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => setMode('settling')}>Lâcher</button>
            <button id="placement-remove" type="button" style={{ minWidth: 44, minHeight: 44 }} onClick={() => selectedId && removeInstance(selectedId)}>Retirer</button>
          </div>
        </section>
      </main>

      <output
        id="accessory-placement-e2e-state"
        hidden
        data-mode={mode}
        data-instance-count={instances.length}
        data-selected-id={selectedId}
        data-loaded-count={loadedIds.length}
        data-draft-count={draftCount}
        data-save-count={saveCount}
        data-dispose-count={disposeCount}
        data-disposed-geometries={disposedGeometries}
        data-reload-count={reloadCount}
        data-transforms={JSON.stringify(serializedTransforms(instances))}
        data-server-transforms={JSON.stringify(serializedTransforms(serverInstances.current))}
      />
      <button id="simulate-accessory-reload" type="button" hidden onClick={simulateReload}>Simuler reload</button>
    </div>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing accessory placement E2E fixture root')
createRoot(root).render(<AccessoryPlacementFixture />)
