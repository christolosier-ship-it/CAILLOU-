import { describe, expect, it } from 'vitest'

import { normalizeRockName, validateRockName } from './adoptionRules'

describe('rock naming rules', () => {
  it('normalizes surrounding and repeated whitespace', () => {
    expect(normalizeRockName('  Jean   Pierre  ')).toBe('Jean Pierre')
  })

  it('accepts a short unicode name', () => {
    expect(validateRockName('Émile')).toBeNull()
  })

  it('rejects an empty or overlong name', () => {
    expect(validateRockName('   ')).toBe('Donnez un nom à votre caillou.')
    expect(validateRockName('a'.repeat(33))).toBe('Maximum 32 caractères.')
  })

  it('rejects control characters before normalization', () => {
    expect(validateRockName('Bernard\nDeux')).toBe('Le nom contient un caractère non autorisé.')
  })
})
