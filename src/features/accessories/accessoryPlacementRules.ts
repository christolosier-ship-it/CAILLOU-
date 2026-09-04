import { Quaternion } from 'three'

import type { Json } from '../../lib/supabase/database.types'
import type {
  AccessoryCatalogItem,
  AccessoryLocalPosition,
  AccessoryLocalRotation,
  AccessoryTransform,
  EquippedAccessoryInstance,
} from './accessoryTypes'

export const MAX_EQUIPPED_ACCESSORIES = 8

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
  return [numbers[0]!, numbers[1]!, numbers[2]!]
}

export function parseLocalRotation(value: Json | null): AccessoryLocalRotation | null {
  const numbers = finiteTuple(value, 4)
  if (!numbers) return null
  const quaternion = new Quaternion(numbers[0]!, numbers[1]!, numbers[2]!, numbers[3]!)
  const length = quaternion.length()
  if (!Number.isFinite(length) || length < 0.98 || length > 1.02) return null
  quaternion.normalize()
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
}

export function clampAccessoryScale(value: number, min: number, max: number) {
  return clamp(Number.isFinite(value) ? value : 1, min, max)
}

export function accessoryAlreadyPlaced(
  accessoryId: string,
  instances: readonly Pick<EquippedAccessoryInstance, 'accessoryId'>[],
) {
  return instances.some((instance) => instance.accessoryId === accessoryId)
}

export function availableOwnedAccessories<T extends Pick<AccessoryCatalogItem, 'id'>>(
  items: readonly T[],
  instances: readonly Pick<EquippedAccessoryInstance, 'accessoryId'>[],
): T[] {
  const placedIds = new Set(instances.map((instance) => instance.accessoryId))
  return items.filter((item) => !placedIds.has(item.id))
}

export function defaultAccessoryTransform(
  accessory: Pick<AccessoryCatalogItem, 'category' | 'scaleMin' | 'scaleMax'>,
  ordinal = 0,
): AccessoryTransform {
  const lanes = [0, -0.18, 0.18, -0.34, 0.34]
  const x = lanes[Math.abs(ordinal) % lanes.length] ?? 0
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
