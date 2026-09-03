export interface RockBioSnapshot {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  caressCount: number
  cleaningCount: number
  lithonsGenerated: number
  ownedAccessoryCount: number
  equippedAccessoryCount: number
  permanentUnlockCount: number
  rockMovementUnlocked: boolean
}

export type LoadRockBioSnapshot = (userRockId: string) => Promise<RockBioSnapshot>
