import { describe, expect, it } from 'vitest'

import type { EquippedAccessoryInstance } from '../accessories/accessoryTypes'
import {
  ROCK_PLACEMENT_PROFILE,
  accessoryPlacementProfile,
  accessoryPlacementTarget,
  createPlacementObject,
  placementToolAllowed,
  rockPlacementTarget,
} from './placementObject'

function accessory(overrides: Partial<EquippedAccessoryInstance> = {}): EquippedAccessoryInstance {
  return {
    id: 'instance-1',
    userRockId: 'rock-1',
    accessoryId: 'fixture',
    category: 'visage',
    name: 'Fixture',
    modelPath: '/fixture.glb',
    previewPath: '/fixture.webp',
    scaleMin: 0.6,
    scaleMax: 1.4,
    triangleCount: 10,
    localPosition: [0, 0, 0],
    localRotation: [0, 0, 0, 1],
    uniformScale: 1,
    physics: {
      enabled: true,
      dynamic: true,
      collider: 'convexHull',
      mass: 0.2,
      friction: 0.7,
      restitution: 0.05,
      gravityScale: 0.9,
      linearDamping: 1.5,
      angularDamping: 2,
      ccd: true,
    },
    equippedAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
    stabilizedAt: '2026-09-04T00:00:00.000Z',
    ...overrides,
  }
}

describe('placement object profiles', () => {
  it('declares rock capabilities instead of inferring them in the gesture layer', () => {
    expect(ROCK_PLACEMENT_PROFILE.capabilities).toEqual({
      canPosition: true,
      canRotate: true,
      canScale: false,
    })
    expect(ROCK_PLACEMENT_PROFILE.behavior).toBe('free')
    expect(ROCK_PLACEMENT_PROFILE.collision).toEqual({ strategy: 'convexHull' })
    expect(ROCK_PLACEMENT_PROFILE.scaleLimits).toEqual({ min: 1, max: 1 })
  })

  it('derives current accessory capabilities and physics from metadata, not catalogue id', () => {
    const first = accessoryPlacementProfile(accessory({ id: 'alpha', accessoryId: 'alpha' }))
    const second = accessoryPlacementProfile(accessory({ id: 'beta', accessoryId: 'beta' }))

    expect(first).toEqual(second)
    expect(first.capabilities.canScale).toBe(true)
    expect(first.behavior).toBe('free')
    expect(first.collision).toEqual({ strategy: 'convexHull' })
    expect(first.physics.dynamic).toBe(true)
    expect(first.physics.ccd).toBe(true)
  })

  it('supports an accessory whose scale capability is disabled without changing its kind', () => {
    const profile = accessoryPlacementProfile(accessory({ scaleMin: 1, scaleMax: 1 }))

    expect(profile.capabilities.canScale).toBe(false)
    expect(placementToolAllowed(profile.capabilities, 'size')).toBe(false)
    expect(placementToolAllowed(profile.capabilities, 'position')).toBe(true)
    expect(placementToolAllowed(profile.capabilities, 'orientation')).toBe(true)
  })

  it('maps simple current colliders to explicit collision profiles', () => {
    expect(accessoryPlacementProfile(accessory({ physics: { collider: 'cuboid' } })).collision)
      .toEqual({ strategy: 'primitive', shape: 'cuboid' })
    expect(accessoryPlacementProfile(accessory({ physics: { collider: 'ball' } })).collision)
      .toEqual({ strategy: 'primitive', shape: 'ball' })
  })

  it('creates stable placement targets and objects while keeping identity separate from behavior', () => {
    const instance = accessory({ id: 'stable-instance' })
    const target = accessoryPlacementTarget(instance)
    const object = createPlacementObject(target, {
      position: [1, 2, 3],
      rotation: [0, 0, 0, 1],
      scale: 1,
    })

    expect(target.kind).toBe('accessory')
    expect(object.id).toBe('accessory:stable-instance')
    expect(object.identity).toEqual({ kind: 'accessory', instanceId: 'stable-instance' })
    expect(object.profile.behavior).toBe('free')
    expect(rockPlacementTarget().kind).toBe('rock')
  })
})
