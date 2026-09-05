import { describe, expect, it } from 'vitest'

import { parseAccessoryBudget, parseAccessoryCollision } from './accessoryAssetContract'

describe('V2-03 accessory collision contract', () => {
  it('parses a render hull descriptor', () => {
    expect(parseAccessoryCollision({ strategy: 'hull', geometrySource: 'render' })).toEqual({
      strategy: 'hull',
      geometrySource: 'render',
      proxyPath: null,
    })
  })

  it('parses a dedicated collision proxy', () => {
    expect(parseAccessoryCollision({
      strategy: 'proxy',
      geometrySource: 'proxy',
      proxyPath: '/assets/accessories/garden-gnome/collider.glb',
    })).toEqual({
      strategy: 'proxy',
      geometrySource: 'proxy',
      proxyPath: '/assets/accessories/garden-gnome/collider.glb',
    })
  })

  it('allows compound and simplified strategies to consume prepared proxies', () => {
    expect(parseAccessoryCollision({
      strategy: 'compound',
      geometrySource: 'proxy',
      proxyPath: '/assets/accessories/traffic-cone/collider.glb',
    })?.geometrySource).toBe('proxy')
    expect(parseAccessoryCollision({
      strategy: 'simplified',
      geometrySource: 'proxy',
      proxyPath: '/assets/accessories/chicken/collider.glb',
    })?.proxyPath).toBe('/assets/accessories/chicken/collider.glb')
  })

  it.each([
    [{ strategy: 'mesh' }],
    [{ strategy: 'proxy', geometrySource: 'proxy' }],
    [{ strategy: 'compound', geometrySource: 'proxy' }],
    [{ strategy: 'simplified', geometrySource: 'proxy' }],
    [{ strategy: 'proxy', geometrySource: 'render', proxyPath: '/assets/accessories/x/collider.glb' }],
    [{ strategy: 'hull', geometrySource: 'render', proxyPath: '/assets/accessories/x/collider.glb' }],
    [{ strategy: 'hull', proxyPath: '../collider.glb' }],
  ])('rejects an invalid collision descriptor %#', (value) => {
    expect(parseAccessoryCollision(value)).toBeNull()
  })
})

describe('V2-03 accessory budget contract', () => {
  it('requires a positive measured runtime model size', () => {
    expect(parseAccessoryBudget({
      runtimeModelBytes: 5241420,
      maxTextureDimension: 2048,
      largestTextureBytes: 984321,
    })).toEqual({
      runtimeModelBytes: 5241420,
      maxTextureDimension: 2048,
      largestTextureBytes: 984321,
    })
  })

  it.each([
    [{}],
    [{ runtimeModelBytes: 0 }],
    [{ runtimeModelBytes: -1 }],
    [{ runtimeModelBytes: 1000, maxTextureDimension: 0 }],
    [{ runtimeModelBytes: 1000, largestTextureBytes: '1000' }],
  ])('rejects invalid budget metadata %#', (value) => {
    expect(parseAccessoryBudget(value)).toBeNull()
  })
})
