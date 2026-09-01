import { describe, expect, it } from 'vitest'

import {
  DUST_FULL_AFTER_MS,
  DUST_VISIBLE_AFTER_MS,
  getDustAmount,
  hasVisibleDust,
  isValidCleaning,
} from './cleaningRules'

describe('cleaningRules', () => {
  const adoptedAt = '2026-08-01T00:00:00.000Z'
  const adoptedMs = new Date(adoptedAt).getTime()

  it('keeps a newly adopted or freshly cleaned rock clean for one hour, then exposes cleaning immediately', () => {
    expect(getDustAmount(null, adoptedAt, adoptedMs + DUST_VISIBLE_AFTER_MS)).toBe(0)
    expect(hasVisibleDust(0)).toBe(false)

    const firstDust = getDustAmount(null, adoptedAt, adoptedMs + DUST_VISIBLE_AFTER_MS + 1)
    expect(firstDust).toBeGreaterThan(0)
    expect(hasVisibleDust(firstDust)).toBe(true)
  })

  it('accumulates dust progressively and reaches its cap after twelve hours', () => {
    const midpoint = DUST_VISIBLE_AFTER_MS + ((DUST_FULL_AFTER_MS - DUST_VISIBLE_AFTER_MS) / 2)
    expect(getDustAmount(null, adoptedAt, adoptedMs + midpoint)).toBeCloseTo(0.5)
    expect(getDustAmount(null, adoptedAt, adoptedMs + DUST_FULL_AFTER_MS)).toBe(1)
    expect(getDustAmount(null, adoptedAt, adoptedMs + DUST_FULL_AFTER_MS * 2)).toBe(1)
  })

  it('uses last_cleaned_at as the new accumulation baseline', () => {
    const cleanedAt = '2026-08-10T00:00:00.000Z'
    const cleanedMs = new Date(cleanedAt).getTime()
    expect(getDustAmount(cleanedAt, adoptedAt, cleanedMs + DUST_VISIBLE_AFTER_MS)).toBe(0)
    expect(getDustAmount(cleanedAt, adoptedAt, cleanedMs + DUST_VISIBLE_AFTER_MS + 1)).toBeGreaterThan(0)
  })

  it('accepts an intentional scrub and rejects taps or tiny jitter', () => {
    expect(isValidCleaning({ durationMs: 420, pathLengthPx: 120, spanPx: 46, sampleCount: 9 })).toBe(true)
    expect(isValidCleaning({ durationMs: 80, pathLengthPx: 0, spanPx: 0, sampleCount: 2 })).toBe(false)
    expect(isValidCleaning({ durationMs: 500, pathLengthPx: 95, spanPx: 8, sampleCount: 12 })).toBe(false)
  })
})
