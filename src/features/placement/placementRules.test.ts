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
})
