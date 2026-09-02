import { Quaternion, Vector3 } from 'three'

import { PEDESTAL_FLOOR_SIZE, PEDESTAL_FLOOR_TOP_Y } from './pedestalFloor'
import type { PlacementGeometry } from './placementGeometry'
import type { PlacementVector3 } from './placementTypes'

export const PLACEMENT_CONTACT_EPSILON = 0.002

export interface PedestalConstraintFrame {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  topY: number
}

export const PEDESTAL_CONSTRAINT_FRAME: PedestalConstraintFrame = {
  minX: -PEDESTAL_FLOOR_SIZE / 2,
  maxX: PEDESTAL_FLOOR_SIZE / 2,
  minZ: -PEDESTAL_FLOOR_SIZE / 2,
  maxZ: PEDESTAL_FLOOR_SIZE / 2,
  topY: PEDESTAL_FLOOR_TOP_Y,
}

interface RelativeEnvelope {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

function normalizedQuaternion(rotation: readonly number[]) {
  const quaternion = new Quaternion(
    Number(rotation[0] ?? 0),
    Number(rotation[1] ?? 0),
    Number(rotation[2] ?? 0),
    Number(rotation[3] ?? 1),
  )
  if (quaternion.lengthSq() < 0.000001) return quaternion.identity()
  return quaternion.normalize()
}

export function transformedPlacementEnvelope(
  geometry: PlacementGeometry,
  rotation: readonly number[],
  scale = 1,
): RelativeEnvelope {
  const quaternion = normalizedQuaternion(rotation)
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1
  const point = new Vector3()
  const envelope: RelativeEnvelope = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  }

  for (const supportPoint of geometry.supportPoints) {
    point.set(...supportPoint).multiplyScalar(safeScale).applyQuaternion(quaternion)
    envelope.minX = Math.min(envelope.minX, point.x)
    envelope.maxX = Math.max(envelope.maxX, point.x)
    envelope.minY = Math.min(envelope.minY, point.y)
    envelope.maxY = Math.max(envelope.maxY, point.y)
    envelope.minZ = Math.min(envelope.minZ, point.z)
    envelope.maxZ = Math.max(envelope.maxZ, point.z)
  }

  if (!Number.isFinite(envelope.minX)) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }
  }
  return envelope
}

function constrainAxis(origin: number, localMin: number, localMax: number, min: number, max: number) {
  const minimumOrigin = min + PLACEMENT_CONTACT_EPSILON - localMin
  const maximumOrigin = max - PLACEMENT_CONTACT_EPSILON - localMax
  if (minimumOrigin <= maximumOrigin) return Math.max(minimumOrigin, Math.min(maximumOrigin, origin))
  return (min + max - localMin - localMax) / 2
}

export function constrainPlacementPosition(
  position: PlacementVector3,
  rotation: readonly number[],
  scale: number,
  geometry: PlacementGeometry,
  pedestal: PedestalConstraintFrame = PEDESTAL_CONSTRAINT_FRAME,
): PlacementVector3 {
  const envelope = transformedPlacementEnvelope(geometry, rotation, scale)
  const minimumY = pedestal.topY + PLACEMENT_CONTACT_EPSILON - envelope.minY
  return [
    constrainAxis(position[0], envelope.minX, envelope.maxX, pedestal.minX, pedestal.maxX),
    Math.max(position[1], minimumY),
    constrainAxis(position[2], envelope.minZ, envelope.maxZ, pedestal.minZ, pedestal.maxZ),
  ]
}
