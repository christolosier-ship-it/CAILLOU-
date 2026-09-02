import { describe, expect, it } from 'vitest'

import { accessoryLocalToWorld } from '../rockMovement/rockMovementRules'
import type { RockPose } from '../rockMovement/rockMovementTypes'
import {
  worldAccessoryToPersistence,
  worldCompositionToPersistence,
} from './placementPersistence'

describe('placement persistence adapter', () => {
  it('converts a final accessory world pose to rock-local exactly at the persistence boundary', () => {
    const rockPose: RockPose = {
      position: [0.7, 0.4, -0.5],
      rotation: [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)],
    }
    const local = {
      localPosition: [0.35, 0.42, 0.8] as [number, number, number],
      localRotation: [0, 0.2, 0, 0.979795897] as [number, number, number, number],
      uniformScale: 1.2,
    }
    const world = accessoryLocalToWorld('instance', local, rockPose)
    const persisted = worldAccessoryToPersistence('instance', {
      position: world.worldPosition,
      rotation: world.worldRotation,
      scale: world.uniformScale,
    }, rockPose)

    persisted.localPosition.forEach((value, index) => expect(value).toBeCloseTo(local.localPosition[index]!, 5))
    persisted.localRotation.forEach((value, index) => expect(value).toBeCloseTo(local.localRotation[index]!, 4))
    expect(persisted.uniformScale).toBe(local.uniformScale)
  })

  it('does not reintroduce the historical local ±4 geometry clamp', () => {
    const persisted = worldAccessoryToPersistence('far-edge', {
      position: [2.7, 0.5, 2.7],
      rotation: [0, 0, 0, 1],
      scale: 1,
    }, {
      position: [-2.7, 0.5, -2.7],
      rotation: [0, 0, 0, 1],
    })

    expect(persisted.localPosition).toEqual([5.4, 0, 5.4])
  })

  it('converts every accessory relative to the final settled rock pose atomically', () => {
    const result = worldCompositionToPersistence({
      rockTransform: {
        position: [1.2, 0.45, -0.8],
        rotation: [0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)],
        scale: 1,
      },
      accessories: [{
        instanceId: 'a',
        transform: {
          position: [1.2, 0.75, 0.2],
          rotation: [0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)],
          scale: 1.35,
        },
      }],
    })

    expect(result.rockPose.position).toEqual([1.2, 0.45, -0.8])
    expect(result.accessories).toHaveLength(1)
    expect(result.accessories[0]!.instanceId).toBe('a')
    expect(result.accessories[0]!.uniformScale).toBe(1.35)
    expect(result.accessories[0]!.localPosition.every(Number.isFinite)).toBe(true)
  })
})
