import { useCallback, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { getRockCatalogEntryById } from '../../src/content/rockCatalog'
import { AccessoryShop } from '../../src/features/accessories/AccessoryShop'
import type { AccessoryCatalogItem, AccessoryShopSnapshot, AccessoryTransform, EquippedAccessoryInstance } from '../../src/features/accessories/accessoryTypes'
import { PlacementPanel } from '../../src/features/placement/PlacementPanel'
import type { PlacementTarget, PlacementTool } from '../../src/features/placement/placementTypes'
import { accessoryLocalToWorld } from '../../src/features/rockMovement/rockMovementRules'
import type { RockCompositionDraft, RockPose } from '../../src/features/rockMovement/rockMovementTypes'
import { ShowroomScene } from '../../src/scene/ShowroomScene'
import '../../src/styles/global.css'
import '../../src/styles/showroom.css'
import '../../src/styles/adoption.css'
import '../../src/styles/accessories.css'
import '../../src/styles/accessory-placement.css'
import '../../src/styles/rock-movement.css'

const rock = getRockCatalogEntryById('rock-012')
const INITIAL_POSE: RockPose = { position: [0, 0.52, 0], rotation: [0, 0, 0, 1] }

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
  const [mode, setMode] = useState<'placement' | 'composition-settle' | 'orbit'>('placement')
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

  const selectedAccessoryId = target?.kind === 'accessory' ? target.instanceId : null
  const selectedWorld = useMemo(() => {
    if (!selectedAccessoryId) return null
    const instance = instances.find((candidate) => candidate.id === selectedAccessoryId)
    return instance ? accessoryLocalToWorld(instance.id, instance, pose) : null
  }, [instances, pose, selectedAccessoryId])

  const handleDraft = useCallback((instanceId: string, transform: AccessoryTransform) => {
    setInstances((current) => current.map((instance) => instance.id === instanceId
      ? { ...instance, ...transform, stabilizedAt: null }
      : instance))
  }, [])

  const handleCommit = useCallback((instanceId: string, transform: AccessoryTransform) => {
    setInstances((current) => current.map((instance) => instance.id === instanceId
      ? { ...instance, ...transform, stabilizedAt: '2026-09-02T08:30:00.000Z' }
      : instance))
    setIndividualSettled((current) => current + 1)
  }, [])

  const handleDone = useCallback(() => {
    if (target?.kind === 'rock') {
      setMode('composition-settle')
      return
    }
    setTarget(null)
    setMode('orbit')
  }, [target])

  const handleComposition = useCallback((draft: RockCompositionDraft) => {
    setSettled(draft)
    setPose(draft.rockPose)
    setInstances((current) => current.map((instance) => {
      const next = draft.accessories.find((candidate) => candidate.instanceId === instance.id)
      return next ? { ...instance, ...next, stabilizedAt: '2026-09-02T08:31:00.000Z' } : instance
    }))
    setTarget(null)
    setMode('orbit')
  }, [])

  return (
    <div className={`pedestal-shell${mode === 'placement' ? ' is-placement-mode' : mode === 'composition-settle' ? ' is-composition-settling' : ''}`}>
      <main className="pedestal-main">
        <section className="pedestal-stage">
          <ShowroomScene
            rock={rock}
            retryKey={0}
            reducedMotion={false}
            onLoadStateChange={(state) => setRockReady(state === 'ready')}
            onInteractionChange={() => undefined}
            interactionMode={mode}
            rockPose={pose}
            onRockPoseDraft={setPose}
            onCompositionSettled={handleComposition}
            placementTarget={target}
            placementTool={tool}
            accessories={instances}
            selectedAccessoryId={selectedAccessoryId}
            onAccessorySelect={() => undefined}
            onAccessoryTransformDraft={handleDraft}
            onAccessoryTransformCommit={handleCommit}
            onAccessoryLoadStateChange={(id, state) => {
              if (state === 'ready') setReadyAccessories((current) => current.includes(id) ? current : [...current, id])
            }}
          />

          {mode === 'placement' ? (
            <PlacementPanel
              rockName="Bernard"
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
          ) : null}
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
        data-selected-scale={String(selectedWorld?.uniformScale ?? 0)}
        data-individual-settled={String(individualSettled)}
        data-global-settled={String(settled !== null)}
      />
    </div>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing unified placement E2E fixture root')
createRoot(root).render(<Fixture />)
