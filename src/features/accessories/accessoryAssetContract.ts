import type { Json } from '../../lib/supabase/database.types'

export const ACCESSORY_COLLISION_STRATEGIES = [
  'hull',
  'cuboid',
  'ball',
  'compound',
  'proxy',
  'simplified',
] as const

export type AccessoryCollisionStrategy = typeof ACCESSORY_COLLISION_STRATEGIES[number]
export type AccessoryCollisionGeometrySource = 'render' | 'proxy'

export interface AccessoryCollisionDescriptor {
  strategy: AccessoryCollisionStrategy
  geometrySource: AccessoryCollisionGeometrySource
  proxyPath: string | null
}

export interface AccessoryBudgetMetadata {
  runtimeModelBytes: number
  maxTextureDimension: number | null
  largestTextureBytes: number | null
}

const COLLIDER_PATH = /^\/assets\/accessories\/[a-z0-9-]+\/collider\.glb$/

function isRecord(value: Json | null | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: Json | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export function parseAccessoryCollision(value: Json | null | undefined): AccessoryCollisionDescriptor | null {
  if (!isRecord(value)) return null

  const strategy = value.strategy
  if (typeof strategy !== 'string' || !ACCESSORY_COLLISION_STRATEGIES.includes(strategy as AccessoryCollisionStrategy)) {
    return null
  }

  const geometrySourceValue = value.geometrySource
  const geometrySource: AccessoryCollisionGeometrySource = geometrySourceValue === undefined
    ? strategy === 'proxy' ? 'proxy' : 'render'
    : geometrySourceValue === 'render' || geometrySourceValue === 'proxy'
      ? geometrySourceValue
      : 'render'

  if (geometrySourceValue !== undefined && geometrySourceValue !== 'render' && geometrySourceValue !== 'proxy') {
    return null
  }

  const proxyPathValue = value.proxyPath
  const proxyPath = proxyPathValue === undefined ? null : proxyPathValue
  if (proxyPath !== null && (typeof proxyPath !== 'string' || !COLLIDER_PATH.test(proxyPath))) {
    return null
  }

  if (geometrySource === 'proxy' && proxyPath === null) {
    return null
  }
  if (geometrySource === 'render' && proxyPath !== null) {
    return null
  }
  if (strategy === 'proxy' && geometrySource !== 'proxy') {
    return null
  }

  return {
    strategy: strategy as AccessoryCollisionStrategy,
    geometrySource,
    proxyPath,
  }
}

export function parseAccessoryBudget(value: Json | null | undefined): AccessoryBudgetMetadata | null {
  if (!isRecord(value) || !isPositiveInteger(value.runtimeModelBytes)) return null

  const maxTextureDimension = value.maxTextureDimension
  const largestTextureBytes = value.largestTextureBytes

  if (maxTextureDimension !== undefined && !isPositiveInteger(maxTextureDimension)) return null
  if (largestTextureBytes !== undefined && !isPositiveInteger(largestTextureBytes)) return null

  return {
    runtimeModelBytes: value.runtimeModelBytes,
    maxTextureDimension: maxTextureDimension ?? null,
    largestTextureBytes: largestTextureBytes ?? null,
  }
}
