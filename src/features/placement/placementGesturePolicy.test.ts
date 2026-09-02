
import { describe, expect, it } from 'vitest'

import { resolvePlacementGesture } from './placementGesturePolicy'
import type { PlacementTarget } from './placementTypes'

const rock: PlacementTarget = { kind: 'rock' }
const accessory: PlacementTarget = { kind: 'accessory', instanceId: 'fixture' }

describe('universal placement gesture grammar', () => {
  it.each([
    ['position', 1, 'surface-position'],
    ['position', 2, 'depth-position'],
    ['orientation', 1, 'free-orientation'],
    ['orientation', 2, 'twist-orientation'],
  ] as const)('uses the same %s gesture with %i pointer(s)', (tool, pointers, expected) => {
    expect(resolvePlacementGesture(rock, tool, pointers)).toBe(expected)
    expect(resolvePlacementGesture(accessory, tool, pointers)).toBe(expected)
  })

  it('keeps size accessory-only and pinch-only', () => {
    expect(resolvePlacementGesture(rock, 'size', 1)).toBeNull()
    expect(resolvePlacementGesture(rock, 'size', 2)).toBeNull()
    expect(resolvePlacementGesture(accessory, 'size', 1)).toBeNull()
    expect(resolvePlacementGesture(accessory, 'size', 2)).toBe('uniform-scale')
  })
})
