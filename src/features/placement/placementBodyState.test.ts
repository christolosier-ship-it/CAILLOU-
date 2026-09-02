import { describe, expect, it } from 'vitest'

import { placementRigidBodyType } from './placementBodyState'

describe('PlacementBody state machine', () => {
  it.each([
    ['fixed', 'fixed'],
    ['editing', 'kinematicPosition'],
    ['settling', 'dynamic'],
  ] as const)('maps %s to the expected Rapier body type', (state, expected) => {
    expect(placementRigidBodyType(state)).toBe(expected)
  })
})
