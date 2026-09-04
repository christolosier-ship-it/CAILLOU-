import { describe, expect, it } from 'vitest'

import {
  accessoryAlreadyPlaced,
  availableOwnedAccessories,
  clampAccessoryScale,
  defaultAccessoryTransform,
  parseLocalPosition,
  parseLocalRotation,
} from './accessoryPlacementRules'

describe('accessory placement persistence rules', () => {
  it('starts visage, tenue and socle accessories in distinct local zones', () => {
    const face = defaultAccessoryTransform({ category: 'visage', scaleMin: 0.6, scaleMax: 1.5 })
    const outfit = defaultAccessoryTransform({ category: 'tenue', scaleMin: 0.6, scaleMax: 1.5 })
    const pedestal = defaultAccessoryTransform({ category: 'socle', scaleMin: 0.7, scaleMax: 1.5 })

    expect(face.localPosition[1]).toBeGreaterThan(0)
    expect(face.localPosition[2]).toBeGreaterThan(0)
    expect(outfit.localPosition[1]).toBeLessThan(0)
    expect(pedestal.localPosition[1]).toBeLessThan(outfit.localPosition[1])
  })

  it('keeps only the catalogue scale guard at the persistence edge', () => {
    expect(clampAccessoryScale(4, 0.65, 1.35)).toBe(1.35)
    expect(clampAccessoryScale(-2, 0.65, 1.35)).toBe(0.65)
  })

  it('parses canonical JSON tuples and rejects malformed persisted transforms', () => {
    expect(parseLocalPosition([0.1, -0.2, 0.3])).toEqual([0.1, -0.2, 0.3])
    expect(parseLocalPosition([0.1, 'x', 0.3])).toBeNull()
    expect(parseLocalRotation([0, 0, 0, 1])).toEqual([0, 0, 0, 1])
    expect(parseLocalRotation([0, 0, 0, 0])).toBeNull()
  })

  it('treats a catalogue reference as one unique placeable object', () => {
    const instances = [{ accessoryId: 'monocle' }]
    const owned = [{ id: 'monocle' }, { id: 'glasses' }]

    expect(accessoryAlreadyPlaced('monocle', instances)).toBe(true)
    expect(accessoryAlreadyPlaced('glasses', instances)).toBe(false)
    expect(availableOwnedAccessories(owned, instances).map((item) => item.id)).toEqual(['glasses'])
  })
})
