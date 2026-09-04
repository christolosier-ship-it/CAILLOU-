import type { RockMovementPermitSnapshot } from './rockMovementTypes'

export function permitSnapshotForRock(
  snapshot: RockMovementPermitSnapshot | null,
  userRockId: string,
) {
  return snapshot?.userRockId === userRockId ? snapshot : null
}

export function permitUnlockedForRock(
  snapshot: RockMovementPermitSnapshot | null,
  userRockId: string,
) {
  return permitSnapshotForRock(snapshot, userRockId)?.unlockedAt != null
}
