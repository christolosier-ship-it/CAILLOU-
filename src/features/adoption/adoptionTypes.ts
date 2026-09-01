import type { RockCatalogEntry, RockId } from '../../content/rockCatalog'
import type { RockPosition, RockRotation } from '../rockMovement/rockMovementTypes'

export interface ActiveRock {
  id: string
  specimenId: RockId
  name: string
  adoptedAt: string
  lastCleanedAt: string | null
  posePosition: RockPosition
  poseRotation: RockRotation
  poseStabilizedAt: string | null
}

export interface AdoptRockInput {
  rock: RockCatalogEntry
  name: string
  eventKey: string
}

export type AdoptRockMutation = (input: AdoptRockInput) => Promise<ActiveRock>