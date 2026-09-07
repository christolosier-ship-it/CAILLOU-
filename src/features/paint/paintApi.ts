import { supabase } from '../../lib/supabase/client'
import { forgetPendingMutation, rememberPendingMutation, schedulePendingMutationReconciliation } from '../../pwa/pendingMutations'
import { PAINT_FEATURE_ID, parseRockAppearance } from './paintRules'
import type { RockAppearance } from './paintRules'

export interface PaintSnapshot {
  userId: string; rockId: string; appearance: RockAppearance; unlocked: boolean
  feature: { name: string; description: string; price: number; active: boolean }
  balance: number
}
export interface PaintServices {
  userId: () => Promise<string | null>
  load: (rockId: string) => Promise<PaintSnapshot>
  purchase: (rockId: string, eventKey: string) => Promise<{ balance: number }>
  save: (rockId: string, appearance: RockAppearance, eventKey: string) => Promise<RockAppearance>
}
export class PaintError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); this.name = 'PaintError' }
}
function paintError(error: { code?: string; message?: string }) {
  const message = error.message ?? ''
  if (message.includes('insufficient_lithons')) return new PaintError('Solde insuffisant pour acquérir Peinture.', false)
  if (message.includes('feature_already_unlocked')) return new PaintError('Peinture est déjà acquise pour ce caillou.', false)
  if (message.includes('feature_unavailable')) return new PaintError('Peinture n’est plus proposée à l’achat.', false)
  if (error.code === '42501') return new PaintError('Vérifiez le caillou actif et son autorisation Peinture.', false)
  if (error.code === '22023' || error.code === '22004') return new PaintError('Les paramètres de peinture ne sont pas valides.', false)
  return new PaintError('Confirmation non reçue. Réessayez la même opération.', true)
}
async function rejectMutation(eventKey: string, error: { code?: string; message?: string }): Promise<never> {
  const failure = paintError(error)
  if (failure.retryable) schedulePendingMutationReconciliation()
  else await forgetPendingMutation(eventKey)
  throw failure
}
function fromRow(row: { version: number; paint_mode: string; paint_color: string | null; paint_finish: string }) {
  return parseRockAppearance({ version: row.version, mode: row.paint_mode, color: row.paint_color, finish: row.paint_finish })
}
function requireOnline() { if (!navigator.onLine) throw new PaintError('Reconnectez-vous pour confirmer cette opération.', false) }
async function userId() { const { data } = await supabase.auth.getSession(); return data.session?.user.id ?? null }
export const paintServices: PaintServices = {
  userId,
  async load(rockId) {
    requireOnline()
    const owner = await userId()
    if (!owner) throw new PaintError('Votre session doit être vérifiée.', false)
    const [appearance, feature, unlock, wallet, rock] = await Promise.all([
      supabase.from('rock_appearance').select('*').eq('user_rock_id', rockId).single(),
      supabase.from('feature_catalog').select('name,description,price_lithons,active').eq('id', PAINT_FEATURE_ID).single(),
      supabase.from('rock_feature_unlocks').select('acquired_at').eq('user_rock_id', rockId).eq('feature_id', PAINT_FEATURE_ID).maybeSingle(),
      supabase.from('wallets').select('balance').eq('user_id', owner).single(),
      supabase.from('user_rocks').select('id').eq('id', rockId).eq('user_id', owner).is('discarded_at', null).single(),
    ])
    if (appearance.error || feature.error || unlock.error || wallet.error || rock.error) throw new PaintError('La peinture n’a pas pu être synchronisée.', true)
    return { userId: owner, rockId, appearance: fromRow(appearance.data), unlocked: !!unlock.data,
      feature: { name: feature.data.name, description: feature.data.description ?? '', price: feature.data.price_lithons, active: feature.data.active }, balance: wallet.data.balance }
  },
  async purchase(rockId, eventKey) {
    requireOnline()
    const args = { p_user_rock_id: rockId, p_feature_id: PAINT_FEATURE_ID, p_event_key: eventKey }
    await rememberPendingMutation('purchase_rock_feature_unlock', eventKey, args)
    const { data, error } = await supabase.rpc('purchase_rock_feature_unlock', args).single()
    if (error || !data) return rejectMutation(eventKey, error ?? {})
    if (data.user_rock_id !== rockId || data.feature_id !== PAINT_FEATURE_ID) return rejectMutation(eventKey, { code: '22023' })
    await forgetPendingMutation(eventKey)
    return { balance: data.balance }
  },
  async save(rockId, appearance, eventKey) {
    requireOnline()
    const valid = parseRockAppearance(appearance)
    const args = { p_user_rock_id: rockId, p_paint_mode: valid.mode, p_paint_color: valid.color!, p_paint_finish: valid.finish, p_event_key: eventKey }
    await rememberPendingMutation('set_rock_appearance', eventKey, args)
    const { data, error } = await supabase.rpc('set_rock_appearance', args).single()
    if (error || !data) return rejectMutation(eventKey, error ?? {})
    if (data.user_rock_id !== rockId) return rejectMutation(eventKey, { code: '22023' })
    await forgetPendingMutation(eventKey)
    return fromRow(data)
  },
}
