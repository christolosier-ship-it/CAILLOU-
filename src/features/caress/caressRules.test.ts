import { describe, expect, it } from 'vitest'

import {
  CARESS_MIN_DIRECT_PX,
  CARESS_MIN_DURATION_MS,
  CARESS_MIN_PATH_PX,
  CARESS_MIN_SAMPLES,
  isValidCaress,
} from './caressRules'

describe('caress gesture rules', () => {
  it('accepts a continuous intentional stroke at the thresholds', () => {
    expect(isValidCaress({
      durationMs: CARESS_MIN_DURATION_MS,
      pathLengthPx: CARESS_MIN_PATH_PX,
      directDistancePx: CARESS_MIN_DIRECT_PX,
      sampleCount: CARESS_MIN_SAMPLES,
    })).toBe(true)
  })

  it.each([
    ['tap', { durationMs: 40, pathLengthPx: 0, directDistancePx: 0, sampleCount: 1 }],
    ['short movement', { durationMs: 300, pathLengthPx: 30, directDistancePx: 30, sampleCount: 5 }],
    ['jitter without displacement', { durationMs: 500, pathLengthPx: 80, directDistancePx: 8, sampleCount: 12 }],
    ['undersampled jump', { durationMs: 300, pathLengthPx: 80, directDistancePx: 80, sampleCount: 2 }],
  ])('rejects %s', (_label, metrics) => {
    expect(isValidCaress(metrics)).toBe(false)
  })
})
