import type { AccessoryTransform } from '../accessories/accessoryTypes'
import { accessoryLocalToWorld } from '../rockMovement/rockMovementRules'
import type { RockPose } from '../rockMovement/rockMovementTypes'
import type { PlacementObjectIdentity, PlacementTransform } from './placementTypes'

export interface PlacementSessionAccessorySource extends AccessoryTransform {
  id: string
}

export interface PlacementSessionState {
  initialRock: PlacementTransform
  initialAccessories: Record<string, PlacementTransform>
  rock: PlacementTransform
  accessories: Record<string, PlacementTransform>
  dirtyRock: boolean
  dirtyAccessoryIds: string[]
  addedAccessoryIds: string[]
  removedAccessoryIds: string[]
}

export interface PlacementSettlementPlan {
  rock: boolean
  accessoryIds: string[]
  membershipChanged: boolean
}

function copyTransform(transform: PlacementTransform): PlacementTransform {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: transform.scale,
  }
}

function copyTransforms(transforms: Record<string, PlacementTransform>) {
  return Object.fromEntries(Object.entries(transforms).map(([id, transform]) => [id, copyTransform(transform)]))
}

function rockTransform(pose: RockPose): PlacementTransform {
  return {
    position: [...pose.position],
    rotation: [...pose.rotation],
    scale: 1,
  }
}

function accessoryTransform(
  instance: PlacementSessionAccessorySource,
  pose: RockPose,
): PlacementTransform {
  const world = accessoryLocalToWorld(instance.id, instance, pose)
  return {
    position: [...world.worldPosition],
    rotation: [...world.worldRotation],
    scale: world.uniformScale,
  }
}

function sessionRockPose(session: PlacementSessionState): RockPose {
  return {
    position: [...session.rock.position],
    rotation: [...session.rock.rotation],
  }
}

export function createPlacementSession(
  pose: RockPose,
  accessories: readonly PlacementSessionAccessorySource[],
): PlacementSessionState {
  const initialRock = rockTransform(pose)
  const initialAccessories = Object.fromEntries(
    accessories.map((instance) => [instance.id, accessoryTransform(instance, pose)]),
  )
  return {
    initialRock: copyTransform(initialRock),
    initialAccessories: copyTransforms(initialAccessories),
    rock: copyTransform(initialRock),
    accessories: copyTransforms(initialAccessories),
    dirtyRock: false,
    dirtyAccessoryIds: [],
    addedAccessoryIds: [],
    removedAccessoryIds: [],
  }
}

export function updatePlacementSession(
  session: PlacementSessionState,
  target: PlacementObjectIdentity,
  transform: PlacementTransform,
): PlacementSessionState {
  if (target.kind === 'rock') {
    return {
      ...session,
      rock: copyTransform(transform),
      dirtyRock: true,
    }
  }

  if (!session.accessories[target.instanceId]) return session
  const dirtyAccessoryIds = session.dirtyAccessoryIds.includes(target.instanceId)
    ? session.dirtyAccessoryIds
    : [...session.dirtyAccessoryIds, target.instanceId]
  return {
    ...session,
    accessories: {
      ...session.accessories,
      [target.instanceId]: copyTransform(transform),
    },
    dirtyAccessoryIds,
  }
}

export function addPlacementSessionAccessory(
  session: PlacementSessionState,
  instance: PlacementSessionAccessorySource,
): PlacementSessionState {
  const initiallyPresent = Boolean(session.initialAccessories[instance.id])
  return {
    ...session,
    accessories: {
      ...session.accessories,
      [instance.id]: accessoryTransform(instance, sessionRockPose(session)),
    },
    addedAccessoryIds: initiallyPresent || session.addedAccessoryIds.includes(instance.id)
      ? session.addedAccessoryIds
      : [...session.addedAccessoryIds, instance.id],
    removedAccessoryIds: session.removedAccessoryIds.filter((candidate) => candidate !== instance.id),
  }
}

export function removePlacementSessionAccessory(
  session: PlacementSessionState,
  instanceId: string,
): PlacementSessionState {
  if (!session.accessories[instanceId]) return session
  const accessories = { ...session.accessories }
  delete accessories[instanceId]
  const wasAddedDuringSession = session.addedAccessoryIds.includes(instanceId)
  const initiallyPresent = Boolean(session.initialAccessories[instanceId])
  return {
    ...session,
    accessories,
    dirtyAccessoryIds: session.dirtyAccessoryIds.filter((candidate) => candidate !== instanceId),
    addedAccessoryIds: session.addedAccessoryIds.filter((candidate) => candidate !== instanceId),
    removedAccessoryIds: initiallyPresent && !wasAddedDuringSession && !session.removedAccessoryIds.includes(instanceId)
      ? [...session.removedAccessoryIds, instanceId]
      : session.removedAccessoryIds,
  }
}

export function placementSessionTransform(
  session: PlacementSessionState | null,
  target: PlacementObjectIdentity | null,
): PlacementTransform | null {
  if (!session || !target) return null
  return target.kind === 'rock'
    ? copyTransform(session.rock)
    : session.accessories[target.instanceId]
      ? copyTransform(session.accessories[target.instanceId]!)
      : null
}

export function buildPlacementSettlementPlan(
  session: PlacementSessionState | null,
): PlacementSettlementPlan | null {
  if (!session) return null
  const membershipChanged = session.addedAccessoryIds.length > 0 || session.removedAccessoryIds.length > 0
  if (!session.dirtyRock && session.dirtyAccessoryIds.length === 0 && !membershipChanged) return null

  const physicalAccessoryIds = session.dirtyRock
    ? Object.keys(session.accessories)
    : [...new Set([...session.dirtyAccessoryIds, ...session.addedAccessoryIds])]
      .filter((instanceId) => Boolean(session.accessories[instanceId]))

  return {
    rock: session.dirtyRock,
    accessoryIds: physicalAccessoryIds,
    membershipChanged,
  }
}
