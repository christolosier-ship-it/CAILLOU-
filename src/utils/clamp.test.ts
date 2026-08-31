import { describe, expect, it } from 'vitest'

import { clamp } from './clamp'

describe('clamp', () => {
  it('keeps a value inside the requested interval', () => {
    expect(clamp(4, 0, 10)).toBe(4)
    expect(clamp(-2, 0, 10)).toBe(0)
    expect(clamp(18, 0, 10)).toBe(10)
  })

  it('rejects an inverted interval', () => {
    expect(() => clamp(1, 2, 0)).toThrow(RangeError)
  })
})
