import { describe, expect, it } from 'vitest'

import type { RockMovementPermitSnapshot } from './rockMovementTypes'
import { permitSnapshotForRock, permitUnlockedForRock } from './rockMovementPermitRules'

const unlockedPermit: RockMovementPermitSnapshot = {
  userRockId: 'rock-a',
  featureId: 'rock_movement',
  name: 'Permis de manutention minérale',
  description: 'Autorise la manutention réglementaire du caillou.',
  priceLithons: 1000,
  unlockedAt: '2026-09-04T18:00:00.000Z',
  pricePaid: 1000,
  acquisitionSource: 'purchase',
}

describe('rock-scoped permit frontend rules', () => {
  it('accepts an entitlement only for the rock it belongs to', () => {
    expect(permitSnapshotForRock(unlockedPermit, 'rock-a')).toBe(unlockedPermit)
    expect(permitUnlockedForRock(unlockedPermit, 'rock-a')).toBe(true)
  })

  it('invalidates the previous rock entitlement immediately when the active rock changes', () => {
    expect(permitSnapshotForRock(unlockedPermit, 'rock-b')).toBeNull()
    expect(permitUnlockedForRock(unlockedPermit, 'rock-b')).toBe(false)
  })

  it('never treats an unscoped legacy account cache as a V2 entitlement', () => {
    const legacySnapshot: RockMovementPermitSnapshot = {
      featureId: unlockedPermit.featureId,
      name: unlockedPermit.name,
      description: unlockedPermit.description,
      priceLithons: unlockedPermit.priceLithons,
      unlockedAt: unlockedPermit.unlockedAt,
      pricePaid: unlockedPermit.pricePaid,
    }
    expect(permitSnapshotForRock(legacySnapshot, 'rock-a')).toBeNull()
    expect(permitUnlockedForRock(legacySnapshot, 'rock-a')).toBe(false)
  })
})
