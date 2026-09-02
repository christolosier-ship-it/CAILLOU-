import type { AccessoryTransform } from '../accessories/accessoryTypes'

export type RockPosition = [number, number, number]
export type RockRotation = [number, number, number, number]

export interface RockPose {
  position: RockPosition
  rotation: RockRotation
}

export interface RockMovementPermitSnapshot {
  featureId: string
  name: string
  description: string
  priceLithons: number
  unlockedAt: string | null
  pricePaid: number | null
}

export interface PurchaseRockMovementPermitResult {
  featureId: string
  balance: number
  unlockedAt: string
  pricePaid: number
}

export interface CompositionAccessoryTransform extends AccessoryTransform {
  instanceId: string
}

export interface WorldAccessoryTransform {
  instanceId: string
  worldPosition: RockPosition
  worldRotation: RockRotation
  uniformScale: number
}

export interface StabilizedRockComposition {
  rockPose: RockPose
  stabilizedAt: string
  accessories: CompositionAccessoryTransform[]
}

export interface RockCompositionDraft {
  rockPose: RockPose
  accessories: CompositionAccessoryTransform[]
}
