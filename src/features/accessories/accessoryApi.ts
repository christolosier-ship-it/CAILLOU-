import { supabase } from '../../lib/supabase/client'
import type {
  AccessoryCatalogItem,
  AccessoryShopSnapshot,
  PurchaseAccessoryInput,
  PurchaseAccessoryMutation,
  PurchaseAccessoryResult,
} from './accessoryTypes'

export type AccessoryPurchaseErrorKind =
  | 'already-owned'
  | 'insufficient'
  | 'unavailable'
  | 'session'
  | 'in-progress'
  | 'unknown'

export class AccessoryPurchaseError extends Error {
  constructor(
    message: string,
    readonly kind: AccessoryPurchaseErrorKind,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'AccessoryPurchaseError'
  }
}

export function toAccessoryPurchaseError(error: { code?: string; message?: string }) {
  const detail = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()

  if (detail.includes('accessory_already_owned') || error.code === '23505') {
    return new AccessoryPurchaseError('Cet accessoire appartient déjà à votre collection.', 'already-owned', false)
  }
  if (detail.includes('insufficient_lithons') || error.code === '22003') {
    return new AccessoryPurchaseError('Le registre confirme un solde insuffisant.', 'insufficient', false)
  }
  if (detail.includes('accessory_unavailable') || error.code === '22023') {
    return new AccessoryPurchaseError('Cet accessoire n’est plus proposé.', 'unavailable', false)
  }
  if (detail.includes('authentication_required') || detail.includes('42501') || error.code === 'PGRST301') {
    return new AccessoryPurchaseError('Votre session doit être vérifiée avant cet achat.', 'session', false)
  }
  if (detail.includes('mutation_in_progress') || error.code === '40001') {
    return new AccessoryPurchaseError(
      'L’achat est encore en cours de confirmation. Réessayez avec la même opération.',
      'in-progress',
      true,
    )
  }
  return new AccessoryPurchaseError(
    'La confirmation serveur n’est pas arrivée. Le même achat peut être renvoyé sans double débit.',
    'unknown',
    true,
  )
}

function mapAccessory(
  row: {
    id: string
    name: string
    description: string | null
    price_lithons: number
    asset_path: string | null
    preview_path: string | null
    slot: string
    sort_order: number
    triangle_count: number | null
    dimensions: AccessoryCatalogItem['dimensions']
    scale_min: number
    scale_max: number
    physics: AccessoryCatalogItem['physics']
    provenance: AccessoryCatalogItem['provenance']
  },
  purchasedAt: string | null,
): AccessoryCatalogItem {
  if (!row.asset_path || !row.preview_path) {
    throw new Error(`Accessory ${row.id} has no validated runtime asset`)
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? 'Accessoire cosmétique homologué.',
    priceLithons: row.price_lithons,
    modelPath: row.asset_path,
    previewPath: row.preview_path,
    category: row.slot,
    sortOrder: row.sort_order,
    triangleCount: row.triangle_count,
    dimensions: row.dimensions,
    scaleMin: row.scale_min,
    scaleMax: row.scale_max,
    physics: row.physics,
    provenance: row.provenance,
    purchasedAt,
  }
}

export async function loadAccessoryShop(): Promise<AccessoryShopSnapshot> {
  const [catalogResult, ownershipResult] = await Promise.all([
    supabase
      .from('accessories')
      .select('id, name, description, price_lithons, asset_path, preview_path, slot, sort_order, triangle_count, dimensions, scale_min, scale_max, physics, provenance')
      .order('sort_order')
      .order('id'),
    supabase.from('user_accessories').select('accessory_id, purchased_at'),
  ])

  if (catalogResult.error) throw new Error('Le catalogue des accessoires n’est pas disponible.')
  if (ownershipResult.error) throw new Error('Votre collection n’a pas pu être vérifiée.')

  const ownership = new Map(
    (ownershipResult.data ?? []).map((item) => [item.accessory_id, item.purchased_at]),
  )
  return {
    items: (catalogResult.data ?? []).map((row) => mapAccessory(row, ownership.get(row.id) ?? null)),
  }
}

export const purchaseAccessory: PurchaseAccessoryMutation = async (
  input: PurchaseAccessoryInput,
): Promise<PurchaseAccessoryResult> => {
  const { data, error } = await supabase.rpc('purchase_accessory', {
    p_accessory_id: input.accessoryId,
    p_event_key: input.eventKey,
  }).single()

  if (error) throw toAccessoryPurchaseError(error)
  if (!data) {
    throw new AccessoryPurchaseError('Le registre n’a retourné aucune confirmation d’achat.', 'unknown', true)
  }
  return {
    accessoryId: data.accessory_id,
    purchasedAt: data.purchased_at,
    balance: data.balance,
  }
}
