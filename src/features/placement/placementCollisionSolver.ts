import { Quaternion } from 'three'

import type { PlacementTransform } from './placementTypes'

export type PlacementCollisionMotion = 'translation' | 'rotation' | 'scale'

function clampFraction(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function interpolatePlacementCollisionTransform(
  from: PlacementTransform,
  to: PlacementTransform,
  motion: PlacementCollisionMotion,
  fraction: number,
): PlacementTransform {
  const amount = clampFraction(fraction)

  if (motion === 'translation') {
    return {
      position: [
        from.position[0] + (to.position[0] - from.position[0]) * amount,
        from.position[1] + (to.position[1] - from.position[1]) * amount,
        from.position[2] + (to.position[2] - from.position[2]) * amount,
      ],
      rotation: [...from.rotation],
      scale: from.scale,
    }
  }

  if (motion === 'scale') {
    return {
      position: [...from.position],
      rotation: [...from.rotation],
      scale: from.scale + (to.scale - from.scale) * amount,
    }
  }

  const rotation = new Quaternion(...from.rotation)
    .slerp(new Quaternion(...to.rotation), amount)
    .normalize()

  return {
    position: [...from.position],
    rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
    scale: from.scale,
  }
}

export function maximalValidPlacementFraction(
  isValid: (fraction: number) => boolean,
  coarseSteps: number,
  refinementSteps = 8,
): number {
  const steps = Math.max(1, Math.floor(coarseSteps))
  const refinements = Math.max(0, Math.floor(refinementSteps))
  let lastValid = 0
  let firstInvalid = 1

  for (let index = 1; index <= steps; index += 1) {
    const fraction = index / steps
    if (isValid(fraction)) {
      lastValid = fraction
      continue
    }
    firstInvalid = fraction
    break
  }

  if (lastValid >= 1) return 1

  for (let index = 0; index < refinements; index += 1) {
    const candidate = (lastValid + firstInvalid) / 2
    if (isValid(candidate)) lastValid = candidate
    else firstInvalid = candidate
  }

  return lastValid
}
