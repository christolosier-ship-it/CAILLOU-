import { supabase } from '../../lib/supabase/client'
import { forgetPendingMutation, rememberPendingMutation, schedulePendingMutationReconciliation } from '../../pwa/pendingMutations'
import { parseFloorMaterial, validFloorAssetPath } from './floorRules'
import type { FloorServices, FloorSnapshot } from './floorTypes'

export class FloorError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); this.name = 'FloorError' }
}
export function floorError(error: { code?: string; message?: string }) {
  const message = error.message ?? ''
  if (message.includes('floor_already_owned')) return new FloorError('Ce sol est déjà possédé par votre compte.', false)
  if (message.includes('insufficient_lithons')) return new FloorError('Votre solde est insuffisant.', false)
  if (message.includes('floor_unavailable')) return new FloorError('Ce sol n’est plus disponible à l’achat.', false)
  if (message.includes('floor_not_owned')) return new FloorError('Ce sol doit être acquis avant d’être sélectionné.', false)
  if (error.code === '42501') return new FloorError('La session ou le caillou actif doit être vérifié.', false)
  if (error.code === '22023' || error.code === '22004') return new FloorError('Cette opération n’est plus valide. Actualisez la Boutique.', false)
  return new FloorError('Confirmation non reçue. Réessayez la même opération sans double débit.', true)
}
async function userId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}
async function load(userRockId: string): Promise<FloorSnapshot> {
  const owner = await userId()
  if (!owner) throw new FloorError('Votre session doit être vérifiée.', false)
  const [catalog, owned, rock] = await Promise.all([
    supabase.from('floors').select('*').order('sort_order').order('id'),
    supabase.from('user_floors').select('floor_id, acquired_at').eq('user_id', owner),
    supabase.from('user_rocks').select('floor_id').eq('id', userRockId).eq('user_id', owner).is('discarded_at', null).single(),
  ])
  if (catalog.error || owned.error || rock.error) throw new FloorError('Les sols n’ont pas pu être synchronisés.', true)
  const ownership = new Map(owned.data.map((row) => [row.floor_id, row.acquired_at]))
  return {
    userId: owner, userRockId, selectedId: rock.data.floor_id,
    items: catalog.data.map((row) => ({
      id: row.id, name: row.name, description: row.description, priceLithons: row.price_lithons,
      active: row.active, acquiredAt: ownership.get(row.id) ?? null,
      previewPath: validFloorAssetPath(row.preview_path) ? row.preview_path : null,
      material: parseFloorMaterial(row.material),
    })),
  }
}
export const floorServices: FloorServices = {
  userId, load,
  async purchase(floorId, eventKey) {
    if (!navigator.onLine) throw new FloorError('Reconnectez-vous pour acheter un sol.', false)
    const args = { p_floor_id: floorId, p_event_key: eventKey }
    await rememberPendingMutation('purchase_floor', eventKey, args)
    const { data, error } = await supabase.rpc('purchase_floor', args).single()
    if (error || !data) {
      const failure = floorError(error ?? {})
      if (!failure.retryable) await forgetPendingMutation(eventKey)
      else schedulePendingMutationReconciliation()
      throw failure
    }
    await forgetPendingMutation(eventKey)
    return { balance: data.balance }
  },
  async select(userRockId, floorId, eventKey) {
    if (!navigator.onLine) throw new FloorError('Reconnectez-vous pour changer de sol.', false)
    const args = { p_user_rock_id: userRockId, p_floor_id: floorId, p_event_key: eventKey }
    await rememberPendingMutation('select_floor', eventKey, args)
    const { data, error } = await supabase.rpc('select_floor', args).single()
    if (error || !data) {
      const failure = floorError(error ?? {})
      if (!failure.retryable) await forgetPendingMutation(eventKey)
      else schedulePendingMutationReconciliation()
      throw failure
    }
    await forgetPendingMutation(eventKey)
    return { floorId: data.floor_id }
  },
}
