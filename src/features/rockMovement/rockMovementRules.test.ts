import { describe, expect, it } from 'vitest'

import {
  ROCK_MOVEMENT_PRICE_LITHONS,
  accessoryLocalToWorld,
  accessoryWorldToLocal,
  clampRockPosition,
  parseRockRotation,
} from './rockMovementRules'

const EPSILON = 0.00001

function expectTupleClose(actual: number[], expected: number[]) {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 5))
}

describe('rock movement rules', () => {
  it('keeps the premium permit price locked at 1000 Lithons', () => {
    expect(ROCK_MOVEMENT_PRICE_LITHONS).toBe(1000)
  })

  it('clamps the manipulation envelope without flattening the Y axis', () => {
    expect(clampRockPosition([9, 9, -9])).toEqual([2.4, 3.4, -2.4])
    expect(clampRockPosition([-9, -9, 9])).toEqual([-2.4, -0.25, 2.4])
  })

  it('normalizes a quaternion', () => {
    const rotation = parseRockRotation([0, 0, 2, 2])
    expect(Math.abs(Math.hypot(...rotation) - 1)).toBeLessThan(EPSILON)
  })

  it('round-trips accessory transforms through a translated and rotated rock frame', () => {
    const rockPose = {
      position: [0.7, 0.35, -0.4] as [number, number, number],
      rotation: [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)] as [number, number, number, number],
    }
    const local = {
      localPosition: [0.2, 0.5, 0.75] as [number, number, number],
      localRotation: [0.1, 0.2, 0.05, 0.973396] as [number, number, number, number],
      uniformScale: 1.15,
    }

    const world = accessoryLocalToWorld('instance', local, rockPose)
    const roundTrip = accessoryWorldToLocal(world, rockPose)

    expect(roundTrip.instanceId).toBe('instance')
    expectTupleClose(roundTrip.localPosition, local.localPosition)
    const expectedRotation = parseRockRotation(local.localRotation)
    expectTupleClose(roundTrip.localRotation, expectedRotation)
    expect(roundTrip.uniformScale).toBe(local.uniformScale)
  })
})
