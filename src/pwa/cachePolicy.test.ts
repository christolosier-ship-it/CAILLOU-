import { describe, expect, it } from 'vitest'

import {
  CODE_CACHE_MAX_ENTRIES,
  LAZY_CODE_RUNTIME_PATTERN,
  MODEL_CACHE_MAX_ENTRIES,
  MODEL_RUNTIME_PATTERN,
  PREVIEW_CACHE_MAX_ENTRIES,
  PREVIEW_RUNTIME_PATTERN,
  boundedCompanionAssetList,
} from './cachePolicy'

describe('step 12 PWA cache policy', () => {
  it('keeps every runtime cache bounded', () => {
    expect(CODE_CACHE_MAX_ENTRIES).toBe(24)
    expect(MODEL_CACHE_MAX_ENTRIES).toBe(12)
    expect(PREVIEW_CACHE_MAX_ENTRIES).toBe(48)
  })

  it('learns lazy code after first use instead of treating the entry chunk as runtime code', () => {
    expect(LAZY_CODE_RUNTIME_PATTERN.test('/assets/Step11Pedestal-abcd.js')).toBe(true)
    expect(LAZY_CODE_RUNTIME_PATTERN.test('/assets/index-abcd.js')).toBe(false)
  })

  it('caches runtime models without matching arbitrary files', () => {
    expect(MODEL_RUNTIME_PATTERN.test('/assets/rocks/rock-001/model.glb')).toBe(true)
    expect(MODEL_RUNTIME_PATTERN.test('/assets/accessories/round-glasses/model.glb')).toBe(true)
    expect(MODEL_RUNTIME_PATTERN.test('/assets/rocks/rock-001/source.blend')).toBe(false)
  })

  it('separates previews from GLB models', () => {
    expect(PREVIEW_RUNTIME_PATTERN.test('/assets/rock-previews/rock-001.png')).toBe(true)
    expect(PREVIEW_RUNTIME_PATTERN.test('/assets/accessory-previews/round-glasses.webp')).toBe(true)
    expect(PREVIEW_RUNTIME_PATTERN.test('/assets/rocks/rock-001/model.glb')).toBe(false)
  })

  it('warms at most the active rock plus eight equipped assets', () => {
    const urls = Array.from({ length: 14 }, (_, index) => `/asset-${index}.glb`)
    expect(boundedCompanionAssetList(urls)).toHaveLength(9)
    expect(boundedCompanionAssetList(['/a.glb', '/a.glb', '/b.glb'])).toEqual(['/a.glb', '/b.glb'])
  })
})
