import { describe, expect, it } from 'vitest'

import { resolvePlacementGesture } from './placementGesturePolicy'
import type { PlacementObjectProfile, PlacementTarget } from './placementTypes'

function profile(canScale: boolean): PlacementObjectProfile {
  return {
    capabilities: { canPosition: true, canRotate: true, canScale },
    behavior: 'free',
    collision: { strategy: 'convexHull' },
    physics: {
      enabled: true,
      dynamic: true,
      mass: 1,
      friction: 0.7,
      restitution: 0,
      linearDamping: 1,
      angularDamping: 1,
      gravityScale: 1,
      ccd: false,
    },
    scaleLimits: canScale ? { min: 0.5, max: 1.5 } : { min: 1, max: 1 },
  }
}

const rock: PlacementTarget = { kind: 'rock', profile: profile(false) }
const accessory: PlacementTarget = { kind: 'accessory', instanceId: 'fixture', profile: profile(true) }
const fixedSizeAccessory: PlacementTarget = {
  kind: 'accessory',
  instanceId: 'fixed-size-fixture',
  profile: profile(false),
}

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

  it('uses the declared scale capability instead of object kind', () => {
    expect(resolvePlacementGesture(rock, 'size', 2)).toBeNull()
    expect(resolvePlacementGesture(accessory, 'size', 2)).toBe('uniform-scale')
    expect(resolvePlacementGesture(fixedSizeAccessory, 'size', 2)).toBeNull()
  })

  it('keeps size pinch-only when scaling is allowed', () => {
    expect(resolvePlacementGesture(accessory, 'size', 1)).toBeNull()
    expect(resolvePlacementGesture(accessory, 'size', 2)).toBe('uniform-scale')
  })
})
