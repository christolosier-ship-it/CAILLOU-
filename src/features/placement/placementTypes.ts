export type PlacementTool = 'position' | 'orientation' | 'size'

export type PlacementObjectKind = 'rock' | 'accessory'

export type PlacementObjectIdentity =
  | { kind: 'rock'; instanceId?: undefined }
  | { kind: 'accessory'; instanceId: string }

export interface PlacementCapabilities {
  canPosition: boolean
  canRotate: boolean
  canScale: boolean
}

export type PlacementBehavior = 'free' | 'surfaceAttached' | 'constrained' | 'fixedToHost'

export type PlacementCollisionProfile =
  | { strategy: 'primitive'; shape: 'cuboid' | 'ball' | 'capsule' }
  | { strategy: 'convexHull' }
  | { strategy: 'compound' }
  | { strategy: 'proxy' }

export interface PlacementPhysicsProfile {
  enabled: boolean
  dynamic: boolean
  mass: number
  friction: number
  restitution: number
  linearDamping: number
  angularDamping: number
  gravityScale: number
  ccd: boolean
}

export interface PlacementScaleLimits {
  min: number
  max: number
}

export interface PlacementObjectProfile {
  capabilities: PlacementCapabilities
  behavior: PlacementBehavior
  collision: PlacementCollisionProfile
  physics: PlacementPhysicsProfile
  scaleLimits: PlacementScaleLimits
}

export type PlacementTarget =
  | { kind: 'rock'; instanceId?: undefined; profile: PlacementObjectProfile }
  | { kind: 'accessory'; instanceId: string; profile: PlacementObjectProfile }

export type PlacementControlTarget =
  | { kind: 'camera' }
  | { kind: 'object'; target: PlacementTarget }

export type PlacementVector3 = [number, number, number]
export type PlacementQuaternion = [number, number, number, number]

export interface PlacementBounds {
  min: PlacementVector3
  max: PlacementVector3
}

export interface PlacementTransform {
  position: PlacementVector3
  rotation: PlacementQuaternion
  scale: number
}

export interface PlacementObject {
  id: string
  identity: PlacementObjectIdentity
  transform: PlacementTransform
  profile: PlacementObjectProfile
}
