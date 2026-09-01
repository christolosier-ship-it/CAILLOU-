import { describe, expect, it } from 'vitest'

import { formatLithons, getPurchaseAvailability } from './accessoryRules'

describe('accessory shop rules', () => {
  it('formats the Lithon unit without casino shorthand', () => {
    expect(formatLithons(0)).toBe('0 Lithons')
    expect(formatLithons(1)).toBe('1 Lithon')
    expect(formatLithons(90)).toBe('90 Lithons')
  })

  it('allows a fixed-price purchase only when the local snapshot is sufficient', () => {
    expect(getPurchaseAvailability({ balance: 90, priceLithons: 90, purchasedAt: null, pending: false }))
      .toEqual({ allowed: true, label: 'Acheter' })
    expect(getPurchaseAvailability({ balance: 89, priceLithons: 90, purchasedAt: null, pending: false }))
      .toEqual({ allowed: false, label: 'Solde insuffisant' })
  })

  it('never offers a second purchase for a permanently owned type', () => {
    expect(getPurchaseAvailability({
      balance: 900,
      priceLithons: 90,
      purchasedAt: '2026-09-01T12:00:00Z',
      pending: false,
    })).toEqual({ allowed: false, label: 'Acquis' })
  })
})
