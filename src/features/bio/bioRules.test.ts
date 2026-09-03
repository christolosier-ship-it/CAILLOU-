import { describe, expect, it } from 'vitest'

import { formatRockAge, lithonLabel } from './bioRules'

describe('Bio rules', () => {
  it('formats a reliable age without inventing observation time', () => {
    const adopted = '2026-09-01T08:00:00.000Z'
    const now = new Date('2026-09-03T10:00:00.000Z').getTime()
    expect(formatRockAge(adopted, now)).toBe('2 jours')
  })

  it('uses the official Lithon singular and plural', () => {
    expect(lithonLabel(1)).toBe('1 Lithon')
    expect(lithonLabel(42)).toBe('42 Lithons')
  })
})
