import { boundedCompanionAssetList } from './cachePolicy'

export async function warmCompanionAssets(urls: readonly string[]) {
  if (typeof window === 'undefined' || !navigator.onLine || !('serviceWorker' in navigator)) return

  const candidates = boundedCompanionAssetList(urls)
  await Promise.allSettled(candidates.map(async (url) => {
    const response = await fetch(url, { cache: 'default', credentials: 'same-origin' })
    if (!response.ok) throw new Error(`Asset warmup failed: ${response.status}`)
  }))
}
