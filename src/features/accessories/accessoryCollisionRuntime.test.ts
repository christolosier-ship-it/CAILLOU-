import { describe, expect, it } from 'vitest'

import { resolveAccessoryCollisionRuntime } from './accessoryCollisionRuntime'

describe('V2-03 accessory collision runtime plan', () => {
  it('keeps the V1 automatic hull path', () => {
    expect(resolveAccessoryCollisionRuntime({ strategy: 'hull', geometrySource: 'render' }, 'cuboid')).toEqual({
      mode: 'auto',
      collider: 'hull',
      strategy: 'hull',
    })
  })

  it('uses a prepared proxy as manual convex geometry', () => {
    expect(resolveAccessoryCollisionRuntime({
      strategy: 'simplified',
      geometrySource: 'proxy',
      proxyPath: '/assets/accessories/chicken/collider.glb',
    }, 'hull')).toEqual({
      mode: 'manual',
      collider: false,
      strategy: 'simplified',
      geometrySource: 'proxy',
      proxyPath: '/assets/accessories/chicken/collider.glb',
    })
  })

  it('allows a compound made from prepared render meshes', () => {
    expect(resolveAccessoryCollisionRuntime({ strategy: 'compound', geometrySource: 'render' }, 'hull')).toEqual({
      mode: 'manual',
      collider: false,
      strategy: 'compound',
      geometrySource: 'render',
      proxyPath: null,
    })
  })

  it('falls back to the legacy physics collider if metadata is invalid', () => {
    expect(resolveAccessoryCollisionRuntime({ strategy: 'proxy', geometrySource: 'proxy' }, 'ball')).toEqual({
      mode: 'auto',
      collider: 'ball',
      strategy: 'ball',
    })
  })
})
