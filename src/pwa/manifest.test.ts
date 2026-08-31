import { describe, expect, it } from 'vitest'

import { pwaManifest } from './manifest'

describe('PWA manifest foundation', () => {
  it('declares the installable shell identity', () => {
    expect(pwaManifest.name).toBe('CAILLOU™')
    expect(pwaManifest.display).toBe('standalone')
    expect(pwaManifest.start_url).toBe('/')
  })

  it('ships provisional 192px and 512px icons', () => {
    expect(pwaManifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512'])
    expect(pwaManifest.icons.every((icon) => icon.src.includes('provisional'))).toBe(true)
  })
})
