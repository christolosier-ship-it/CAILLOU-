import { parseAccessoryPhysics } from '../accessories/accessoryPhysics'
import type { EquippedAccessoryInstance } from '../accessories/accessoryTypes'
import type {
  PlacementCapabilities,
  PlacementCollisionProfile,
  PlacementObject,
  PlacementObjectIdentity,
  PlacementObjectProfile,
  PlacementPhysicsProfile,
  PlacementTarget,
  PlacementTool,
  PlacementTransform,
} from './placementTypes'

const ROCK_CAPABILITIES: PlacementCapabilities = {
  canPosition: true,
  canRotate: true,
  canScale: false,
}

export const ROCK_PLACEMENT_PROFILE: PlacementObjectProfile = {
  capabilities: ROCK_CAPABILITIES,
  behavior: 'free',
  collision: { strategy: 'convexHull' },
  physics: {
    enabled: true,
    dynamic: true,
    mass: 6,
    friction: 0.9,
    restitution: 0.015,
    linearDamping: 1.8,
    angularDamping: 2.2,
    gravityScale: 1,
    ccd: false,
  },
  scaleLimits: { min: 1, max: 1 },
}

function accessoryCollisionProfile(collider: 'hull' | 'cuboid' | 'ball'): PlacementCollisionProfile {
  if (collider === 'cuboid') return { strategy: 'primitive', shape: 'cuboid' }
  if (collider === 'ball') return { strategy: 'primitive', shape: 'ball' }
  return { strategy: 'convexHull' }
}

function accessoryPhysicsProfile(instance: EquippedAccessoryInstance): PlacementPhysicsProfile {
  const parsed = parseAccessoryPhysics(instance.physics, instance.category)
  return {
    enabled: parsed.enabled,
    dynamic: parsed.dynamic,
    mass: parsed.mass,
    friction: parsed.friction,
    restitution: parsed.restitution,
    linearDamping: parsed.linearDamping,
    angularDamping: parsed.angularDamping,
    gravityScale: parsed.gravityScale,
    ccd: parsed.ccd,
  }
}

export function accessoryPlacementProfile(instance: EquippedAccessoryInstance): PlacementObjectProfile {
  const physics = parseAccessoryPhysics(instance.physics, instance.category)
  const min = Number.isFinite(instance.scaleMin) ? instance.scaleMin : 1
  const max = Number.isFinite(instance.scaleMax) ? instance.scaleMax : min
  const lower = Math.min(min, max)
  const upper = Math.max(min, max)

  return {
    capabilities: {
      canPosition: true,
      canRotate: true,
      canScale: upper - lower > 0.000001,
    },
    behavior: 'free',
    collision: accessoryCollisionProfile(physics.collider),
    physics: accessoryPhysicsProfile(instance),
    scaleLimits: { min: lower, max: upper },
  }
}

export function rockPlacementTarget(): PlacementTarget {
  return { kind: 'rock', profile: ROCK_PLACEMENT_PROFILE }
}

export function accessoryPlacementTarget(instance: EquippedAccessoryInstance): PlacementTarget {
  return {
    kind: 'accessory',
    instanceId: instance.id,
    profile: accessoryPlacementProfile(instance),
  }
}

export function placementToolAllowed(
  capabilities: PlacementCapabilities,
  tool: PlacementTool,
): boolean {
  if (tool === 'position') return capabilities.canPosition
  if (tool === 'orientation') return capabilities.canRotate
  return capabilities.canScale
}

export function placementObjectId(identity: PlacementObjectIdentity): string {
  return identity.kind === 'rock' ? 'rock' : `accessory:${identity.instanceId}`
}

export function createPlacementObject(
  target: PlacementTarget,
  transform: PlacementTransform,
): PlacementObject {
  const identity: PlacementObjectIdentity = target.kind === 'rock'
    ? { kind: 'rock' }
    : { kind: 'accessory', instanceId: target.instanceId }

  return {
    id: placementObjectId(identity),
    identity,
    transform: {
      position: [...transform.position],
      rotation: [...transform.rotation],
      scale: transform.scale,
    },
    profile: target.profile,
  }
}
