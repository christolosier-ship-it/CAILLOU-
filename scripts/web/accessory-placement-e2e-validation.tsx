import { StrictMode, useCallback, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { getRockCatalogEntryById } from '../../src/content/rockCatalog'
import { AccessoryEditor } from '../../src/features/accessories/AccessoryEditor'
import type { AccessoryTransform, EquippedAccessoryInstance } from '../../src/features/accessories/accessoryTypes'
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
    equippedAt: '2026-09-01T20:00:00.000Z',
    updatedAt: '2026-09-01T20:00:00.000Z',
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
    equippedAt: '2026-09-01T20:00:01.000Z',
    updatedAt: '2026-09-01T20:00:01.000Z',
    localPosition: [-0.18, 0.16, 0.76],
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
  const [selectedId, setSelectedId] = useState(INITIAL_INSTANCES[0].id)
  const [loadedIds, setLoadedIds] = useState<string[]>([])
  const [saveCount, setSaveCount] = useState(0)
  const [disposeCount, setDisposeCount] = useState(0)
  const [disposedGeometries, setDisposedGeometries] = useState(0)
  const [reloadCount, setReloadCount] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const serverInstances = useRef(cloneInstances(INITIAL_INSTANCES))

  const commitTransform = useCallback((instanceId: string, transform: AccessoryTransform) => {
    const commit = (current: EquippedAccessoryInstance[]) => current.map((instance) => instance.id === instanceId
      ? { ...instance, ...transform, updatedAt: new Date().toISOString() }
      : instance)
    setInstances(commit)
    serverInstances.current = commit(serverInstances.current)
    setSaveCount((current) => current + 1)
    setMessage('Transform persistant enregistré.')
  }, [])

  const removeInstance = useCallback((instanceId: string) => {
    const next = serverInstances.current.filter((instance) => instance.id !== instanceId)
    serverInstances.current = cloneInstances(next)
    setInstances(cloneInstances(next))
    setSelectedId((current) => current === instanceId ? (next[0]?.id ?? '') : current)
    setMessage('Instance retirée.')
  }, [])

  const handleLoadState = useCallback((instanceId: string, state: 'loading' | 'ready' | 'error') => {
    if (state === 'loading') {
      setLoadedIds((current) => current.filter((id) => id !== instanceId))
    } else if (state === 'ready') {
      setLoadedIds((current) => current.includes(instanceId) ? current : [...current, instanceId])
    }
  }, [])

  const handleDisposed = useCallback((_instanceId: string, report: DisposalReport) => {
    setDisposeCount((current) => current + 1)
    setDisposedGeometries((current) => current + report.geometries)
  }, [])

  const simulateReload = useCallback(() => {
    const canonical = cloneInstances(serverInstances.current)
    setLoadedIds([])
    setInstances([])
    setMessage('Reload canonique simulé.')

    window.setTimeout(() => {
      setInstances(canonical)
      setReloadCount((current) => current + 1)
    }, 0)
  }, [])

  return (
    <div className="pedestal-shell is-accessory-mode">
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
            onAccessoryDisposed={handleDisposed}
          />
          <AccessoryEditor
            instances={instances}
            selectedId={selectedId}
            busy={false}
            message={message}
            maxInstances={8}
            onSelect={setSelectedId}
            onTransform={commitTransform}
            onRemove={removeInstance}
            onOpenShop={() => setMessage('Ouverture boutique simulée.')}
            onDone={() => setMessage('Édition terminée.')}
          />
        </section>
      </main>

      <output
        id="accessory-placement-e2e-state"
        hidden
        data-instance-count={instances.length}
        data-selected-id={selectedId}
        data-loaded-count={loadedIds.length}
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

createRoot(root).render(
  <StrictMode>
    <AccessoryPlacementFixture />
  </StrictMode>,
)
