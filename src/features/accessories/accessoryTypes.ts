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

export type AccessoryLocalPosition = [number, number, number]
export type AccessoryLocalRotation = [number, number, number, number]

export interface AccessoryTransform {
  localPosition: AccessoryLocalPosition
  localRotation: AccessoryLocalRotation
  uniformScale: number
  /** Internal renderer marker: only a Rapier-settled pose may set this to true. */
  physicsSettled?: boolean | undefined
}

export interface EquippedAccessoryInstance extends AccessoryTransform {
  id: string
  userRockId: string
  accessoryId: string
  category: string
  name: string
  modelPath: string
  previewPath: string
  scaleMin: number
  scaleMax: number
  triangleCount: number | null
  dimensions?: Json | null
  physics?: Json | null
  equippedAt: string
  updatedAt: string
  stabilizedAt?: string | null
}

export interface CreateAccessoryPlacementInput {
  userRockId: string
  accessory: AccessoryCatalogItem
  eventKey: string
  transform: AccessoryTransform
}

export interface UpdateAccessoryPlacementInput {
  instanceId: string
  transform: AccessoryTransform
}

export interface UpdateAccessoryPlacementResult extends AccessoryTransform {
  instanceId: string
  updatedAt: string
}

export interface StabilizeAccessoryPlacementInput extends UpdateAccessoryPlacementInput {
  eventKey: string
}

export interface StabilizeAccessoryPlacementResult extends UpdateAccessoryPlacementResult {
  stabilizedAt: string
}

export interface RemoveAccessoryPlacementInput {
  instanceId: string
  eventKey: string
}
