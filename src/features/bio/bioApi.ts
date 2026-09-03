import { supabase } from '../../lib/supabase/client'
import type { LoadRockBioSnapshot, RockBioSnapshot } from './bioTypes'

export class BioSnapshotError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BioSnapshotError'
  }
}

export const loadRockBioSnapshot: LoadRockBioSnapshot = async (userRockId): Promise<RockBioSnapshot> => {
  const [walletResult, progressResult, ownershipResult, equippedResult, unlockResult] = await Promise.all([
    supabase.from('wallets').select('balance, lifetime_earned, lifetime_spent').single(),
    supabase
      .from('rock_progress')
      .select('caress_count, cleaning_count, lithons_generated')
      .eq('user_rock_id', userRockId)
      .single(),
    supabase.from('user_accessories').select('accessory_id'),
    supabase.from('equipped_accessories').select('id').eq('user_rock_id', userRockId),
    supabase.from('user_feature_unlocks').select('feature_id'),
  ])

  if (walletResult.error || !walletResult.data) {
    throw new BioSnapshotError('Le registre des Lithons n’a pas pu être relu.')
  }
  if (progressResult.error || !progressResult.data) {
    throw new BioSnapshotError('Les statistiques du caillou ne sont pas disponibles.')
  }
  if (ownershipResult.error) {
    throw new BioSnapshotError('Votre collection d’accessoires n’a pas pu être vérifiée.')
  }
  if (equippedResult.error) {
    throw new BioSnapshotError('La composition active n’a pas pu être vérifiée.')
  }
  if (unlockResult.error) {
    throw new BioSnapshotError('Vos autorisations permanentes n’ont pas pu être vérifiées.')
  }

  const unlocks = unlockResult.data ?? []
  return {
    balance: walletResult.data.balance,
    lifetimeEarned: walletResult.data.lifetime_earned,
    lifetimeSpent: walletResult.data.lifetime_spent,
    caressCount: progressResult.data.caress_count,
    cleaningCount: progressResult.data.cleaning_count,
    lithonsGenerated: progressResult.data.lithons_generated,
    ownedAccessoryCount: (ownershipResult.data ?? []).length,
    equippedAccessoryCount: (equippedResult.data ?? []).length,
    permanentUnlockCount: unlocks.length,
    rockMovementUnlocked: unlocks.some(({ feature_id }) => feature_id === 'rock_movement'),
  }
}
