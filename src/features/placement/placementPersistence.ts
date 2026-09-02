import { AccessoryPlacementError, stabilizeAccessoryPlacement } from '../accessories/accessoryPlacementApi'
import type { StabilizeAccessoryPlacementResult } from '../accessories/accessoryTypes'
import { accessoryWorldToLocal } from '../rockMovement/rockMovementRules'
import { stabilizeRockComposition } from '../rockMovement/rockMovementApi'
import type {
  RockCompositionDraft,
  RockPose,
  StabilizedRockComposition,
} from '../rockMovement/rockMovementTypes'
import type { PlacementTransform } from './placementTypes'

export interface SettledWorldAccessory {
  instanceId: string
  transform: PlacementTransform
}

export interface SettledWorldComposition {
  rockTransform: PlacementTransform
  accessories: SettledWorldAccessory[]
}

export function worldAccessoryToPersistence(
  instanceId: string,
  transform: PlacementTransform,
  rockPose: RockPose,
) {
  return accessoryWorldToLocal({
    instanceId,
    worldPosition: [...transform.position],
    worldRotation: [...transform.rotation],
    uniformScale: transform.scale,
  }, rockPose)
}

export function worldCompositionToPersistence(
  composition: SettledWorldComposition,
): RockCompositionDraft {
  const rockPose: RockPose = {
    position: [...composition.rockTransform.position],
    rotation: [...composition.rockTransform.rotation],
  }
  return {
    rockPose,
    accessories: composition.accessories.map(({ instanceId, transform }) =>
      worldAccessoryToPersistence(instanceId, transform, rockPose)),
  }
}

export async function persistAccessoryWorldTransform(input: {
  instanceId: string
  transform: PlacementTransform
  rockPose: RockPose
  eventKey: string
}): Promise<StabilizeAccessoryPlacementResult> {
  const request = {
    instanceId: input.instanceId,
    eventKey: input.eventKey,
    transform: worldAccessoryToPersistence(input.instanceId, input.transform, input.rockPose),
  }
  try {
    return await stabilizeAccessoryPlacement(request)
  } catch (error) {
    if (!(error instanceof AccessoryPlacementError) || !error.retryable) throw error
    return stabilizeAccessoryPlacement(request)
  }
}

export function persistRockCompositionWorld(input: {
  userRockId: string
  eventKey: string
  composition: SettledWorldComposition
}): Promise<StabilizedRockComposition> {
  return stabilizeRockComposition(
    input.userRockId,
    input.eventKey,
    worldCompositionToPersistence(input.composition),
  )
}
