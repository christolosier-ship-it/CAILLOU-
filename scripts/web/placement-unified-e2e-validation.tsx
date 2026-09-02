import { useCallback, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { getRockCatalogEntryById } from '../../src/content/rockCatalog'
import { AccessoryShop } from '../../src/features/accessories/AccessoryShop'
import type { AccessoryCatalogItem, AccessoryShopSnapshot, EquippedAccessoryInstance } from '../../src/features/accessories/accessoryTypes'
import { PlacementPanel } from '../../src/features/placement/PlacementPanel'
import { worldAccessoryToPersistence, worldCompositionToPersistence } from '../../src/features/placement/placementPersistence'
import type { SettledWorldComposition } from '../../src/features/placement/placementPersistence'
import type { PlacementTarget, PlacementTool, PlacementTransform } from '../../src/features/placement/placementTypes'
import { accessoryLocalToWorld } from '../../src/features/rockMovement/rockMovementRules'
import type { RockCompositionDraft, RockPose } from '../../src/features/rockMovement/rockMovementTypes'
import { ShowroomScene } from '../../src/scene/ShowroomScene'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'
import '../../src/styles/adoption.css'
import '../../src/styles/accessories.css'
import '../../src/styles/accessory-placement.css'
import '../../src/styles/rock-movement.css'

const rock = getRockCatalogEntryById('rock-018')
const INITIAL_POSE: RockPose = { position: [0, 1.35, 0], rotation: [0, 0, 0, 1] }

const MONOCLE: AccessoryCatalogItem = {
  id: 'monocle',
  name: 'Monocle',
  description: 'Monocle de validation.',
  priceLithons: 90,
  modelPath: '/assets/accessories/monocle/model.glb',
  previewPath: '/assets/accessory-previews/monocle.png',
  category: 'visage',
  sortOrder: 10,
  triangleCount: 665,
  dimensions: [0.440386, 0.626706, 0.725703],
  scaleMin: 0.65,
  scaleMax: 1.35,
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
  provenance: { license: 'CC BY 4.0' },
  purchasedAt: '2026-09-02T08:00:00.000Z',
}

function makeInstance(id: string, ordinal: number): EquippedAccessoryInstance {
  return {
    id,
    userRockId: '10750000-0000-4000-8000-000000000099',
    accessoryId: MONOCLE.id,
    category: MONOCLE.category,
    name: MONOCLE.name,
    modelPath: MONOCLE.modelPath,
    previewPath: MONOCLE.previewPath,
    scaleMin: MONOCLE.scaleMin,
    scaleMax: MONOCLE.scaleMax,
    triangleCount: MONOCLE.triangleCount,
    dimensions: MONOCLE.dimensions,
    physics: MONOCLE.physics,
    equippedAt: '2026-09-02T08:00:00.000Z',
    updatedAt: '2026-09-02T08:00:00.000Z',
    stabilizedAt: '2026-09-02T08:00:00.000Z',
    localPosition: [ordinal * 0.12, 0.22, 0.74],
    localRotation: [0, 0, 0, 1],
    uniformScale: 1,
  }
}

const SHOP: AccessoryShopSnapshot = { items: [MONOCLE] }
const loadShop = async () => SHOP

function Fixture() {
  const [permitUnlocked, setPermitUnlocked] = useState(false)
  const [balance, setBalance] = useState(1500)
  const [shopOpen, setShopOpen] = useState(false)
  const [mode, setMode] = useState<'placement' | 'settling' | 'orbit'>('placement')
  const [target, setTarget] = useState<PlacementTarget | null>(null)
  const [tool, setTool] = useState<PlacementTool>('position')
  const [pose, setPose] = useState<RockPose>(INITIAL_POSE)
  const [instances, setInstances] = useState<EquippedAccessoryInstance[]>([
    makeInstance('10750000-0000-4000-8000-000000000001', 0),
  ])
  const [settled, setSettled] = useState<RockCompositionDraft | null>(null)
  const [rockReady, setRockReady] = useState(false)
  const [readyAccessories, setReadyAccessories] = useState<string[]>([])
  const [individualSettled, setIndividualSettled] = useState(0)
  const [selectedWorldDraft, setSelectedWorldDraft] = useState<PlacementTransform | null>(null)

  const selectedAccessoryId = target?.kind === 'accessory' ? target.instanceId : null
  const selectedWorld = useMemo(() => {
    if (!selectedAccessoryId) return null
    const instance = instances.find((candidate) => candidate.id === selectedAccessoryId)
    if (selectedWorldDraft) return { instanceId: selectedAccessoryId, worldPosition: selectedWorldDraft.position, worldRotation: selectedWorldDraft.rotation, uniformScale: selectedWorldDraft.scale }
    return instance ? accessoryLocalToWorld(instance.id, instance, pose) : null
  }, [instances, pose, selectedAccessoryId, selectedWorldDraft])

  const handleRockLoadState = useCallback((state: 'loading' | 'ready' | 'error') => {
    setRockReady(state === 'ready')
  }, [])
  const handleInteraction = useCallback(() => undefined, [])
  const handleAccessorySelectNoop = useCallback(() => undefined, [])
  const handleAccessoryLoadState = useCallback((id: string, state: 'loading' | 'ready' | 'error') => {
    if (state !== 'ready') return
    setReadyAccessories((current) => current.includes(id) ? current : [...current, id])
  }, [])

const handleWorldDraft = useCallback((_: string, transform: PlacementTransform) => {
  setSelectedWorldDraft(transform)
}, [])
const handleIndividualSettled = useCallback((instanceId: string, transform: PlacementTransform) => {
  const local = worldAccessoryToPersistence(instanceId, transform, pose)
  setInstances((current) => current.map((instance) => instance.id === instanceId
    ? { ...instance, ...local, stabilizedAt: '2026-09-02T08:30:00.000Z' }
    : instance))
  setSelectedWorldDraft(null)
  setIndividualSettled((current) => current + 1)
  setTarget(null)
  setMode('orbit')
}, [pose])

const handleDone = useCallback(() => {
  setMode(target ? 'settling' : 'orbit')
}, [target])
const handleComposition = useCallback((world: SettledWorldComposition) => {
  const draft: RockCompositionDraft = worldCompositionToPersistence(world)
  setSettled(draft)
  setPose(draft.rockPose)
  setInstances((current) => current.map((instance) => {
    const next = draft.accessories.find((candidate) => candidate.instanceId === instance.id)
    return next ? { ...instance, ...next, stabilizedAt: '2026-09-02T08:31:00.000Z' } : instance
  }))
  setTarget(null)
  setMode('orbit')
}, [])
  const reopenPlacement = useCallback(() => {
    setSelectedWorldDraft(null)
    setTarget(null)
    setTool('position')
    setMode('placement')
  }, [])

  return (
    <div className={`pedestal-shell${mode === 'placement' ? ' is-placement-mode' : mode === 'settling' ? ' is-composition-settling' : ''}`}>
      <main className="pedestal-main">
        <section className="pedestal-stage">
          <ShowroomScene
            rock={rock}
            retryKey={0}
            reducedMotion={false}
            onLoadStateChange={handleRockLoadState}
            onInteractionChange={handleInteraction}
            interactionMode={mode}
            rockPose={pose}
            onRockPoseDraft={setPose}
            onCompositionSettled={handleComposition}
            placementTarget={target}
            placementTool={tool}
            accessories={instances}
            selectedAccessoryId={selectedAccessoryId}
            onAccessorySelect={handleAccessorySelectNoop}
            onAccessoryPlacementDraft={handleWorldDraft}
            onAccessorySettled={handleIndividualSettled}
            onAccessoryLoadStateChange={handleAccessoryLoadState}
          />

          {mode === 'placement' ? (
            <PlacementPanel
              rockName="Pierre"
              permitUnlocked={permitUnlocked}
              permitLoading={false}
              instances={instances}
              selectedTarget={target}
              tool={tool}
              busy={false}
              message={null}
              maxInstances={8}
              loadShop={loadShop}
              onSelectRock={() => {
                setTarget({ kind: 'rock' })
                setTool('position')
              }}
              onOpenPermitShop={() => setShopOpen(true)}
              onSelectAccessory={(instanceId) => {
                setTarget({ kind: 'accessory', instanceId })
                setTool('position')
              }}
              onToolChange={setTool}
              onAddOwned={async () => {
                const id = `10750000-0000-4000-8000-${String(instances.length + 1).padStart(12, '0')}`
                const created = makeInstance(id, instances.length)
                setInstances((current) => [...current, created])
                setTarget({ kind: 'accessory', instanceId: id })
                setTool('position')
              }}
              onRemove={(instanceId) => setInstances((current) => current.filter((instance) => instance.id !== instanceId))}
              onDone={handleDone}
            />
          ) : (
            <button id="reopen-placement" type="button" onClick={reopenPlacement}>Rouvrir Placement</button>
          )}
        </section>
      </main>

      {shopOpen ? (
        <AccessoryShop
          balance={balance}
          permit={{
            featureId: 'rock_movement',
            name: 'Permis de manutention minérale',
            description: 'Autorise le déplacement persistant du caillou.',
            priceLithons: 1000,
            unlockedAt: permitUnlocked ? '2026-09-02T08:15:00.000Z' : null,
            pricePaid: permitUnlocked ? 1000 : null,
          }}
          permitLoading={false}
          permitPending={false}
          permitError={null}
          highlightPermit
          onPermitPurchase={async () => {
            setBalance((current) => current - 1000)
            setPermitUnlocked(true)
            return true
          }}
          loadShop={loadShop}
          purchaseMutation={async ({ accessoryId }) => ({ accessoryId, purchasedAt: '2026-09-02T08:00:00.000Z', balance })}
          onBalanceChanged={setBalance}
          onPurchased={() => undefined}
          onClose={() => setShopOpen(false)}
        />
      ) : null}

      <output
        id="placement-unified-e2e-state"
        hidden
        data-mode={mode}
        data-permit={String(permitUnlocked)}
        data-balance={String(balance)}
        data-shop-open={String(shopOpen)}
        data-rock-ready={String(rockReady)}
        data-accessory-ready-count={String(readyAccessories.length)}
        data-target={target?.kind === 'accessory' ? target.instanceId : target?.kind ?? ''}
        data-tool={tool}
        data-rock-position={JSON.stringify(pose.position)}
        data-rock-rotation={JSON.stringify(pose.rotation)}
        data-instance-count={String(instances.length)}
        data-selected-world-position={JSON.stringify(selectedWorld?.worldPosition ?? null)}
        data-selected-world-rotation={JSON.stringify(selectedWorld?.worldRotation ?? null)}
        data-selected-scale={String(selectedWorld?.uniformScale ?? 0)}
        data-individual-settled={String(individualSettled)}
        data-global-settled={String(settled !== null)}
        data-global-settled-rock-position={JSON.stringify(settled?.rockPose.position ?? null)}
        data-global-settled-rock-rotation={JSON.stringify(settled?.rockPose.rotation ?? null)}
      />
    </div>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing unified placement E2E fixture root')
createRoot(root).render(<Fixture />)
