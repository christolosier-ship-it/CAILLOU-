import { describe, expect, it } from 'vitest'

import { getRelativeRockIndex, ROCK_CATALOG } from './rockCatalog'

describe('rock catalog navigation', () => {
  it('publishes exactly 20 fully described selectable rocks', () => {
    expect(ROCK_CATALOG).toHaveLength(20)
    expect(ROCK_CATALOG[0]?.id).toBe('rock-001')
    expect(ROCK_CATALOG[19]?.id).toBe('rock-020')
    expect(new Set(ROCK_CATALOG.map((rock) => rock.description)).size).toBe(20)

    for (const rock of ROCK_CATALOG) {
      expect(rock.description.length).toBeGreaterThan(100)
      expect(rock.modelPath).toBe(`/assets/rocks/${rock.id}/model.glb`)
      expect(rock.previewPath).toBe(`/assets/rock-previews/${rock.id}.png`)
    }
  })

  it('moves forward and wraps from 20 to 1', () => {
    expect(getRelativeRockIndex(0, 1)).toBe(1)
    expect(getRelativeRockIndex(19, 1)).toBe(0)
  })

  it('moves backward and wraps from 1 to 20', () => {
    expect(getRelativeRockIndex(0, -1)).toBe(19)
  })

  it('stays deterministic under repeated full tours and rapid direction changes', () => {
    let index = 0
    for (let step = 0; step < 40; step += 1) index = getRelativeRockIndex(index, 1)
    expect(index).toBe(0)

    index = getRelativeRockIndex(index, -1)
    expect(index).toBe(19)
    index = getRelativeRockIndex(index, 1)
    expect(index).toBe(0)
  })
})
