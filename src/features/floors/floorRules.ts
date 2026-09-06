import { PEDESTAL_FLOOR_COLOR } from '../placement/pedestalFloor'
import type { FloorItem, FloorMaterial, FloorSnapshot } from './floorTypes'

export const BASE_FLOOR_MATERIAL: FloorMaterial = {
  version: 1, color: PEDESTAL_FLOOR_COLOR, roughness: 0.96, metalness: 0.02,
  repeat: [1, 1], normalScale: 0,
}
const ASSET_PATH = /^\/assets\/floors\/[a-z0-9-]+\/v[0-9]+\/(?:color|normal|roughness|preview)\.webp$/
export function validFloorAssetPath(value: unknown): value is string {
  return typeof value === 'string' && ASSET_PATH.test(value)
}
export function parseFloorMaterial(value: unknown): FloorMaterial {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Matériau de sol invalide.')
  const v = value as Record<string, unknown>
  const unit = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1
  if (v.version !== 1 || typeof v.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(v.color)
    || !unit(v.roughness) || !unit(v.metalness) || !unit(v.normalScale)
    || !Array.isArray(v.repeat) || v.repeat.length !== 2
    || !v.repeat.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0.25 && n <= 16)) {
    throw new Error('Matériau de sol invalide.')
  }
  for (const key of ['colorMap', 'normalMap', 'roughnessMap']) {
    if (v[key] !== undefined && !validFloorAssetPath(v[key])) throw new Error('Texture de sol invalide.')
  }
  return {
    version: 1, color: v.color, roughness: v.roughness, metalness: v.metalness,
    repeat: [v.repeat[0] as number, v.repeat[1] as number], normalScale: v.normalScale,
    ...(v.colorMap ? { colorMap: v.colorMap as string } : {}),
    ...(v.normalMap ? { normalMap: v.normalMap as string } : {}),
    ...(v.roughnessMap ? { roughnessMap: v.roughnessMap as string } : {}),
  }
}
export function selectedFloorMaterial(snapshot: FloorSnapshot | null): FloorMaterial {
  const item = snapshot?.items.find((floor) => floor.id === snapshot.selectedId && floor.acquiredAt)
  if (!item) return BASE_FLOOR_MATERIAL
  try { return parseFloorMaterial(item.material) } catch { return BASE_FLOOR_MATERIAL }
}
export function floorAction(item: FloorItem, selectedId: string, balance: number) {
  if (item.acquiredAt) return item.id === selectedId ? 'selected' : 'select'
  if (!item.active) return 'unavailable'
  if (item.priceLithons === 0) return 'free'
  return balance < item.priceLithons ? 'insufficient' : 'buy'
}
export function floorCacheKey(userId: string, userRockId: string) {
  return `floors:v1:${userId}:${userRockId}`
}
