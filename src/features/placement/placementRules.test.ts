import { describe, expect, it } from 'vitest'

import { accessoryBoundsFromDimensions, clampWorldPositionAboveGround, rotatedBoundsMinimumY } from './placementRules'

const GROUND = -0.02

describe('placement ground boundary', () => {
  it('keeps a centered accessory above the pedestal ground', () => {
    const bounds = accessoryBoundsFromDimensions([1, 2, 1], 1)
    const next = clampWorldPositionAboveGround([0, -5, 0], [0, 0, 0, 1], bounds, GROUND)
    expect(next[1]).toBeCloseTo(0.982, 5)
  })

  it('accounts for orientation when computing the lower envelope', () => {
    const bounds = accessoryBoundsFromDimensions([2, 0.4, 0.4], 1)
    const halfTurn = Math.sin(Math.PI / 4)
    const minimum = rotatedBoundsMinimumY(bounds, [0, 0, halfTurn, halfTurn])
    expect(minimum).toBeCloseTo(-1, 5)
    const next = clampWorldPositionAboveGround([0, 0, 0], [0, 0, halfTurn, halfTurn], bounds, GROUND)
    expect(next[1]).toBeCloseTo(0.982, 5)
  })

  it('scales the floor envelope with the accessory', () => {
    const bounds = accessoryBoundsFromDimensions([0.5, 1, 0.5], 1.5)
    const next = clampWorldPositionAboveGround([0, -2, 0], [0, 0, 0, 1], bounds, GROUND)
    expect(next[1]).toBeCloseTo(0.732, 5)
  })

  it('keeps the full oriented rock-018 envelope above the hard floor', () => {
    const bounds = {
      min: [-0.9306801557540894, -1.0000003576278687, 0] as [number, number, number],
      max: [0.930679976940155, 0.9999995827674866, 1.3231968879699707] as [number, number, number],
    }
    const rotation = [0.542653436836574, -0.29835676894407437, 0.7551476295458, 0.21508729275823352]
    const next = clampWorldPositionAboveGround([1.21, -0.05, -0.43], rotation, bounds, GROUND)
    const minimum = rotatedBoundsMinimumY(bounds, rotation)
    expect(next[1] + minimum).toBeCloseTo(GROUND + 0.002, 5)
    expect(next[1]).toBeGreaterThan(1.6)
  })
})
