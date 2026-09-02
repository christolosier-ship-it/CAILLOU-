
import { Quaternion } from 'three'

import type { PlacementTransform } from './placementTypes'

export interface PlacementScaleLimits {
  min: number
  max: number
}

export const ROCK_PLACEMENT_SCALE_LIMITS: PlacementScaleLimits = { min: 1, max: 1 }

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

export function normalizePlacementTransform(
  transform: PlacementTransform,
  limits: PlacementScaleLimits,
): PlacementTransform {
  const min = Math.min(limits.min, limits.max)
  const max = Math.max(limits.min, limits.max)
  const quaternion = new Quaternion(
    finite(transform.rotation[0], 0),
    finite(transform.rotation[1], 0),
    finite(transform.rotation[2], 0),
    finite(transform.rotation[3], 1),
  )
  if (quaternion.lengthSq() < 0.000001) quaternion.identity()
  quaternion.normalize()
  const rawScale = finite(transform.scale, min)
  return {
    position: [
      finite(transform.position[0], 0),
      finite(transform.position[1], 0),
      finite(transform.position[2], 0),
    ],
    rotation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
    scale: Math.max(min, Math.min(max, rawScale)),
  }
}

export function copyPlacementTransform(transform: PlacementTransform): PlacementTransform {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: transform.scale,
  }
}
