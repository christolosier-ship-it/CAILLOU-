
import { describe, expect, it } from 'vitest'

import { constrainTransformToPedestal } from './placementConstraints'
import type { PlacementGeometry } from './placementGeometry'
import {
  ROCK_PLACEMENT_SCALE_LIMITS,
  copyPlacementTransform,
  normalizePlacementTransform,
} from './placementTransform'

const geometry: PlacementGeometry = {
  supportPoints: [
    [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5],
    [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5],
    [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5],
    [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5],
  ],
  colliderBounds: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
}

describe('PlacementTransform', () => {
  it('keeps rock scale at one and normalizes its quaternion', () => {
    const result = normalizePlacementTransform(
      { position: [1, 2, 3], rotation: [0, 0, 0, 4], scale: 12 },
      ROCK_PLACEMENT_SCALE_LIMITS,
    )
    expect(result).toEqual({ position: [1, 2, 3], rotation: [0, 0, 0, 1], scale: 1 })
  })

  it('clamps accessory scale while preserving its world pose', () => {
    const result = normalizePlacementTransform(
      { position: [1, 2, 3], rotation: [0, 0, 0, 1], scale: 7 },
      { min: 0.5, max: 2 },
    )
    expect(result.position).toEqual([1, 2, 3])
    expect(result.rotation).toEqual([0, 0, 0, 1])
    expect(result.scale).toBe(2)
  })

  it('constrains the complete transform without changing rotation or scale', () => {
    const transform = { position: [9, -2, 9] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number], scale: 1.5 }
    const result = constrainTransformToPedestal(transform, geometry)
    expect(result.position[0]).toBeLessThan(9)
    expect(result.position[1]).toBeGreaterThan(-2)
    expect(result.position[2]).toBeLessThan(9)
    expect(result.rotation).toEqual(transform.rotation)
    expect(result.scale).toBe(1.5)
  })

  it('copies tuple storage instead of aliasing draft arrays', () => {
    const source = { position: [1, 2, 3] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number], scale: 1 }
    const copy = copyPlacementTransform(source)
    copy.position[0] = 99
    expect(source.position[0]).toBe(1)
  })
})
