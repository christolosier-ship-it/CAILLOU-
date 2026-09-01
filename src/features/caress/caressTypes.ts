export interface RockEconomySnapshot {
  balance: number
  caressCount: number
  cleaningCount: number
  lithonsGenerated: number
}

export interface CaressMutationResult {
  balance: number
  caressCount: number
  lithonsGenerated: number
}

export interface RegisterCaressInput {
  userRockId: string
  eventKey: string
}

export type RegisterCaressMutation = (input: RegisterCaressInput) => Promise<CaressMutationResult>
