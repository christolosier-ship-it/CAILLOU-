import { describe, expect, it } from 'vitest'
import source from '../../../scripts/floors/catalog.json'
import { BASE_FLOOR_MATERIAL, floorAction, floorCacheKey, parseFloorMaterial, selectedFloorMaterial } from './floorRules'
import type { FloorItem, FloorSnapshot } from './floorTypes'
import { FLOOR_CACHE_MAX_ENTRIES, FLOOR_RUNTIME_PATTERN, PREVIEW_RUNTIME_PATTERN } from '../../pwa/cachePolicy'

const catalog = source.floors.map((item) => ({ ...item, material: parseFloorMaterial(item.material), acquiredAt: null })) as FloorItem[]
describe('floor catalog and material contract', () => {
  it('provides the eight requested materials with safe local paths and bounded textures', () => {
    expect(catalog.map((item) => item.id)).toEqual(['moquette','parquet-chene','beton-cire','terre','carrelage','herbe','marbre','neige'])
    for (const item of catalog) {
      const material = parseFloorMaterial(item.material)
      for (const path of [material.colorMap, material.normalMap, material.roughnessMap]) {
        expect(path).toBeTruthy()
        expect(FLOOR_RUNTIME_PATTERN.test(path!)).toBe(true)
        const budget = source.floors.find((floor) => floor.id === item.id)!.budget
        expect(Math.max(...Object.values(budget.files).map((file) => file.bytes))).toBeLessThan(1024 * 1024)
      }
      expect(PREVIEW_RUNTIME_PATTERN.test(item.previewPath!)).toBe(true)
    }
    expect(FLOOR_CACHE_MAX_ENTRIES).toBeLessThanOrEqual(12)
    expect(FLOOR_RUNTIME_PATTERN.test('https://x/assets/floors/wood/v1/model.glb')).toBe(false)
  })
  it('rejects malformed, oversized and remote descriptors', () => {
    for (const value of [null, {}, { ...BASE_FLOOR_MATERIAL, version: 2 },
      { ...BASE_FLOOR_MATERIAL, repeat: [NaN, 4] }, { ...BASE_FLOOR_MATERIAL, repeat: [100, 4] },
      { ...BASE_FLOOR_MATERIAL, normalScale: -1 }, { ...BASE_FLOOR_MATERIAL, colorMap: 'https://untrusted.test/a.webp' },
      { ...BASE_FLOOR_MATERIAL, colorMap: '/assets/floors/../secrets' }]) {
      expect(() => parseFloorMaterial(value)).toThrow()
    }
  })
  it('separates ownership, selection, free and insufficient states', () => {
    const item = { ...catalog[0]!, acquiredAt: null }
    expect(floorAction(item, 'base', 0)).toBe('insufficient')
    expect(floorAction(item, 'base', 1000)).toBe('buy')
    expect(floorAction({ ...item, priceLithons: 0 }, 'base', 0)).toBe('free')
    expect(floorAction({ ...item, acquiredAt: 'now' }, 'base', 0)).toBe('select')
    expect(floorAction({ ...item, acquiredAt: 'now' }, item.id, 0)).toBe('selected')
    expect(floorAction({ ...item, active: false }, 'base', 1000)).toBe('unavailable')
  })
  it('uses the historical material for absent, unowned or corrupt selections', () => {
    expect(selectedFloorMaterial(null)).toEqual(BASE_FLOOR_MATERIAL)
    const snapshot: FloorSnapshot = { userId: 'a', userRockId: 'r', selectedId: catalog[0]!.id, items: [{ ...catalog[0]!, acquiredAt: null }] }
    expect(selectedFloorMaterial(snapshot)).toEqual(BASE_FLOOR_MATERIAL)
    snapshot.items[0]!.acquiredAt = 'now'
    expect(selectedFloorMaterial(snapshot)).toEqual(catalog[0]!.material)
    expect(floorCacheKey('a', 'r')).not.toBe(floorCacheKey('b', 'r'))
    expect(floorCacheKey('a', 'r')).not.toBe(floorCacheKey('a', 'next'))
  })
})
