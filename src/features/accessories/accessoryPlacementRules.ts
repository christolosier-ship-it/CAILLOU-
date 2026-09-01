import { Quaternion, Vector3 } from 'three'

import type { Json } from '../../lib/supabase/database.types'
import type {
  AccessoryCatalogItem,
  AccessoryLocalPosition,
  AccessoryLocalRotation,
  AccessoryTransform,
} from './accessoryTypes'

export const MAX_EQUIPPED_ACCESSORIES = 8
export const ACCESSORY_POSITION_LIMIT = 4
export const ACCESSORY_NUDGE_STEP = 0.05
export const ACCESSORY_ROTATION_STEP = Math.PI / 24
export const ACCESSORY_SCALE_STEP = 0.05

export type AccessoryAxis = 'x' | 'y' | 'z'

const AXIS_VECTORS: Record<AccessoryAxis, Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function finiteTuple(value: Json | null, length: number): number[] | null {
  if (!Array.isArray(value) || value.length !== length) return null
  const numbers = value.map((entry) => typeof entry === 'number' ? entry : Number.NaN)
  return numbers.every(Number.isFinite) ? numbers : null
}

export function parseLocalPosition(value: Json | null): AccessoryLocalPosition | null {
  const numbers = finiteTuple(value, 3)
  if (!numbers) return null
  return [numbers[0], numbers[1], numbers[2]]
}

export function parseLocalRotation(value: Json | null): AccessoryLocalRotation | null {
  const numbers = finiteTuple(value, 4)
  if (!numbers) return null
  const quaternion = new Quaternion(numbers[0], numbers[1], numbers[2], numbers[3])
  const length = quaternion.length()
  if (!Number.isFinite(length) || length < 0.98 || length > 1.02) return null
  quaternion.normalize()
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
}

export function clampAccessoryPosition(position: AccessoryLocalPosition): AccessoryLocalPosition {
  return [
    clamp(position[0], -ACCESSORY_POSITION_LIMIT, ACCESSORY_POSITION_LIMIT),
    clamp(position[1], -ACCESSORY_POSITION_LIMIT, ACCESSORY_POSITION_LIMIT),
    clamp(position[2], -ACCESSORY_POSITION_LIMIT, ACCESSORY_POSITION_LIMIT),
  ]
}

export function clampAccessoryScale(value: number, min: number, max: number) {
  return clamp(Number.isFinite(value) ? value : 1, min, max)
}

export function clampAccessoryTransform(
  transform: AccessoryTransform,
  scaleMin: number,
  scaleMax: number,
): AccessoryTransform {
  const rotation = new Quaternion(...transform.localRotation).normalize()
  return {
    localPosition: clampAccessoryPosition(transform.localPosition),
    localRotation: [rotation.x, rotation.y, rotation.z, rotation.w],
    uniformScale: clampAccessoryScale(transform.uniformScale, scaleMin, scaleMax),
  }
}

export function defaultAccessoryTransform(
  accessory: Pick<AccessoryCatalogItem, 'category' | 'scaleMin' | 'scaleMax'>,
  ordinal = 0,
): AccessoryTransform {
  const lanes = [0, -0.18, 0.18, -0.34, 0.34]
  const x = lanes[Math.abs(ordinal) % lanes.length]
  const localPosition: AccessoryLocalPosition = accessory.category === 'socle'
    ? [x, -0.88, 0]
    : accessory.category === 'tenue'
      ? [x, -0.32, 0.65]
      : [x, 0.16, 0.76]

  return {
    localPosition,
    localRotation: [0, 0, 0, 1],
    uniformScale: clampAccessoryScale(1, accessory.scaleMin, accessory.scaleMax),
  }
}

export function nudgeAccessoryTransform(
  transform: AccessoryTransform,
  axis: AccessoryAxis,
  amount: number,
): AccessoryTransform {
  const next = [...transform.localPosition] as AccessoryLocalPosition
  const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  next[index] += amount
  return { ...transform, localPosition: clampAccessoryPosition(next) }
}

export function rotateAccessoryTransform(
  transform: AccessoryTransform,
  axis: AccessoryAxis,
  radians: number,
): AccessoryTransform {
  const current = new Quaternion(...transform.localRotation).normalize()
  const delta = new Quaternion().setFromAxisAngle(AXIS_VECTORS[axis], radians)
  current.multiply(delta).normalize()
  return {
    ...transform,
    localRotation: [current.x, current.y, current.z, current.w],
  }
}

export function scaleAccessoryTransform(
  transform: AccessoryTransform,
  amount: number,
  min: number,
  max: number,
): AccessoryTransform {
  return {
    ...transform,
    uniformScale: clampAccessoryScale(transform.uniformScale + amount, min, max),
  }
}
