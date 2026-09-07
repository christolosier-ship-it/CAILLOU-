export type PaintFinish = 'matte' | 'satin' | 'glossy'
export type RockAppearance =
  | { version: 1; mode: 'natural'; color: null; finish: 'natural' }
  | { version: 1; mode: 'solid'; color: string; finish: PaintFinish }

export const NATURAL_APPEARANCE: RockAppearance = { version: 1, mode: 'natural', color: null, finish: 'natural' }
export const PAINT_FEATURE_ID = 'rock_paint'
export const PAINT_FINISHES = [
  { id: 'matte', label: 'Mate', roughness: 0.9 },
  { id: 'satin', label: 'Satinée', roughness: 0.48 },
  { id: 'glossy', label: 'Brillante', roughness: 0.18 },
] as const
export const PAINT_PALETTE = [
  { name: 'Ivoire', color: '#e5e1d8' }, { name: 'Graphite', color: '#343330' },
  { name: 'Ocre', color: '#a66f3f' }, { name: 'Terre cuite', color: '#a85545' },
  { name: 'Mousse', color: '#66705c' }, { name: 'Bleu ardoise', color: '#476b86' },
  { name: 'Prune', color: '#78546e' }, { name: 'Rose quartz', color: '#bd9190' },
] as const

export function normalizePaintColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null
}
export function parseRockAppearance(value: unknown): RockAppearance {
  if (!value || typeof value !== 'object') throw new Error('Apparence invalide.')
  const v = value as Record<string, unknown>
  if (v.version !== 1) throw new Error('Version d’apparence inconnue.')
  if (v.mode === 'natural' && v.color === null && v.finish === 'natural') return NATURAL_APPEARANCE
  const color = normalizePaintColor(v.color)
  if (v.mode !== 'solid' || !color || !PAINT_FINISHES.some((f) => f.id === v.finish)) throw new Error('Peinture invalide.')
  return { version: 1, mode: 'solid', color, finish: v.finish as PaintFinish }
}
export function sameAppearance(a: RockAppearance, b: RockAppearance) {
  return a.mode === b.mode && a.color === b.color && a.finish === b.finish
}
export function paintCacheKey(userId: string, rockId: string) { return `paint:v1:${userId}:${rockId}` }

export interface PaintDraftState { canonical: RockAppearance; draft: RockAppearance | null }
export type PaintDraftAction =
  | { type: 'preview'; appearance: RockAppearance }
  | { type: 'confirmed'; appearance: RockAppearance }
  | { type: 'synchronized'; appearance: RockAppearance }
  | { type: 'cancel' }
export function paintDraftReducer(state: PaintDraftState, action: PaintDraftAction): PaintDraftState {
  if (action.type === 'cancel') return { ...state, draft: null }
  if (action.type === 'confirmed') return { canonical: action.appearance, draft: null }
  if (action.type === 'synchronized') return { ...state, canonical: action.appearance }
  return { ...state, draft: parseRockAppearance(action.appearance) }
}
