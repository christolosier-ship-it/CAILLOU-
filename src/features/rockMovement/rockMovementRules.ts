import { Quaternion, Vector3 } from 'three'

import type { AccessoryTransform } from '../accessories/accessoryTypes'
import type {
  CompositionAccessoryTransform,
  RockPose,
  RockPosition,
  RockRotation,
  WorldAccessoryTransform,
} from './rockMovementTypes'

export const ROCK_MOVEMENT_FEATURE_ID = 'rock_movement'
export const ROCK_MOVEMENT_PRICE_LITHONS = 1000
export const ROCK_SETTLE_TIMEOUT_MS = 4500

export const DEFAULT_ROCK_POSE: RockPose = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
}

function finiteTuple(value: unknown, size: number): number[] | null {
  if (!Array.isArray(value) || value.length !== size) return null
  const numbers = value.map(Number)
  return numbers.every(Number.isFinite) ? numbers : null
}

export function parseRockPosition(value: unknown): RockPosition {
  const tuple = finiteTuple(value, 3)
  return tuple ? [tuple[0]!, tuple[1]!, tuple[2]!] : [...DEFAULT_ROCK_POSE.position]
}

export function parseRockRotation(value: unknown): RockRotation {
  const tuple = finiteTuple(value, 4)
  if (!tuple) return [...DEFAULT_ROCK_POSE.rotation]
  const quaternion = new Quaternion(tuple[0]!, tuple[1]!, tuple[2]!, tuple[3]!)
  if (quaternion.lengthSq() < 0.000001) return [...DEFAULT_ROCK_POSE.rotation]
  quaternion.normalize()
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
}

export function normalizeRockPose(pose: RockPose): RockPose {
  return {
    position: parseRockPosition(pose.position),
    rotation: parseRockRotation(pose.rotation),
  }
}

function poseQuaternion(pose: RockPose) {
  return new Quaternion(...pose.rotation).normalize()
}

export function accessoryLocalToWorld(
  instanceId: string,
  transform: AccessoryTransform,
  rockPose: RockPose,
): WorldAccessoryTransform {
  const rockRotation = poseQuaternion(rockPose)
  const worldPosition = new Vector3(...transform.localPosition)
    .applyQuaternion(rockRotation)
    .add(new Vector3(...rockPose.position))
  const localRotation = new Quaternion(...transform.localRotation).normalize()
  const worldRotation = rockRotation.clone().multiply(localRotation).normalize()

  return {
    instanceId,
    worldPosition: [worldPosition.x, worldPosition.y, worldPosition.z],
    worldRotation: [worldRotation.x, worldRotation.y, worldRotation.z, worldRotation.w],
    uniformScale: transform.uniformScale,
  }
}

export function accessoryWorldToLocal(
  transform: WorldAccessoryTransform,
  rockPose: RockPose,
): CompositionAccessoryTransform {
  const rockRotation = poseQuaternion(rockPose)
  const inverseRockRotation = rockRotation.clone().invert()
  const localPosition = new Vector3(...transform.worldPosition)
    .sub(new Vector3(...rockPose.position))
    .applyQuaternion(inverseRockRotation)
  const worldRotation = new Quaternion(...transform.worldRotation).normalize()
  const localRotation = inverseRockRotation.multiply(worldRotation).normalize()

  return {
    instanceId: transform.instanceId,
    localPosition: [localPosition.x, localPosition.y, localPosition.z],
    localRotation: [localRotation.x, localRotation.y, localRotation.z, localRotation.w],
    uniformScale: transform.uniformScale,
  }
}
