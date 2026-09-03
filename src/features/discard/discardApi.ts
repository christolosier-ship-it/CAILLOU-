import { supabase } from '../../lib/supabase/client'
import type { DiscardRockMutation } from './discardTypes'

export type DiscardRockErrorKind = 'ownership' | 'session' | 'in-progress' | 'unknown'

export class DiscardRockError extends Error {
  constructor(message: string, readonly kind: DiscardRockErrorKind, readonly retryable: boolean) {
    super(message)
    this.name = 'DiscardRockError'
  }
}

export function toDiscardRockError(error: { code?: string; message?: string }) {
  const detail = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  if (detail.includes('owned_rock_required')) {
    return new DiscardRockError('Ce caillou n’est plus sous votre responsabilité.', 'ownership', false)
  }
  if (detail.includes('authentication_required') || detail.includes('permission denied') || error.code === 'PGRST301') {
    return new DiscardRockError('Votre session doit être vérifiée avant cette opération.', 'session', false)
  }
  if (detail.includes('mutation_in_progress') || error.code === '40001') {
    return new DiscardRockError('La mise à jour du registre est encore en cours. La même opération peut être renvoyée.', 'in-progress', true)
  }
  return new DiscardRockError('La confirmation serveur n’est pas arrivée. La même opération peut être renvoyée sans double archivage.', 'unknown', true)
}

export const discardActiveRock: DiscardRockMutation = async ({ userRockId, eventKey }) => {
  const { data, error } = await supabase
    .rpc('discard_active_rock', { p_user_rock_id: userRockId, p_event_key: eventKey })
    .single()

  if (error) throw toDiscardRockError(error)
  if (!data) {
    throw new DiscardRockError('Le registre n’a retourné aucune confirmation.', 'unknown', true)
  }

  return { userRockId: data.user_rock_id, discardedAt: data.discarded_at }
}
