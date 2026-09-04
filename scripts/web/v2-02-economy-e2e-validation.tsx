import { useCallback, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { AccessoryShop } from '../../src/features/accessories/AccessoryShop'
import { AccessoryPurchaseError } from '../../src/features/accessories/accessoryApi'
import type {
  AccessoryCatalogItem,
  AccessoryShopSnapshot,
  PurchaseAccessoryMutation,
} from '../../src/features/accessories/accessoryTypes'
import type { RockMovementPermitSnapshot } from '../../src/features/rockMovement/rockMovementTypes'
import '../../src/styles/global.css'
import '../../src/styles/accessories.css'

const ROCK_A = '20750000-0000-4000-8000-000000000001'
const ROCK_B = '20750000-0000-4000-8000-000000000002'
const ACCESSORY_PRICE = 90
const PERMIT_PRICE = 1000
const INITIAL_BALANCE = 1500

const MONOCLE: Omit<AccessoryCatalogItem, 'purchasedAt'> = {
  id: 'monocle',
  name: 'Monocle',
  description: 'Monocle de validation du socle économique V2.',
  priceLithons: ACCESSORY_PRICE,
  modelPath: '/assets/accessories/monocle/model.glb',
  previewPath: '/assets/accessory-previews/monocle.png',
  category: 'visage',
  sortOrder: 10,
  triangleCount: 665,
  dimensions: [0.440386, 0.626706, 0.725703],
  scaleMin: 0.65,
  scaleMax: 1.35,
  physics: null,
  provenance: { license: 'CC BY 4.0' },
}

function Fixture() {
  const [activeRockId, setActiveRockId] = useState(ROCK_A)
  const [balance, setBalance] = useState(INITIAL_BALANCE)
  const [accessoryOwnedAt, setAccessoryOwnedAt] = useState<string | null>(null)
  const [permitByRock, setPermitByRock] = useState<Record<string, string | null>>({
    [ROCK_A]: '2026-09-04T17:00:00.000Z',
    [ROCK_B]: null,
  })
  const [accessoryPurchaseCount, setAccessoryPurchaseCount] = useState(0)
  const [permitPurchaseCount, setPermitPurchaseCount] = useState(0)
  const [mountRevision, setMountRevision] = useState(0)

  const loadShop = useCallback(async (): Promise<AccessoryShopSnapshot> => ({
    items: [{ ...MONOCLE, purchasedAt: accessoryOwnedAt }],
  }), [accessoryOwnedAt])

  const purchaseMutation = useCallback<PurchaseAccessoryMutation>(async ({ accessoryId }) => {
    if (accessoryId !== MONOCLE.id) throw new Error('unexpected accessory')
    if (accessoryOwnedAt) {
      throw new AccessoryPurchaseError('Cet accessoire appartient déjà à votre collection.', 'already-owned', false)
    }
    const purchasedAt = '2026-09-04T18:00:00.000Z'
    setAccessoryOwnedAt(purchasedAt)
    setAccessoryPurchaseCount((current) => current + 1)
    return {
      accessoryId,
      purchasedAt,
      balance: balance - ACCESSORY_PRICE,
    }
  }, [accessoryOwnedAt, balance])

  const permit = useMemo<RockMovementPermitSnapshot>(() => ({
    userRockId: activeRockId,
    featureId: 'rock_movement',
    name: 'Permis de manutention minérale',
    description: 'Autorise la transformation persistante du caillou actif.',
    priceLithons: PERMIT_PRICE,
    unlockedAt: permitByRock[activeRockId] ?? null,
    pricePaid: permitByRock[activeRockId] ? PERMIT_PRICE : null,
    acquisitionSource: permitByRock[activeRockId] ? 'purchase' : null,
  }), [activeRockId, permitByRock])

  const purchasePermit = useCallback(async () => {
    if (permitByRock[activeRockId]) return false
    setPermitByRock((current) => ({
      ...current,
      [activeRockId]: '2026-09-04T18:05:00.000Z',
    }))
    setPermitPurchaseCount((current) => current + 1)
    setBalance((current) => current - PERMIT_PRICE)
    return true
  }, [activeRockId, permitByRock])

  return (
    <main>
      <AccessoryShop
        key={`${activeRockId}:${mountRevision}`}
        balance={balance}
        permit={permit}
        permitLoading={false}
        permitPending={false}
        permitError={null}
        onPermitPurchase={purchasePermit}
        onBalanceChanged={setBalance}
        onPurchased={({ purchasedAt }) => setAccessoryOwnedAt(purchasedAt)}
        onClose={() => undefined}
        loadShop={loadShop}
        purchaseMutation={purchaseMutation}
      />

      <button id="switch-rock" type="button" onClick={() => setActiveRockId(ROCK_B)}>Changer de caillou</button>
      <button id="simulate-reconnect" type="button" onClick={() => setMountRevision((current) => current + 1)}>Simuler reconnexion</button>

      <output
        id="v2-02-economy-state"
        hidden
        data-active-rock-id={activeRockId}
        data-accessory-owned={String(accessoryOwnedAt !== null)}
        data-accessory-purchase-count={String(accessoryPurchaseCount)}
        data-permit-owned={String(permit.unlockedAt !== null)}
        data-permit-purchase-count={String(permitPurchaseCount)}
        data-balance={String(balance)}
        data-mount-revision={String(mountRevision)}
      />
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing V2-02 economy fixture root')
createRoot(root).render(<Fixture />)
