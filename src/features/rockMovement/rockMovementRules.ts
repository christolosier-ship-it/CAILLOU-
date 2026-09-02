import { Quaternion, Vector3 } from 'three'

import type { AccessoryTransform } from '../accessories/accessoryTypes'
import {
  PEDESTAL_FLOOR_CENTER_Y,
  PEDESTAL_FLOOR_COLOR,
  PEDESTAL_FLOOR_FRICTION,
  PEDESTAL_FLOOR_HALF_EXTENTS,
  PEDESTAL_FLOOR_RESTITUTION,
  PEDESTAL_FLOOR_SIZE,
  PEDESTAL_FLOOR_THICKNESS,
  PEDESTAL_FLOOR_TOP_Y,
} from '../placement/pedestalFloor'
import type {
  CompositionAccessoryTransform,
  RockPose,
  RockPosition,
  RockRotation,
  WorldAccessoryTransform,
} from './rockMovementTypes'

export const ROCK_MOVEMENT_FEATURE_ID = 'rock_movement'
export const ROCK_MOVEMENT_PRICE_LITHONS = 1000
export const PEDESTAL_GROUND_SIZE = PEDESTAL_FLOOR_SIZE
export const PEDESTAL_GROUND_Y = PEDESTAL_FLOOR_TOP_Y
export const PEDESTAL_GROUND_THICKNESS = PEDESTAL_FLOOR_THICKNESS
export const PEDESTAL_GROUND_CENTER_Y = PEDESTAL_FLOOR_CENTER_Y
export const PEDESTAL_GROUND_HALF_EXTENTS = PEDESTAL_FLOOR_HALF_EXTENTS
export const PEDESTAL_GROUND_COLOR = PEDESTAL_FLOOR_COLOR
export const PEDESTAL_GROUND_FRICTION = PEDESTAL_FLOOR_FRICTION
export const PEDESTAL_GROUND_RESTITUTION = PEDESTAL_FLOOR_RESTITUTION
export const ROCK_POSITION_XZ_LIMIT = 2.4
export const ROCK_POSITION_MIN_Y = -0.25
export const ROCK_POSITION_MAX_Y = 3.4
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

export function clampRockPosition(position: RockPosition): RockPosition {
  return [
    Math.max(-ROCK_POSITION_XZ_LIMIT, Math.min(ROCK_POSITION_XZ_LIMIT, position[0])),
    Math.max(ROCK_POSITION_MIN_Y, Math.min(ROCK_POSITION_MAX_Y, position[1])),
    Math.max(-ROCK_POSITION_XZ_LIMIT, Math.min(ROCK_POSITION_XZ_LIMIT, position[2])),
  ]
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

export function angleBetweenTouches(first: { x: number; y: number }, second: { x: number; y: number }) {
  return Math.atan2(second.y - first.y, second.x - first.x)
}

export function distanceBetweenTouches(first: { x: number; y: number }, second: { x: number; y: number }) {
  return Math.hypot(second.x - first.x, second.y - first.y)
}
