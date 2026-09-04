import { supabase } from '../../lib/supabase/client'
import {
  forgetPendingMutation,
  rememberPendingMutation,
  schedulePendingMutationReconciliation,
} from '../../pwa/pendingMutations'
import { AccessoryPlacementError, stabilizeAccessoryPlacement } from '../accessories/accessoryPlacementApi'
import type { EquippedAccessoryInstance, StabilizeAccessoryPlacementResult } from '../accessories/accessoryTypes'
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

export interface PlacementSessionCommitAccessory {
  instanceId: string
  accessoryId: string
  localPosition: [number, number, number]
  localRotation: [number, number, number, number]
  uniformScale: number
  equippedAt: string
  updatedAt: string
  stabilizedAt: string
}

export interface PlacementSessionCommitResult {
  rockPose: RockPose
  stabilizedAt: string
  accessories: PlacementSessionCommitAccessory[]
}

interface PlacementCommitRpcError {
  code?: string
  message?: string
}

interface PlacementCommitRpcBuilder {
  single: () => Promise<{ data: unknown; error: PlacementCommitRpcError | null }>
}

interface PlacementCommitRow {
  rock_position: unknown
  rock_rotation: unknown
  stabilized_at: string
  accessories: unknown
}

const placementCommitRpc = supabase.rpc.bind(supabase) as unknown as (
  functionName: string,
  args: Record<string, unknown>,
) => PlacementCommitRpcBuilder

export class PlacementSessionCommitError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'PlacementSessionCommitError'
  }
}

function finiteTuple(value: unknown, length: number): number[] | null {
  if (!Array.isArray(value) || value.length !== length) return null
  const tuple = value.map(Number)
  return tuple.every(Number.isFinite) ? tuple : null
}

function parsePosition(value: unknown): [number, number, number] {
  const tuple = finiteTuple(value, 3)
  if (!tuple) throw new PlacementSessionCommitError('Le serveur a retourné une position invalide.', false)
  return [tuple[0]!, tuple[1]!, tuple[2]!]
}

function parseRotation(value: unknown): [number, number, number, number] {
  const tuple = finiteTuple(value, 4)
  if (!tuple) throw new PlacementSessionCommitError('Le serveur a retourné une orientation invalide.', false)
  const norm = Math.hypot(tuple[0]!, tuple[1]!, tuple[2]!, tuple[3]!)
  if (!Number.isFinite(norm) || norm < 0.000001) {
    throw new PlacementSessionCommitError('Le serveur a retourné une orientation invalide.', false)
  }
  return [tuple[0]! / norm, tuple[1]! / norm, tuple[2]! / norm, tuple[3]! / norm]
}

function toPlacementCommitError(error: PlacementCommitRpcError) {
  const detail = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  if (detail.includes('accessory_instance_limit_reached') || error.code === '54000') {
    return new PlacementSessionCommitError('Le Socle accepte au maximum huit accessoires simultanés.', false)
  }
  if (detail.includes('accessory_not_owned')) {
    return new PlacementSessionCommitError('Un accessoire du draft ne fait plus partie de votre collection.', false)
  }
  if (detail.includes('rock_movement_permit_required')) {
    return new PlacementSessionCommitError('Le permis de manutention minérale est requis pour déplacer le caillou.', false)
  }
  if (detail.includes('active_owned_rock_required') || detail.includes('active_owned_accessory_instance_required')) {
    return new PlacementSessionCommitError('La composition ne correspond plus au caillou actif de votre compte.', false)
  }
  if (
    detail.includes('placement_')
    || detail.includes('accessory_position_invalid')
    || detail.includes('accessory_rotation_invalid')
    || detail.includes('accessory_scale_out_of_bounds')
    || detail.includes('rock_position_invalid')
    || detail.includes('rock_rotation_invalid')
    || error.code === '22023'
  ) {
    return new PlacementSessionCommitError('Le registre a refusé une composition hors des limites homologuées.', false)
  }
  if (detail.includes('accessory_unavailable')) {
    return new PlacementSessionCommitError('Un accessoire du draft n’est plus disponible.', false)
  }
  if (detail.includes('authentication_required') || error.code === 'PGRST301' || error.code === '42501') {
    return new PlacementSessionCommitError('Votre session doit être vérifiée avant de confirmer Placement.', false)
  }
  if (detail.includes('mutation_in_progress') || error.code === '40001') {
    return new PlacementSessionCommitError('La même session Placement est encore en cours de confirmation.', true)
  }
  return new PlacementSessionCommitError(
    'La confirmation serveur n’est pas arrivée. La même session est conservée pour réconciliation sans créer de second commit.',
    true,
  )
}

function parseCommitAccessories(value: unknown): PlacementSessionCommitAccessory[] {
  if (!Array.isArray(value)) {
    throw new PlacementSessionCommitError('Le serveur a retourné une composition accessoire invalide.', false)
  }
  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new PlacementSessionCommitError('Le serveur a retourné une composition accessoire invalide.', false)
    }
    const row = item as Record<string, unknown>
    const instanceId = typeof row.instance_id === 'string' ? row.instance_id : ''
    const accessoryId = typeof row.accessory_id === 'string' ? row.accessory_id : ''
    const equippedAt = typeof row.equipped_at === 'string' ? row.equipped_at : ''
    const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : ''
    const stabilizedAt = typeof row.stabilized_at === 'string' ? row.stabilized_at : ''
    const uniformScale = Number(row.uniform_scale)
    if (!instanceId || !accessoryId || !equippedAt || !updatedAt || !stabilizedAt || !Number.isFinite(uniformScale)) {
      throw new PlacementSessionCommitError('Le serveur a retourné une instance accessoire incomplète.', false)
    }
    return {
      instanceId,
      accessoryId,
      localPosition: parsePosition(row.local_position),
      localRotation: parseRotation(row.local_rotation),
      uniformScale,
      equippedAt,
      updatedAt,
      stabilizedAt,
    }
  })
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

export async function persistPlacementSessionWorld(input: {
  userRockId: string
  eventKey: string
  moveRock: boolean
  composition: SettledWorldComposition
  instances: readonly EquippedAccessoryInstance[]
}): Promise<PlacementSessionCommitResult> {
  const rockPose: RockPose = {
    position: [...input.composition.rockTransform.position],
    rotation: [...input.composition.rockTransform.rotation],
  }
  const instancesById = new Map(input.instances.map((instance) => [instance.id, instance]))
  const accessories = input.composition.accessories.map(({ instanceId, transform }) => {
    const instance = instancesById.get(instanceId)
    if (!instance) {
      throw new PlacementSessionCommitError(`L’instance ${instanceId} n’appartient plus au draft courant.`, false)
    }
    const local = worldAccessoryToPersistence(instanceId, transform, rockPose)
    return {
      instance_id: instanceId,
      accessory_id: instance.accessoryId,
      local_position: local.localPosition,
      local_rotation: local.localRotation,
      uniform_scale: local.uniformScale,
    }
  })
  const args = {
    p_user_rock_id: input.userRockId,
    p_event_key: input.eventKey,
    p_move_rock: input.moveRock,
    p_rock_position: rockPose.position,
    p_rock_rotation: rockPose.rotation,
    p_accessories: accessories,
  }

  await rememberPendingMutation('commit_placement_session', input.eventKey, args)
  let response = await placementCommitRpc('commit_placement_session', args).single()
  if (response.error) {
    const first = toPlacementCommitError(response.error)
    if (!first.retryable) {
      await forgetPendingMutation(input.eventKey)
      throw first
    }
    response = await placementCommitRpc('commit_placement_session', args).single()
  }

  if (response.error) {
    const mapped = toPlacementCommitError(response.error)
    if (mapped.retryable) schedulePendingMutationReconciliation()
    else await forgetPendingMutation(input.eventKey)
    throw mapped
  }
  if (!response.data) {
    schedulePendingMutationReconciliation()
    throw new PlacementSessionCommitError('Le registre n’a retourné aucune composition confirmée.', true)
  }

  const row = response.data as PlacementCommitRow
  const stabilizedAt = typeof row.stabilized_at === 'string' ? row.stabilized_at : ''
  if (!stabilizedAt) {
    await forgetPendingMutation(input.eventKey)
    throw new PlacementSessionCommitError('Le registre n’a pas horodaté la composition confirmée.', false)
  }
  const result: PlacementSessionCommitResult = {
    rockPose: {
      position: parsePosition(row.rock_position),
      rotation: parseRotation(row.rock_rotation),
    },
    stabilizedAt,
    accessories: parseCommitAccessories(row.accessories),
  }
  await forgetPendingMutation(input.eventKey)
  return result
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
