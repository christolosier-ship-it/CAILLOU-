import { describe, expect, it } from 'vitest'

import { toAccessoryPurchaseError } from './accessoryApi'

describe('accessory purchase error contract', () => {
  it.each([
    ['accessory_already_owned', 'already-owned', false],
    ['insufficient_lithons', 'insufficient', false],
    ['accessory_unavailable', 'unavailable', false],
    ['authentication_required', 'session', false],
    ['mutation_in_progress', 'in-progress', true],
  ] as const)('maps %s without trusting the browser', (message, kind, retryable) => {
    const error = toAccessoryPurchaseError({ message })
    expect(error.kind).toBe(kind)
    expect(error.retryable).toBe(retryable)
  })

  it('keeps an unknown network failure retryable for the same event key', () => {
    const error = toAccessoryPurchaseError({ message: 'network request failed' })
    expect(error.kind).toBe('unknown')
    expect(error.retryable).toBe(true)
  })
})
