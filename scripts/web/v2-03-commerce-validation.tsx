import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import type { Json } from '../../src/lib/supabase/database.types'
import { AccessoryPurchaseError } from '../../src/features/accessories/accessoryApi'
import { AccessoryShop } from '../../src/features/accessories/AccessoryShop'
import { defaultAccessoryTransform } from '../../src/features/accessories/accessoryPlacementRules'
import type {
  AccessoryCatalogItem,
  AccessoryShopSnapshot,
  EquippedAccessoryInstance,
  PurchaseAccessoryInput,
  PurchaseAccessoryResult,
} from '../../src/features/accessories/accessoryTypes'
import { PlacementPanel } from '../../src/features/placement/PlacementPanel'
import { PlacementPhysicsWorld } from '../../src/features/placement/PlacementPhysicsWorld'
import { accessoryPlacementTarget } from '../../src/features/placement/placementObject'
import type { PlacementTarget } from '../../src/features/placement/placementTypes'
import type { RockPose } from '../../src/features/rockMovement/rockMovementTypes'
import { AccessoryModel } from '../../src/scene/AccessoryModel'
import '../../src/styles/global.css'
import '../../src/styles/accessories.css'
import '../../src/styles/accessory-placement.css'

interface ManifestAccessory {
  id: string
  name: string
  description: string
  priceLithons: number
  modelPath: string
  previewPath: string
  category: string
  sortOrder: number
  triangleCount: number
  dimensions: Json
  scaleMin: number
  scaleMax: number
  physics: Json
  collision: Json
  budget: Json
}

interface Manifest {
  schemaVersion: number
  accessories: ManifestAccessory[]
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
const ROCK_POSE: RockPose = { position: [0, 0, 0], rotation: [0, 0, 0, 1] }
const USER_ROCK_ID = '10g30000-0000-4000-8000-000000000099'
const PURCHASED_AT = '2026-09-05T07:45:00.000Z'

function toCatalogItem(item: ManifestAccessory, purchasedAt: string | null): AccessoryCatalogItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    priceLithons: item.priceLithons,
    modelPath: item.modelPath,
    previewPath: item.previewPath,
    category: item.category,
    sortOrder: item.sortOrder,
    triangleCount: item.triangleCount,
    dimensions: item.dimensions,
    scaleMin: item.scaleMin,
    scaleMax: item.scaleMax,
    physics: item.physics,
    collision: item.collision,
    budget: item.budget,
    provenance: null,
    purchasedAt,
  }
}

function toInstance(item: AccessoryCatalogItem, ordinal: number): EquippedAccessoryInstance {
  const transform = defaultAccessoryTransform(item, ordinal)
  return {
    id: `10g30000-0000-4000-8000-${String(ordinal + 1).padStart(12, '0')}`,
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
    budget: item.budget,
    equippedAt: PURCHASED_AT,
    updatedAt: PURCHASED_AT,
    stabilizedAt: PURCHASED_AT,
    ...transform,
  }
}

function TapProbe({ item, onReady, onTap }: {
  item: AccessoryCatalogItem
  onReady: (ready: boolean) => void
  onTap: () => void
}) {
  const instance = useMemo<EquippedAccessoryInstance>(() => ({
    ...toInstance(item, 50),
    id: '10g30000-0000-4000-8000-000000000050',
    localPosition: [0, 0, 0],
    localRotation: [0, 0, 0, 1],
    uniformScale: Math.min(item.scaleMax, Math.max(item.scaleMin, 0.75)),
  }), [item])

  return (
    <div id="v2-tap-probe" style={{ position: 'fixed', right: 8, bottom: 8, width: 220, height: 220, zIndex: 2 }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 38, near: 0.05, far: 50 }} dpr={1} frameloop="demand">
        <color attach="background" args={['#e5e1d8']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 4]} intensity={2} />
        <PlacementPhysicsWorld paused={false}>
          <AccessoryModel
            instance={instance}
            selected={false}
            rockPose={ROCK_POSE}
            compositionFrozen
            onSelect={onTap}
            onLoadStateChange={(_, state) => onReady(state === 'ready')}
          />
        </PlacementPhysicsWorld>
      </Canvas>
    </div>
  )
}

function Fixture() {
  const [catalog, setCatalog] = useState<AccessoryCatalogItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [view, setView] = useState<'shop' | 'placement'>('shop')
  const [balance, setBalance] = useState(3000)
  const [purchaseCount, setPurchaseCount] = useState(0)
  const [instances, setInstances] = useState<EquippedAccessoryInstance[]>([])
  const [selectedTarget, setSelectedTarget] = useState<PlacementTarget | null>(null)
  const [tapReady, setTapReady] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const ownedIdsRef = useRef(new Set<string>())
  const balanceRef = useRef(3000)

  useEffect(() => {
    let active = true
    void fetch('/assets/accessories/catalog.json', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error(`catalogue HTTP ${response.status}`)
      const manifest = await response.json() as Manifest
      if (manifest.schemaVersion !== 2) throw new Error(`schema catalogue inattendu: ${manifest.schemaVersion}`)
      const v2 = manifest.accessories.filter((item) => V2_IDS.has(item.id))
      if (v2.length !== V2_IDS.size) throw new Error(`catalogue V2 incomplet: ${v2.length}/${V2_IDS.size}`)
      if (!active) return
      setCatalog(v2.map((item) => toCatalogItem(item, null)))
    }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : String(error))
    })
    return () => {
      active = false
    }
  }, [])

  const loadShop = useCallback(async (): Promise<AccessoryShopSnapshot> => ({
    items: catalog.map((item) => ({
      ...item,
      purchasedAt: ownedIdsRef.current.has(item.id) ? PURCHASED_AT : null,
    })),
  }), [catalog])

  const purchaseMutation = useCallback(async (input: PurchaseAccessoryInput): Promise<PurchaseAccessoryResult> => {
    const item = catalog.find((candidate) => candidate.id === input.accessoryId)
    if (!item) throw new AccessoryPurchaseError('Accessoire indisponible.', 'unavailable', false)
    if (ownedIdsRef.current.has(item.id)) {
      throw new AccessoryPurchaseError('Cet accessoire appartient déjà à votre collection.', 'already-owned', false)
    }
    if (balanceRef.current < item.priceLithons) {
      throw new AccessoryPurchaseError('Le registre confirme un solde insuffisant.', 'insufficient', false)
    }
    ownedIdsRef.current.add(item.id)
    balanceRef.current -= item.priceLithons
    setBalance(balanceRef.current)
    setPurchaseCount((current) => current + 1)
    return {
      accessoryId: item.id,
      purchasedAt: PURCHASED_AT,
      balance: balanceRef.current,
    }
  }, [catalog])

  const addOwned = useCallback(async (item: AccessoryCatalogItem) => {
    if (instances.some((instance) => instance.accessoryId === item.id)) {
      throw new Error('Cet accessoire est déjà placé.')
    }
    const next = toInstance(item, instances.length)
    setInstances((current) => [...current, next])
    setSelectedTarget(accessoryPlacementTarget(next))
  }, [instances])

  const remove = useCallback((instanceId: string) => {
    setInstances((current) => current.filter((instance) => instance.id !== instanceId))
    setSelectedTarget(null)
  }, [])

  const tapItem = catalog[0] ?? null
  const ownedCount = purchaseCount === 0 ? 0 : ownedIdsRef.current.size

  if (loadError) return <main><p role="alert">{loadError}</p></main>
  if (catalog.length !== V2_IDS.size) return <main><p>Chargement du catalogue V2…</p></main>

  return (
    <main style={{ minHeight: '100vh', background: '#e5e1d8', padding: view === 'placement' ? 12 : 0 }}>
      {view === 'shop' ? (
        <AccessoryShop
          balance={balance}
          onBalanceChanged={(next) => {
            balanceRef.current = next
            setBalance(next)
          }}
          onPurchased={() => undefined}
          onClose={() => setView('placement')}
          permit={{
            featureId: 'rock_movement',
            name: 'Permis de manutention minérale',
            description: 'Autorise le déplacement du caillou.',
            priceLithons: 1000,
            unlockedAt: PURCHASED_AT,
          }}
          permitLoading={false}
          permitPending={false}
          permitError={null}
          onPermitPurchase={async () => true}
          loadShop={loadShop}
          purchaseMutation={purchaseMutation}
        />
      ) : (
        <PlacementPanel
          rockName="Caillou test"
          permitUnlocked
          permitLoading={false}
          instances={instances}
          selectedTarget={selectedTarget}
          tool="position"
          busy={false}
          message={null}
          maxInstances={8}
          onSelectRock={() => setSelectedTarget(null)}
          onOpenPermitShop={() => setView('shop')}
          onSelectAccessory={(instanceId) => {
            const instance = instances.find((candidate) => candidate.id === instanceId)
            if (instance) setSelectedTarget(accessoryPlacementTarget(instance))
          }}
          onToolChange={() => undefined}
          onAddOwned={addOwned}
          onRemove={remove}
          onCancel={() => undefined}
          onDone={() => undefined}
          loadShop={loadShop}
        />
      )}

      {view === 'placement' && tapItem ? (
        <TapProbe
          item={tapItem}
          onReady={setTapReady}
          onTap={() => setTapCount((current) => current + 1)}
        />
      ) : null}

      <output
        id="v2-03-commerce-state"
        data-view={view}
        data-purchase-count={purchaseCount}
        data-owned-count={ownedCount}
        data-instance-count={instances.length}
        data-selected-id={selectedTarget?.kind === 'accessory' ? selectedTarget.instanceId : ''}
        data-tap-ready={String(tapReady)}
        data-tap-count={tapCount}
        data-balance={balance}
        style={{ position: 'fixed', left: -10000, top: 0 }}
      >commerce-state</output>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
