import { supabase } from '../../lib/supabase/client'
import { DEFAULT_ROCK_POSE } from '../rockMovement/rockMovementRules'
import { normalizeRockName, validateRockName } from './adoptionRules'
import type { AdoptRockMutation } from './adoptionTypes'

function adoptionErrorMessage(code: string | undefined, message: string) {
  if (message.includes('active_rock_exists') || code === '23505') {
    return 'Un caillou actif est déjà associé à ce compte.'
  }
  if (message.includes('specimen_unavailable')) {
    return 'Ce spécimen n’est plus disponible à l’adoption.'
  }
  if (message.includes('invalid_rock_name') || code === '23514') {
    return 'Le nom proposé ne peut pas être enregistré.'
  }
  if (message.includes('mutation_in_progress') || code === '40001') {
    return 'L’adoption est encore en cours de validation. Réessayez dans un instant.'
  }
  return 'L’adoption n’a pas pu être confirmée. Vous pouvez réessayer sans risque de doublon.'
}

export const adoptRock: AdoptRockMutation = async ({ rock, name, eventKey }) => {
  const validation = validateRockName(name)
  if (validation) throw new Error(validation)
  const normalizedName = normalizeRockName(name)

  const { data, error } = await supabase
    .rpc('adopt_rock', {
      p_specimen_id: rock.id,
      p_name: normalizedName,
      p_event_key: eventKey,
    })
    .single()

  if (error || !data) {
    throw new Error(adoptionErrorMessage(error?.code, error?.message ?? 'missing adoption result'))
  }

  return {
    id: data.user_rock_id,
    specimenId: data.specimen_id as typeof rock.id,
    name: data.rock_name,
    adoptedAt: data.adopted_at,
    lastCleanedAt: null,
    posePosition: [...DEFAULT_ROCK_POSE.position],
    poseRotation: [...DEFAULT_ROCK_POSE.rotation],
    poseStabilizedAt: data.adopted_at,
  }
}