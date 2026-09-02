import type { Json } from '../../lib/supabase/database.types'

export type AccessoryColliderKind = 'hull' | 'cuboid' | 'ball'

export interface AccessoryPhysicsConfig {
  enabled: boolean
  dynamic: boolean
  collider: AccessoryColliderKind
  mass: number
  friction: number
  restitution: number
  linearDamping: number
  angularDamping: number
  gravityScale: number
  ccd: boolean
}

export const ACCESSORY_WORLD_GRAVITY = [0, -3.4, 0] as const
export const ACCESSORY_SETTLE_TIMEOUT_MS = 3_500

function record(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, Json | undefined>
    : {}
}

function finiteNumber(value: Json | undefined, fallback: number, min: number, max: number) {
  const number = typeof value === 'number' ? value : Number.NaN
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}

function colliderKind(value: Json | undefined): AccessoryColliderKind {
  if (value === 'cuboid' || value === 'box') return 'cuboid'
  if (value === 'ball' || value === 'sphere') return 'ball'
  return 'hull'
}

export function parseAccessoryPhysics(
  value: Json | null | undefined,
  category: string,
): AccessoryPhysicsConfig {
  const source = record(value)
  const enabled = source.enabled !== false
  const dynamicDefault = category !== 'socle'
  const dynamic = enabled && (typeof source.dynamic === 'boolean' ? source.dynamic : dynamicDefault)

  return {
    enabled,
    dynamic,
    collider: colliderKind(source.collider),
    mass: finiteNumber(source.mass, category === 'socle' ? 1.8 : 0.2, 0.02, 12),
    friction: finiteNumber(source.friction, 0.7, 0, 2),
    restitution: finiteNumber(source.restitution, 0.04, 0, 1),
    linearDamping: finiteNumber(source.linearDamping, 1.7, 0, 20),
    angularDamping: finiteNumber(source.angularDamping, 2.1, 0, 20),
    gravityScale: dynamic ? finiteNumber(source.gravityScale, 0.9, 0, 2) : 0,
    ccd: dynamic && source.ccd !== false,
  }
}
