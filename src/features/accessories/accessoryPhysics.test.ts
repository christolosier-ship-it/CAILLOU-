import { describe, expect, it } from 'vitest'

import { parseAccessoryPhysics } from './accessoryPhysics'

describe('accessory physics contract', () => {
  it('keeps wearable accessories dynamic with safe defaults', () => {
    expect(parseAccessoryPhysics({ enabled: true, collider: 'convexHull' }, 'visage')).toMatchObject({
      enabled: true,
      dynamic: true,
      collider: 'hull',
      gravityScale: 0.9,
      ccd: true,
    })
  })

  it('keeps socles fixed unless metadata explicitly opts into dynamics', () => {
    expect(parseAccessoryPhysics({ enabled: true, collider: 'cuboid' }, 'socle')).toMatchObject({
      enabled: true,
      dynamic: false,
      collider: 'cuboid',
      gravityScale: 0,
    })
  })

  it('clamps malformed coefficients to conservative values', () => {
    const config = parseAccessoryPhysics({
      mass: 999,
      friction: -2,
      restitution: 5,
      linearDamping: 100,
      angularDamping: -3,
      gravityScale: 9,
    }, 'tenue')

    expect(config.mass).toBe(12)
    expect(config.friction).toBe(0)
    expect(config.restitution).toBe(1)
    expect(config.linearDamping).toBe(20)
    expect(config.angularDamping).toBe(0)
    expect(config.gravityScale).toBe(2)
  })

})
