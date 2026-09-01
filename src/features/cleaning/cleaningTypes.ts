export interface CleaningSnapshot {
  lastCleanedAt: string
  cleaningCount: number
}

export interface RegisterCleaningInput {
  userRockId: string
  eventKey: string
}

export type RegisterCleaningMutation = (input: RegisterCleaningInput) => Promise<CleaningSnapshot>
