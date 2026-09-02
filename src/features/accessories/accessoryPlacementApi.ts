import { supabase } from '../../lib/supabase/client'
import { loadAccessoryShop } from './accessoryApi'
import { parseLocalPosition, parseLocalRotation } from './accessoryPlacementRules'
import type {
  AccessoryTransform,
  CreateAccessoryPlacementInput,
  EquippedAccessoryInstance,
  RemoveAccessoryPlacementInput,
  StabilizeAccessoryPlacementInput,
  StabilizeAccessoryPlacementResult,
} from './accessoryTypes'

interface PlacementRpcError {
  code?: string
  message?: string
}

interface PlacementRpcBuilder {
  single: () => Promise<{ data: unknown; error: PlacementRpcError | null }>
}

const placementRpc = supabase.rpc.bind(supabase) as unknown as (
  functionName: string,
  args: Record<string, unknown>,
) => PlacementRpcBuilder

interface PlacementRow {
  id: string
  user_rock_id: string
  accessory_id: string
  slot: string | null
  local_position: unknown
  local_rotation: unknown
  uniform_scale: number
  equipped_at: string
  updated_at: string
  stabilized_at: string | null
}

interface CreatePlacementRow {
  instance_id: string
  user_rock_id: string
  accessory_id: string
  category: string
  local_position: unknown
  local_rotation: unknown
  uniform_scale: number
  equipped_at: string
  updated_at: string
}

interface UpdatePlacementRow {
  instance_id: string
  local_position: unknown
  local_rotation: unknown
  uniform_scale: number
  updated_at: string
}

interface StabilizePlacementRow extends UpdatePlacementRow {
  stabilized_at: string
}

export type AccessoryPlacementErrorKind =
  | 'limit'
  | 'not-owned'
  | 'rock'
  | 'invalid-transform'
  | 'unavailable'
  | 'session'
  | 'in-progress'
  | 'unknown'

export class AccessoryPlacementError extends Error {
  constructor(
    message: string,
    readonly kind: AccessoryPlacementErrorKind,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'AccessoryPlacementError'
  }
}

export function toAccessoryPlacementError(error: PlacementRpcError) {
  const detail = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()

  if (detail.includes('accessory_instance_limit_reached') || error.code === '54000') {
    return new AccessoryPlacementError('Le Socle accepte au maximum huit accessoires simultanés.', 'limit', false)
  }
  if (detail.includes('accessory_not_owned')) {
    return new AccessoryPlacementError('Cet accessoire doit appartenir à votre collection avant placement.', 'not-owned', false)
  }
  if (detail.includes('active_owned_rock_required') || detail.includes('active_owned_accessory_instance_required')) {
    return new AccessoryPlacementError('Ce placement n’appartient pas au caillou actif de votre compte.', 'rock', false)
  }
  if (
    detail.includes('accessory_position_invalid')
    || detail.includes('accessory_rotation_invalid')
    || detail.includes('accessory_scale_out_of_bounds')
    || error.code === '22023'
  ) {
    return new AccessoryPlacementError('Le registre a refusé un transform hors des limites homologuées.', 'invalid-transform', false)
  }
  if (detail.includes('accessory_unavailable')) {
    return new AccessoryPlacementError('Cet accessoire n’est plus disponible pour un nouveau placement.', 'unavailable', false)
  }
  if (detail.includes('authentication_required') || error.code === 'PGRST301') {
    return new AccessoryPlacementError('Votre session doit être vérifiée avant de modifier les accessoires.', 'session', false)
  }
  if (detail.includes('mutation_in_progress') || error.code === '40001') {
    return new AccessoryPlacementError('La même opération est encore en cours de confirmation.', 'in-progress', true)
  }
  return new AccessoryPlacementError('Le placement n’a pas pu être confirmé par le registre.', 'unknown', true)
}

function parseTransform(row: { local_position: unknown; local_rotation: unknown; uniform_scale: number }): AccessoryTransform {
  const localPosition = parseLocalPosition(row.local_position as never)
  const localRotation = parseLocalRotation(row.local_rotation as never)
  if (!localPosition || !localRotation || !Number.isFinite(row.uniform_scale)) {
    throw new AccessoryPlacementError('Un placement persistant contient un transform invalide.', 'invalid-transform', false)
  }
  return { localPosition, localRotation, uniformScale: row.uniform_scale }
}

export async function loadAccessoryPlacements(userRockId: string): Promise<EquippedAccessoryInstance[]> {
  const sessionResult = await supabase.auth.getSession()
  if (!sessionResult.data.session) return []

  const [placementResult, shop] = await Promise.all([
    supabase
      .from('equipped_accessories')
      .select('id, user_rock_id, accessory_id, slot, local_position, local_rotation, uniform_scale, equipped_at, updated_at, stabilized_at')
      .eq('user_rock_id', userRockId)
      .order('equipped_at')
      .order('id'),
    loadAccessoryShop(),
  ])

  if (placementResult.error) {
    throw new AccessoryPlacementError('Les placements du caillou n’ont pas pu être relus.', 'unknown', true)
  }

  const catalog = new Map(shop.items.map((item) => [item.id, item]))
  const rows = (placementResult.data ?? []) as unknown as PlacementRow[]

  return rows.flatMap((row) => {
    const accessory = catalog.get(row.accessory_id)
    if (!accessory) return []
    const transform = parseTransform(row)
    return [{
      id: row.id,
      userRockId: row.user_rock_id,
      accessoryId: row.accessory_id,
      category: row.slot ?? accessory.category,
      name: accessory.name,
      modelPath: accessory.modelPath,
      previewPath: accessory.previewPath,
      scaleMin: accessory.scaleMin,
      scaleMax: accessory.scaleMax,
      triangleCount: accessory.triangleCount,
      dimensions: accessory.dimensions,
      physics: accessory.physics,
      equippedAt: row.equipped_at,
      updatedAt: row.updated_at,
      stabilizedAt: row.stabilized_at,
      ...transform,
    }]
  })
}

export async function createAccessoryPlacement(
  input: CreateAccessoryPlacementInput,
): Promise<EquippedAccessoryInstance> {
  const { data, error } = await placementRpc('create_equipped_accessory', {
    p_user_rock_id: input.userRockId,
    p_accessory_id: input.accessory.id,
    p_event_key: input.eventKey,
    p_local_position: input.transform.localPosition,
    p_local_rotation: input.transform.localRotation,
    p_uniform_scale: input.transform.uniformScale,
  }).single()

  if (error) throw toAccessoryPlacementError(error)
  if (!data) throw new AccessoryPlacementError('Le registre n’a retourné aucune instance.', 'unknown', true)

  const row = data as CreatePlacementRow
  return {
    id: row.instance_id,
    userRockId: row.user_rock_id,
    accessoryId: row.accessory_id,
    category: row.category,
    name: input.accessory.name,
    modelPath: input.accessory.modelPath,
    previewPath: input.accessory.previewPath,
    scaleMin: input.accessory.scaleMin,
    scaleMax: input.accessory.scaleMax,
    triangleCount: input.accessory.triangleCount,
    dimensions: input.accessory.dimensions,
    physics: input.accessory.physics,
    equippedAt: row.equipped_at,
    updatedAt: row.updated_at,
    stabilizedAt: null,
    ...parseTransform(row),
  }
}

export async function stabilizeAccessoryPlacement(
  input: StabilizeAccessoryPlacementInput,
): Promise<StabilizeAccessoryPlacementResult> {
  const { data, error } = await placementRpc('stabilize_equipped_accessory', {
    p_instance_id: input.instanceId,
    p_event_key: input.eventKey,
    p_local_position: input.transform.localPosition,
    p_local_rotation: input.transform.localRotation,
    p_uniform_scale: input.transform.uniformScale,
  }).single()

  if (error) throw toAccessoryPlacementError(error)
  if (!data) throw new AccessoryPlacementError('Le registre n’a retourné aucune pose stabilisée.', 'unknown', true)

  const row = data as StabilizePlacementRow
  return {
    instanceId: row.instance_id,
    updatedAt: row.updated_at,
    stabilizedAt: row.stabilized_at,
    ...parseTransform(row),
  }
}

export async function removeAccessoryPlacement(input: RemoveAccessoryPlacementInput): Promise<string> {
  const { data, error } = await placementRpc('remove_equipped_accessory', {
    p_instance_id: input.instanceId,
    p_event_key: input.eventKey,
  }).single()

  if (error) throw toAccessoryPlacementError(error)
  if (!data) throw new AccessoryPlacementError('Le registre n’a pas confirmé le retrait.', 'unknown', true)
  return (data as { instance_id: string }).instance_id
}
