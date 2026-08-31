export type RockId = `rock-${string}`

export interface RockCatalogEntry {
  id: RockId
  catalogIndex: number
  label: string
  modelPath: string
  previewPath: string
}

export const ROCK_CATALOG: readonly RockCatalogEntry[] = Array.from({ length: 20 }, (_, offset) => {
  const catalogIndex = offset + 1
  const suffix = String(catalogIndex).padStart(3, '0')
  const labelIndex = String(catalogIndex).padStart(2, '0')
  const id = `rock-${suffix}` as RockId

  return {
    id,
    catalogIndex,
    label: `Spécimen ${labelIndex}`,
    modelPath: `/assets/rocks/${id}/model.glb`,
    previewPath: `/assets/rock-previews/${id}.png`,
  }
})

export function getRockCatalogEntry(catalogIndex: number) {
  const entry = ROCK_CATALOG[catalogIndex - 1]
  if (!entry) throw new Error(`Unknown rock catalog index: ${catalogIndex}`)
  return entry
}

export function getRelativeRockIndex(currentIndex: number, delta: number) {
  const catalogLength = ROCK_CATALOG.length
  return ((currentIndex + delta) % catalogLength + catalogLength) % catalogLength
}
