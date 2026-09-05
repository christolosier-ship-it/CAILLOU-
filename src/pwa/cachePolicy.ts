export const PWA_CACHE_VERSION = 'step12-v1'

export const CODE_RUNTIME_CACHE = `caillou-code-${PWA_CACHE_VERSION}`
export const MODEL_RUNTIME_CACHE = `caillou-models-${PWA_CACHE_VERSION}`
export const COLLIDER_RUNTIME_CACHE = `caillou-colliders-${PWA_CACHE_VERSION}`
export const PREVIEW_RUNTIME_CACHE = `caillou-previews-${PWA_CACHE_VERSION}`

export const CODE_CACHE_MAX_ENTRIES = 24
// Active rock + up to eight equipped accessory renders + a very small recent margin.
export const MODEL_CACHE_MAX_ENTRIES = 12
// The current eight-object guard can require one proxy per equipped V2 accessory.
export const COLLIDER_CACHE_MAX_ENTRIES = 10
export const PREVIEW_CACHE_MAX_ENTRIES = 48

export const CODE_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
export const MODEL_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
export const COLLIDER_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
export const PREVIEW_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14

export const LAZY_CODE_RUNTIME_PATTERN = /\/assets\/(?!index-)[^/]+\.js$/
export const MODEL_RUNTIME_PATTERN = /\/assets\/(?:rocks|accessories)\/.+\/model\.glb$/
export const COLLIDER_RUNTIME_PATTERN = /\/assets\/accessories\/[^/]+\/collider\.glb$/
export const PREVIEW_RUNTIME_PATTERN = /\/assets\/(?:rock-previews|accessory-previews)\/.+\.(?:png|webp|jpg|jpeg)$/

export function boundedCompanionAssetList(urls: readonly string[]) {
  return [...new Set(urls.filter(Boolean))].slice(0, 9)
}
