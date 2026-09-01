import type { RockCatalogEntry, RockId } from '../../content/rockCatalog'

export interface ActiveRock {
  id: string
  specimenId: RockId
  name: string
  adoptedAt: string
  lastCleanedAt: string | null
}

export interface AdoptRockInput {
  rock: RockCatalogEntry
  name: string
  eventKey: string
}

export type AdoptRockMutation = (input: AdoptRockInput) => Promise<ActiveRock>
