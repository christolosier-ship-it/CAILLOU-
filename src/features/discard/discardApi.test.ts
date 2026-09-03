import { describe, expect, it } from 'vitest'

import { toDiscardRockError } from './discardApi'

describe('discard error mapping', () => {
  it('marks an uncertain response retryable so the same event key can be reused', () => {
    const error = toDiscardRockError({ message: 'network response missing' })
    expect(error.kind).toBe('unknown')
    expect(error.retryable).toBe(true)
  })

  it('does not retry an ownership rejection', () => {
    const error = toDiscardRockError({ message: 'owned_rock_required' })
    expect(error.kind).toBe('ownership')
    expect(error.retryable).toBe(false)
  })
})
