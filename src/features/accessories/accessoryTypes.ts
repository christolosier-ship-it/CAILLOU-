import type { Json } from '../../lib/supabase/database.types'

export interface AccessoryCatalogItem {
  id: string
  name: string
  description: string
  priceLithons: number
  modelPath: string
  previewPath: string
  category: string
  sortOrder: number
  triangleCount: number | null
  dimensions: Json | null
  scaleMin: number
  scaleMax: number
  physics: Json | null
  provenance: Json | null
  purchasedAt: string | null
}

export interface AccessoryShopSnapshot {
  items: AccessoryCatalogItem[]
}

export interface PurchaseAccessoryInput {
  accessoryId: string
  eventKey: string
}

export interface PurchaseAccessoryResult {
  accessoryId: string
  purchasedAt: string
  balance: number
}

export type PurchaseAccessoryMutation = (
  input: PurchaseAccessoryInput,
) => Promise<PurchaseAccessoryResult>
