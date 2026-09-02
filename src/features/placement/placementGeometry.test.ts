import { BoxGeometry, Euler, Mesh, Object3D, Quaternion } from 'three'
import { describe, expect, it } from 'vitest'

import {
  PEDESTAL_CONSTRAINT_FRAME,
  PLACEMENT_CONTACT_EPSILON,
  constrainPlacementPosition,
  transformedPlacementEnvelope,
} from './placementConstraints'
import { createPlacementGeometry } from './placementGeometry'
import type { PlacementGeometry } from './placementGeometry'

const cube: PlacementGeometry = {
  supportPoints: [
    [-0.5, -0.5, -0.5],
    [-0.5, -0.5, 0.5],
    [-0.5, 0.5, -0.5],
    [-0.5, 0.5, 0.5],
    [0.5, -0.5, -0.5],
    [0.5, -0.5, 0.5],
    [0.5, 0.5, -0.5],
    [0.5, 0.5, 0.5],
  ],
  colliderBounds: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
}
const identity = [0, 0, 0, 1] as const

function expectInside(position: [number, number, number], rotation: readonly number[], scale: number) {
  const envelope = transformedPlacementEnvelope(cube, rotation, scale)
  expect(position[0] + envelope.minX).toBeGreaterThanOrEqual(PEDESTAL_CONSTRAINT_FRAME.minX - 1e-7)
  expect(position[0] + envelope.maxX).toBeLessThanOrEqual(PEDESTAL_CONSTRAINT_FRAME.maxX + 1e-7)
  expect(position[1] + envelope.minY).toBeGreaterThanOrEqual(PEDESTAL_CONSTRAINT_FRAME.topY - 1e-7)
  expect(position[2] + envelope.minZ).toBeGreaterThanOrEqual(PEDESTAL_CONSTRAINT_FRAME.minZ - 1e-7)
  expect(position[2] + envelope.maxZ).toBeLessThanOrEqual(PEDESTAL_CONSTRAINT_FRAME.maxZ + 1e-7)
}

describe('PlacementGeometry', () => {
  it('extracts real transformed mesh vertices in root-local coordinates', () => {
    const root = new Object3D()
    const mesh = new Mesh(new BoxGeometry(2, 1, 0.5))
    mesh.position.set(0.75, 0.25, -0.5)
    mesh.rotation.set(0, Math.PI / 6, 0)
    root.add(mesh)
    const geometry = createPlacementGeometry(root)
    expect(geometry.supportPoints).toHaveLength(8)
    expect(geometry.colliderBounds.min[0]).toBeLessThan(0)
    expect(geometry.colliderBounds.max[0]).toBeGreaterThan(1)
  })

  it('leaves a centered unrotated object untouched', () => {
    expect(constrainPlacementPosition([0, 1, 0], identity, 1, cube)).toEqual([0, 1, 0])
  })

  it('raises the actual support envelope to the pedestal top', () => {
    const next = constrainPlacementPosition([0, -10, 0], identity, 1, cube)
    expect(next[1]).toBeCloseTo(PEDESTAL_CONSTRAINT_FRAME.topY + 0.5 + PLACEMENT_CONTACT_EPSILON, 8)
    expect(next[0]).toBe(0)
    expect(next[2]).toBe(0)
  })

  it('constrains left and right edges without touching other axes', () => {
    const left = constrainPlacementPosition([-10, 1, 0.3], identity, 1, cube)
    const right = constrainPlacementPosition([10, 1, 0.3], identity, 1, cube)
    expect(left[0]).toBeCloseTo(-2.248, 6)
    expect(right[0]).toBeCloseTo(2.248, 6)
    expect(left.slice(1)).toEqual([1, 0.3])
    expect(right.slice(1)).toEqual([1, 0.3])
  })

  it('constrains front and rear edges without touching other axes', () => {
    const front = constrainPlacementPosition([0.2, 1, -10], identity, 1, cube)
    const rear = constrainPlacementPosition([0.2, 1, 10], identity, 1, cube)
    expect(front[2]).toBeCloseTo(-2.248, 6)
    expect(rear[2]).toBeCloseTo(2.248, 6)
    expect(front[0]).toBe(0.2)
    expect(rear[0]).toBe(0.2)
  })

  it('uses the rotated support envelope instead of an unrotated AABB', () => {
    const quaternion = new Quaternion().setFromEuler(new Euler(0.31, 0.77, -0.24)).normalize()
    const rotation = [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
    const next = constrainPlacementPosition([10, -10, -10], rotation, 1, cube)
    expectInside(next, rotation, 1)
  })

  it('accounts for accessory scale at both minimum and maximum sizes', () => {
    for (const scale of [0.35, 1.8]) {
      const next = constrainPlacementPosition([10, -10, 10], identity, scale, cube)
      expectInside(next, identity, scale)
    }
  })

  it('corrects both axes at a corner with the minimum independent correction', () => {
    const next = constrainPlacementPosition([9, 1.25, 9], identity, 1, cube)
    expect(next).toEqual([2.248, 1.25, 2.248])
  })

  it('centers an impossible oversized footprint deterministically', () => {
    const next = constrainPlacementPosition([2, 5, -2], identity, 8, cube)
    expect(next[0]).toBeCloseTo(0, 8)
    expect(next[2]).toBeCloseTo(0, 8)
    expect(next[1]).toBe(5)
  })
})
