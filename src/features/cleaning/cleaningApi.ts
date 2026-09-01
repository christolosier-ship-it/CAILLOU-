import { supabase } from '../../lib/supabase/client'
import type { CleaningSnapshot, RegisterCleaningInput } from './cleaningTypes'

export class CleaningMutationError extends Error {
  readonly retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)
    this.name = 'CleaningMutationError'
    this.retryable = retryable
  }
}

function toCleaningError(error: { message?: string; code?: string }) {
  const detail = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()

  if (detail.includes('surface_already_clean')) {
    return new CleaningMutationError('La surface est déjà dans un état réglementaire.', false)
  }
  if (detail.includes('active_owned_rock_required') || detail.includes('42501')) {
    return new CleaningMutationError('Le registre ne confirme plus ce caillou comme actif.', false)
  }
  if (detail.includes('mutation_in_progress') || detail.includes('40001')) {
    return new CleaningMutationError('Le nettoyage est encore en cours de confirmation. Réessayez avec la même opération.', true)
  }

  return new CleaningMutationError(
    'La confirmation serveur n’est pas arrivée. Le même nettoyage peut être renvoyé sans doubler la statistique.',
    true,
  )
}

export async function registerCleaning(input: RegisterCleaningInput): Promise<CleaningSnapshot> {
  const { data, error } = await supabase.rpc('register_cleaning', {
    p_user_rock_id: input.userRockId,
    p_event_key: input.eventKey,
  }).single()

  if (error) throw toCleaningError(error)
  if (!data) throw new CleaningMutationError('Le registre n’a retourné aucune confirmation de nettoyage.', true)

  return {
    lastCleanedAt: data.last_cleaned_at,
    cleaningCount: data.cleaning_count,
  }
}
