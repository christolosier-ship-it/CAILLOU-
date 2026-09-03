import { describe, expect, it } from 'vitest'

import {
  normalizeUsername,
  resolveAuthenticatedDestination,
  validatePassword,
  validateUsername,
} from './authRules'

describe('auth rules', () => {
  it('normalise spaces and case without changing display case', () => {
    expect(normalizeUsername('  Pierre   Quartz  ')).toEqual({
      display: 'Pierre Quartz',
      normalized: 'pierre quartz',
    })
  })

  it('accepts a human pseudo and rejects unsafe edge punctuation', () => {
    expect(validateUsername('Émile_42')).toBeNull()
    expect(validateUsername('-Émile')).not.toBeNull()
  })

  it('requires a password of at least ten characters', () => {
    expect(validatePassword('tropcourt')).not.toBeNull()
    expect(validatePassword('un-mot-de-passe-long')).toBeNull()
  })

  it('routes never-adopted, discarded and active accounts distinctly', () => {
    expect(resolveAuthenticatedDestination(false, false)).toBe('showroom')
    expect(resolveAuthenticatedDestination(false, true)).toBe('empty')
    expect(resolveAuthenticatedDestination(true, true)).toBe('socle')
  })
})
