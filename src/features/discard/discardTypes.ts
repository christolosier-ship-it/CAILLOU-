export interface DiscardRockInput {
  userRockId: string
  eventKey: string
}

export interface DiscardRockResult {
  userRockId: string
  discardedAt: string
}

export type DiscardRockMutation = (input: DiscardRockInput) => Promise<DiscardRockResult>
