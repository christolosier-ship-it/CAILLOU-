import type { AccessoryTransform } from '../accessories/accessoryTypes'
import { accessoryLocalToWorld } from '../rockMovement/rockMovementRules'
import type { RockPose } from '../rockMovement/rockMovementTypes'
import type { PlacementTarget, PlacementTransform } from './placementTypes'

export interface PlacementSessionAccessorySource extends AccessoryTransform {
  id: string
}

export interface PlacementSessionState {
  rock: PlacementTransform
  accessories: Record<string, PlacementTransform>
  dirtyRock: boolean
  dirtyAccessoryIds: string[]
}

export interface PlacementSettlementPlan {
  rock: boolean
  accessoryIds: string[]
}

function copyTransform(transform: PlacementTransform): PlacementTransform {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: transform.scale,
  }
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
  return {
    rock: rockTransform(pose),
    accessories: Object.fromEntries(accessories.map((instance) => [instance.id, accessoryTransform(instance, pose)])),
    dirtyRock: false,
    dirtyAccessoryIds: [],
  }
}

export function updatePlacementSession(
  session: PlacementSessionState,
  target: PlacementTarget,
  transform: PlacementTransform,
): PlacementSessionState {
  if (target.kind === 'rock') {
    return {
      ...session,
      rock: copyTransform(transform),
      dirtyRock: true,
    }
  }

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
  return {
    ...session,
    accessories: {
      ...session.accessories,
      [instance.id]: accessoryTransform(instance, sessionRockPose(session)),
    },
  }
}

export function removePlacementSessionAccessory(
  session: PlacementSessionState,
  instanceId: string,
): PlacementSessionState {
  const accessories = { ...session.accessories }
  delete accessories[instanceId]
  return {
    ...session,
    accessories,
    dirtyAccessoryIds: session.dirtyAccessoryIds.filter((candidate) => candidate !== instanceId),
  }
}

export function placementSessionTransform(
  session: PlacementSessionState | null,
  target: PlacementTarget | null,
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
  if (!session || (!session.dirtyRock && session.dirtyAccessoryIds.length === 0)) return null
  return {
    rock: session.dirtyRock,
    accessoryIds: session.dirtyRock
      ? Object.keys(session.accessories)
      : [...session.dirtyAccessoryIds],
  }
}
