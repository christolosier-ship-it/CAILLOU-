import { supabase } from '../../lib/supabase/client'
import {
  ROCK_MOVEMENT_FEATURE_ID,
  ROCK_MOVEMENT_PRICE_LITHONS,
  parseRockPosition,
  parseRockRotation,
} from './rockMovementRules'
import type {
  RockCompositionDraft,
  RockMovementPermitSnapshot,
  StabilizedRockComposition,
  PurchaseRockMovementPermitResult,
} from './rockMovementTypes'

interface RpcError {
  code?: string
  message?: string
}

interface SingleBuilder<T> {
  single: () => Promise<{ data: T | null; error: RpcError | null }>
}

interface MaybeSingleQuery<T> {
  select: (columns: string) => MaybeSingleQuery<T>
  eq: (column: string, value: unknown) => MaybeSingleQuery<T>
  maybeSingle: () => Promise<{ data: T | null; error: RpcError | null }>
}

const rawRpc = supabase.rpc.bind(supabase) as unknown as <T>(
  functionName: string,
  args: Record<string, unknown>,
) => SingleBuilder<T>

const rawFrom = supabase.from.bind(supabase) as unknown as <T>(table: string) => MaybeSingleQuery<T>

interface FeatureRow {
  id: string
  name: string
  description: string | null
  price_lithons: number
}

interface UnlockRow {
  feature_id: string
  unlocked_at: string
  price_paid: number
}

interface PurchaseRow {
  balance: number
  feature_id: string
  unlocked_at: string
  price_paid: number
}

interface CompositionRow {
  user_rock_id: string
  rock_position: unknown
  rock_rotation: unknown
  stabilized_at: string
  accessories: unknown
}

export type RockMovementErrorKind =
  | 'already-unlocked'
  | 'insufficient'
  | 'permit-required'
  | 'invalid-transform'
  | 'session'
  | 'in-progress'
  | 'unknown'

export class RockMovementError extends Error {
  constructor(
    message: string,
    readonly kind: RockMovementErrorKind,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'RockMovementError'
  }
}

function toRockMovementError(error: RpcError) {
  const detail = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  if (detail.includes('feature_already_unlocked') || error.code === '23505') {
    return new RockMovementError('Le permis appartient déjà à ce compte.', 'already-unlocked', false)
  }
  if (detail.includes('insufficient_lithons') || error.code === '22003') {
    return new RockMovementError('Le registre exige 1000 Lithons pour délivrer ce permis.', 'insufficient', false)
  }
  if (detail.includes('rock_movement_permit_required')) {
    return new RockMovementError('Le permis de manutention minérale est requis.', 'permit-required', false)
  }
  if (
    detail.includes('rock_position_invalid')
    || detail.includes('rock_rotation_invalid')
    || detail.includes('composition_')
    || detail.includes('accessory_position_invalid')
    || detail.includes('accessory_rotation_invalid')
    || detail.includes('accessory_scale_out_of_bounds')
  ) {
    return new RockMovementError('La composition finale est hors des limites homologuées.', 'invalid-transform', false)
  }
  if (detail.includes('authentication_required') || error.code === 'PGRST301' || error.code === '42501') {
    return new RockMovementError('Votre session doit être vérifiée avant cette manutention.', 'session', false)
  }
  if (detail.includes('mutation_in_progress') || error.code === '40001') {
    return new RockMovementError('La même opération est encore en cours de confirmation.', 'in-progress', true)
  }
  return new RockMovementError('Le registre n’a pas confirmé la manutention.', 'unknown', true)
}

export async function loadRockMovementPermit(): Promise<RockMovementPermitSnapshot> {
  const [featureResult, unlockResult] = await Promise.all([
    rawFrom<FeatureRow>('feature_catalog')
      .select('id, name, description, price_lithons')
      .eq('id', ROCK_MOVEMENT_FEATURE_ID)
      .eq('active', true)
      .maybeSingle(),
    rawFrom<UnlockRow>('user_feature_unlocks')
      .select('feature_id, unlocked_at, price_paid')
      .eq('feature_id', ROCK_MOVEMENT_FEATURE_ID)
      .maybeSingle(),
  ])

  if (featureResult.error || !featureResult.data) {
    throw new RockMovementError('Le registre des permis n’est pas disponible.', 'unknown', true)
  }
  if (unlockResult.error) {
    throw new RockMovementError('Votre permis n’a pas pu être vérifié.', 'unknown', true)
  }
  if (featureResult.data.price_lithons !== ROCK_MOVEMENT_PRICE_LITHONS) {
    throw new RockMovementError('Le prix du permis ne correspond pas au contrat V1.', 'unknown', false)
  }

  return {
    featureId: featureResult.data.id,
    name: featureResult.data.name,
    description: featureResult.data.description ?? 'Autorise la manutention réglementaire du caillou.',
    priceLithons: featureResult.data.price_lithons,
    unlockedAt: unlockResult.data?.unlocked_at ?? null,
    pricePaid: unlockResult.data?.price_paid ?? null,
  }
}

export async function purchaseRockMovementPermit(eventKey: string): Promise<PurchaseRockMovementPermitResult> {
  const { data, error } = await rawRpc<PurchaseRow>('purchase_feature_unlock', {
    p_feature_id: ROCK_MOVEMENT_FEATURE_ID,
    p_event_key: eventKey,
  }).single()

  if (error) throw toRockMovementError(error)
  if (!data) throw new RockMovementError('Le registre n’a retourné aucun permis.', 'unknown', true)

  return {
    balance: data.balance,
    featureId: data.feature_id,
    unlockedAt: data.unlocked_at,
    pricePaid: data.price_paid,
  }
}

function finiteTuple(value: unknown, length: number) {
  if (!Array.isArray(value) || value.length !== length) return null
  const tuple = value.map(Number)
  return tuple.every(Number.isFinite) ? tuple : null
}

function parseAccessoryPosition(value: unknown, fallback: [number, number, number]): [number, number, number] {
  const tuple = finiteTuple(value, 3)
  return tuple ? [tuple[0], tuple[1], tuple[2]] : fallback
}

function parseAccessoryRotation(value: unknown, fallback: [number, number, number, number]): [number, number, number, number] {
  const tuple = finiteTuple(value, 4)
  if (!tuple) return fallback
  const length = Math.hypot(tuple[0], tuple[1], tuple[2], tuple[3])
  if (!Number.isFinite(length) || length < 0.000001) return fallback
  return [tuple[0] / length, tuple[1] / length, tuple[2] / length, tuple[3] / length]
}

function parseCompositionAccessories(value: unknown, draft: RockCompositionDraft) {
  if (!Array.isArray(value)) return draft.accessories
  const draftById = new Map(draft.accessories.map((item) => [item.instanceId, item]))
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const instanceId = typeof row.instance_id === 'string' ? row.instance_id : ''
    const fallback = draftById.get(instanceId)
    if (!fallback) return []
    return [{
      instanceId,
      localPosition: parseAccessoryPosition(row.local_position, fallback.localPosition),
      localRotation: parseAccessoryRotation(row.local_rotation, fallback.localRotation),
      uniformScale: Number.isFinite(Number(row.uniform_scale)) ? Number(row.uniform_scale) : fallback.uniformScale,
    }]
  })
}

export async function stabilizeRockComposition(
  userRockId: string,
  eventKey: string,
  draft: RockCompositionDraft,
): Promise<StabilizedRockComposition> {
  const payload = draft.accessories.map((item) => ({
    instance_id: item.instanceId,
    local_position: item.localPosition,
    local_rotation: item.localRotation,
    uniform_scale: item.uniformScale,
  }))
  const input = {
    p_user_rock_id: userRockId,
    p_event_key: eventKey,
    p_rock_position: draft.rockPose.position,
    p_rock_rotation: draft.rockPose.rotation,
    p_accessories: payload,
  }

  let response = await rawRpc<CompositionRow>('stabilize_rock_composition', input).single()
  if (response.error) {
    const firstError = toRockMovementError(response.error)
    if (!firstError.retryable) throw firstError
    response = await rawRpc<CompositionRow>('stabilize_rock_composition', input).single()
  }

  if (response.error) throw toRockMovementError(response.error)
  if (!response.data) throw new RockMovementError('Le registre n’a retourné aucune composition stabilisée.', 'unknown', true)

  return {
    rockPose: {
      position: parseRockPosition(response.data.rock_position),
      rotation: parseRockRotation(response.data.rock_rotation),
    },
    stabilizedAt: response.data.stabilized_at,
    accessories: parseCompositionAccessories(response.data.accessories, draft),
  }
}