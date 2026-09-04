import { supabase } from '../lib/supabase/client'
import { getResilienceValue, putResilienceValue } from './resilienceCache'

export const SERVER_RECONCILED_EVENT = 'caillou:server-reconciled'

export type PendingMutationOperation =
  | 'create_equipped_accessory'
  | 'remove_equipped_accessory'
  | 'stabilize_equipped_accessory'
  | 'stabilize_rock_composition'
  | 'commit_placement_session'
  | 'purchase_rock_feature_unlock'

export interface PendingServerMutation {
  operation: PendingMutationOperation
  eventKey: string
  args: Record<string, unknown>
  createdAt: string
}

interface ReconcileRpcBuilder {
  single: () => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>
}

const reconcileRpc = supabase.rpc.bind(supabase) as unknown as (
  functionName: string,
  args: Record<string, unknown>,
) => ReconcileRpcBuilder

const QUEUE_KEY_PREFIX = 'pending-mutations:'
let updateChain: Promise<void> = Promise.resolve()
let scheduledTimer: number | null = null

function queueKey(userId: string) {
  return `${QUEUE_KEY_PREFIX}${userId}`
}

async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

async function updateQueue(
  userId: string,
  updater: (current: PendingServerMutation[]) => PendingServerMutation[],
) {
  updateChain = updateChain.then(async () => {
    const current = await getResilienceValue<PendingServerMutation[]>(queueKey(userId)) ?? []
    await putResilienceValue(queueKey(userId), updater(current))
  }).catch(() => undefined)
  await updateChain
}

export async function rememberPendingMutation(
  operation: PendingMutationOperation,
  eventKey: string,
  args: Record<string, unknown>,
) {
  const userId = await currentUserId()
  if (!userId) return
  await updateQueue(userId, (current) => {
    const withoutSameKey = current.filter((item) => item.eventKey !== eventKey)
    return [...withoutSameKey, { operation, eventKey, args, createdAt: new Date().toISOString() }]
  })
}

export async function forgetPendingMutation(eventKey: string) {
  const userId = await currentUserId()
  if (!userId) return
  await updateQueue(userId, (current) => current.filter((item) => item.eventKey !== eventKey))
}

function shouldKeepPending(error: { code?: string; message?: string }) {
  const detail = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  return error.code === '40001'
    || error.code === 'PGRST301'
    || detail.includes('mutation_in_progress')
    || detail.includes('failed to fetch')
    || detail.includes('network')
    || !error.code
}

export async function reconcilePendingMutations() {
  const userId = await currentUserId()
  if (!userId) return { attempted: 0, succeeded: 0, pending: 0, failed: 0 }

  const pending = await getResilienceValue<PendingServerMutation[]>(queueKey(userId)) ?? []
  let succeeded = 0
  let failed = 0
  const remaining: PendingServerMutation[] = []

  for (const item of pending) {
    const response = await reconcileRpc(item.operation, item.args).single()
    if (!response.error && response.data) {
      succeeded += 1
      continue
    }
    if (response.error && !shouldKeepPending(response.error)) {
      failed += 1
      continue
    }
    remaining.push(item)
  }

  await putResilienceValue(queueKey(userId), remaining)
  if (succeeded > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SERVER_RECONCILED_EVENT, {
      detail: { succeeded, pending: remaining.length, failed },
    }))
  }

  return { attempted: pending.length, succeeded, pending: remaining.length, failed }
}

export function schedulePendingMutationReconciliation(delayMs = 900) {
  if (typeof window === 'undefined' || !navigator.onLine) return
  if (scheduledTimer !== null) window.clearTimeout(scheduledTimer)
  scheduledTimer = window.setTimeout(() => {
    scheduledTimer = null
    void reconcilePendingMutations()
  }, delayMs)
}
