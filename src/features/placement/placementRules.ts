import { Quaternion, Vector3 } from 'three'

import type { Json } from '../../lib/supabase/database.types'
import type { PlacementBounds, PlacementVector3 } from './placementTypes'

const DEFAULT_DIMENSIONS: PlacementVector3 = [0.4, 0.4, 0.4]
const GROUND_EPSILON = 0.002

function finitePositive(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function accessoryBoundsFromDimensions(value: Json | null | undefined, scale = 1): PlacementBounds {
  const dimensions = Array.isArray(value)
    && value.length === 3
    && value.every(finitePositive)
    ? [Number(value[0]), Number(value[1]), Number(value[2])] as PlacementVector3
    : DEFAULT_DIMENSIONS
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1
  const half: PlacementVector3 = [
    dimensions[0] * safeScale / 2,
    dimensions[1] * safeScale / 2,
    dimensions[2] * safeScale / 2,
  ]
  return {
    min: [-half[0], -half[1], -half[2]],
    max: [half[0], half[1], half[2]],
  }
}

export function rotatedBoundsMinimumY(bounds: PlacementBounds, rotation: readonly number[]) {
  const quaternion = new Quaternion(
    Number(rotation[0] ?? 0),
    Number(rotation[1] ?? 0),
    Number(rotation[2] ?? 0),
    Number(rotation[3] ?? 1),
  )
  if (quaternion.lengthSq() < 0.000001) quaternion.identity()
  else quaternion.normalize()

  let minimum = Number.POSITIVE_INFINITY
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const point = new Vector3(x, y, z).applyQuaternion(quaternion)
        minimum = Math.min(minimum, point.y)
      }
    }
  }
  return Number.isFinite(minimum) ? minimum : 0
}

export function clampWorldPositionAboveGround(
  position: PlacementVector3,
  rotation: readonly number[],
  bounds: PlacementBounds,
  groundY: number,
): PlacementVector3 {
  const localMinimumY = rotatedBoundsMinimumY(bounds, rotation)
  const minimumOriginY = groundY - localMinimumY + GROUND_EPSILON
  return [position[0], Math.max(position[1], minimumOriginY), position[2]]
}
