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
  collision: Json
  budget: Json
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
  collision?: Json
  budget?: Json
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

export interface StabilizeAccessoryPlacementInput {
  instanceId: string
  transform: AccessoryTransform
  eventKey: string
}

export interface StabilizeAccessoryPlacementResult extends AccessoryTransform {
  instanceId: string
  updatedAt: string
  stabilizedAt: string
}

export interface RemoveAccessoryPlacementInput {
  instanceId: string
  eventKey: string
}
