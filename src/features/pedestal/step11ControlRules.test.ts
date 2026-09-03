import { describe, expect, it } from 'vitest'

import { shouldBlockStep11Controls } from './step11ControlRules'

describe('Step 11 control exclusivity', () => {
  it('allows Bio and Jeter only in a free orbit state', () => {
    expect(shouldBlockStep11Controls('pedestal-shell', false, false, false)).toBe(false)
    expect(shouldBlockStep11Controls('pedestal-shell is-placement-mode', false, false, false)).toBe(true)
    expect(shouldBlockStep11Controls('pedestal-shell is-caress-mode', false, false, false)).toBe(true)
    expect(shouldBlockStep11Controls('pedestal-shell', true, false, false)).toBe(true)
    expect(shouldBlockStep11Controls('pedestal-shell', false, true, false)).toBe(true)
    expect(shouldBlockStep11Controls('pedestal-shell', false, false, true)).toBe(true)
  })
})
