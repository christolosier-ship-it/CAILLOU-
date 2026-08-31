import { describe, expect, it } from 'vitest'

import { getRelativeRockIndex, ROCK_CATALOG } from './rockCatalog'

describe('rock catalog navigation', () => {
  it('publishes exactly 20 selectable rocks', () => {
    expect(ROCK_CATALOG).toHaveLength(20)
    expect(ROCK_CATALOG[0]?.id).toBe('rock-001')
    expect(ROCK_CATALOG[19]?.id).toBe('rock-020')
  })

  it('moves forward and wraps from 20 to 1', () => {
    expect(getRelativeRockIndex(0, 1)).toBe(1)
    expect(getRelativeRockIndex(19, 1)).toBe(0)
  })

  it('moves backward and wraps from 1 to 20', () => {
    expect(getRelativeRockIndex(0, -1)).toBe(19)
  })
})
