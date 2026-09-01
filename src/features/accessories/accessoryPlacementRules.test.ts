import { describe, expect, it } from 'vitest'

import type { AccessoryTransform } from './accessoryTypes'
import {
  ACCESSORY_NUDGE_STEP,
  ACCESSORY_POSITION_LIMIT,
  ACCESSORY_ROTATION_STEP,
  ACCESSORY_SCALE_STEP,
  clampAccessoryScale,
  defaultAccessoryTransform,
  nudgeAccessoryTransform,
  parseLocalPosition,
  parseLocalRotation,
  rotateAccessoryTransform,
  scaleAccessoryTransform,
} from './accessoryPlacementRules'

describe('accessoryPlacementRules', () => {
  const base: AccessoryTransform = {
    localPosition: [0, 0, 0],
    localRotation: [0, 0, 0, 1],
    uniformScale: 1,
  }

  it('starts visage, tenue and socle accessories in distinct local zones', () => {
    const face = defaultAccessoryTransform({ category: 'visage', scaleMin: 0.6, scaleMax: 1.5 })
    const outfit = defaultAccessoryTransform({ category: 'tenue', scaleMin: 0.6, scaleMax: 1.5 })
    const pedestal = defaultAccessoryTransform({ category: 'socle', scaleMin: 0.7, scaleMax: 1.5 })

    expect(face.localPosition[1]).toBeGreaterThan(0)
    expect(face.localPosition[2]).toBeGreaterThan(0)
    expect(outfit.localPosition[1]).toBeLessThan(0)
    expect(pedestal.localPosition[1]).toBeLessThan(outfit.localPosition[1])
  })

  it('clamps translation and scale to the V1 contract', () => {
    const moved = nudgeAccessoryTransform(
      { ...base, localPosition: [ACCESSORY_POSITION_LIMIT, 0, 0] },
      'x',
      ACCESSORY_NUDGE_STEP,
    )
    expect(moved.localPosition[0]).toBe(ACCESSORY_POSITION_LIMIT)
    expect(clampAccessoryScale(4, 0.65, 1.35)).toBe(1.35)
    expect(scaleAccessoryTransform(base, ACCESSORY_SCALE_STEP, 0.65, 1.35).uniformScale).toBeCloseTo(1.05)
  })

  it('keeps fine rotations normalized', () => {
    const rotated = rotateAccessoryTransform(base, 'z', ACCESSORY_ROTATION_STEP)
    const [x, y, z, w] = rotated.localRotation
    expect(Math.hypot(x, y, z, w)).toBeCloseTo(1, 6)
    expect(z).not.toBe(0)
  })

  it('parses canonical JSON tuples and rejects malformed persisted transforms', () => {
    expect(parseLocalPosition([0.1, -0.2, 0.3])).toEqual([0.1, -0.2, 0.3])
    expect(parseLocalPosition([0.1, 'x', 0.3])).toBeNull()
    expect(parseLocalRotation([0, 0, 0, 1])).toEqual([0, 0, 0, 1])
    expect(parseLocalRotation([0, 0, 0, 0])).toBeNull()
  })
})
