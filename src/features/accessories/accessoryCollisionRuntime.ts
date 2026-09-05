import type { Json } from '../../lib/supabase/database.types'
import { parseAccessoryCollision } from './accessoryAssetContract'
import type { AccessoryColliderKind } from './accessoryPhysics'

export interface AccessoryAutoCollisionPlan {
  mode: 'auto'
  collider: AccessoryColliderKind
  strategy: 'hull' | 'cuboid' | 'ball'
}

export interface AccessoryManualCollisionPlan {
  mode: 'manual'
  collider: false
  strategy: 'hull' | 'compound' | 'proxy' | 'simplified'
  geometrySource: 'render' | 'proxy'
  proxyPath: string | null
}

export type AccessoryCollisionRuntimePlan = AccessoryAutoCollisionPlan | AccessoryManualCollisionPlan

export function resolveAccessoryCollisionRuntime(
  value: Json | undefined,
  fallbackCollider: AccessoryColliderKind,
): AccessoryCollisionRuntimePlan {
  const descriptor = parseAccessoryCollision(value)
  if (!descriptor) {
    return {
      mode: 'auto',
      collider: fallbackCollider,
      strategy: fallbackCollider,
    }
  }

  if (
    descriptor.geometrySource === 'render'
    && (descriptor.strategy === 'hull' || descriptor.strategy === 'cuboid' || descriptor.strategy === 'ball')
  ) {
    return {
      mode: 'auto',
      collider: descriptor.strategy,
      strategy: descriptor.strategy,
    }
  }

  return {
    mode: 'manual',
    collider: false,
    strategy: descriptor.strategy === 'cuboid' || descriptor.strategy === 'ball'
      ? 'hull'
      : descriptor.strategy,
    geometrySource: descriptor.geometrySource,
    proxyPath: descriptor.proxyPath,
  }
}
