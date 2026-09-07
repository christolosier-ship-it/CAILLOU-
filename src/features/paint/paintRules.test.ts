import { describe, expect, it } from 'vitest'
import { NATURAL_APPEARANCE, PAINT_FINISHES, PAINT_PALETTE, normalizePaintColor, paintCacheKey, paintDraftReducer, parseRockAppearance, sameAppearance } from './paintRules'

describe('paint appearance contract', () => {
  it('normalizes six-digit colors and rejects CSS/alpha/invalid input', () => {
    expect(normalizePaintColor('#ABCDEF')).toBe('#abcdef')
    for (const value of ['red', '#fff', '#12345678', ' #123456', '#gg0000', null, 1]) expect(normalizePaintColor(value)).toBeNull()
    for (const value of PAINT_PALETTE) expect(normalizePaintColor(value.color)).toBe(value.color)
  })
  it('has explicit versioned natural and bounded solid finishes', () => {
    expect(parseRockAppearance(NATURAL_APPEARANCE)).toEqual(NATURAL_APPEARANCE)
    for (const finish of PAINT_FINISHES) expect(parseRockAppearance({ version: 1, mode: 'solid', color: '#ABCDEF', finish: finish.id }).color).toBe('#abcdef')
    for (const value of [{ ...NATURAL_APPEARANCE, color: '#ffffff' }, { ...NATURAL_APPEARANCE, version: 2 }, { version: 1, mode: 'solid', color: '#ffffff', finish: 'metallic' }]) expect(() => parseRockAppearance(value)).toThrow()
    expect(PAINT_FINISHES.map((f) => f.roughness)).toEqual([0.9, 0.48, 0.18])
  })
  it('keeps a preview separate until confirmed, and cancels to the canonical state', () => {
    const solid = parseRockAppearance({ version: 1, mode: 'solid', color: '#ffffff', finish: 'matte' })
    const state = { canonical: NATURAL_APPEARANCE, draft: null }
    const preview = paintDraftReducer(state, { type: 'preview', appearance: solid })
    expect(preview.canonical).toBe(NATURAL_APPEARANCE)
    expect(paintDraftReducer(preview, { type: 'cancel' })).toEqual(state)
    expect(paintDraftReducer(preview, { type: 'confirmed', appearance: solid })).toEqual({ canonical: solid, draft: null })
    expect(sameAppearance(solid, { ...solid })).toBe(true)
    expect(sameAppearance(solid, NATURAL_APPEARANCE)).toBe(false)
  })
  it('separates cache by account and rock', () => {
    expect(new Set([paintCacheKey('A', '1'), paintCacheKey('B', '1'), paintCacheKey('A', '2')]).size).toBe(3)
  })
})
