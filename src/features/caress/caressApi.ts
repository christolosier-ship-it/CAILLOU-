import { supabase } from '../../lib/supabase/client'
import type { CaressMutationResult, RegisterCaressInput, RegisterCaressMutation } from './caressTypes'

export class CaressMutationError extends Error {
  constructor(
    message: string,
    readonly kind: 'rate-limited' | 'session' | 'ownership' | 'unknown',
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'CaressMutationError'
  }
}

function translateCaressError(error: { code?: string; message: string }) {
  if (error.message.includes('caress_rate_limited')) {
    return new CaressMutationError('Deux caresses ont été présentées trop rapidement.', 'rate-limited', true)
  }

  if (error.message.includes('active_owned_rock_required')) {
    return new CaressMutationError('Ce caillou n’est plus actif pour cette session.', 'ownership', false)
  }

  if (
    error.message.includes('authentication_required')
    || error.message.includes('permission denied for function register_caress')
    || error.code === 'PGRST301'
  ) {
    return new CaressMutationError('Votre session doit être vérifiée avant une nouvelle caresse.', 'session', false)
  }

  return new CaressMutationError('La confirmation serveur n’est pas arrivée.', 'unknown', true)
}

export const registerCaress: RegisterCaressMutation = async ({
  userRockId,
  eventKey,
}: RegisterCaressInput): Promise<CaressMutationResult> => {
  const { data, error } = await supabase.rpc('register_caress', {
    p_user_rock_id: userRockId,
    p_event_key: eventKey,
  })

  if (error) throw translateCaressError(error)

  const result = data?.[0]
  if (!result) throw new CaressMutationError('La réponse serveur est incomplète.', 'unknown', true)

  return {
    balance: result.balance,
    caressCount: result.caress_count,
    lithonsGenerated: result.lithons_generated,
  }
}
