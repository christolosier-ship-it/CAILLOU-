import { describe, expect, it } from 'vitest'

import {
  PEDESTAL_FLOOR_CENTER_Y,
  PEDESTAL_FLOOR_HALF_EXTENTS,
  PEDESTAL_FLOOR_SIZE,
  PEDESTAL_FLOOR_THICKNESS,
  PEDESTAL_FLOOR_TOP_Y,
} from './pedestalFloor'

describe('pedestal floor geometry', () => {
  it('keeps the visual and physical floor on the exact same finite square', () => {
    expect(PEDESTAL_FLOOR_SIZE).toBe(5.5)
    expect(PEDESTAL_FLOOR_HALF_EXTENTS).toEqual([2.75, 0.06, 2.75])
    expect(PEDESTAL_FLOOR_CENTER_Y + PEDESTAL_FLOOR_THICKNESS / 2).toBeCloseTo(PEDESTAL_FLOOR_TOP_Y, 8)
  })
})
