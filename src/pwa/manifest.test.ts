import { describe, expect, it } from 'vitest'

import { pwaManifest } from './manifest'

describe('PWA manifest foundation', () => {
  it('declares a stable installable shell identity', () => {
    expect(pwaManifest.id).toBe('/')
    expect(pwaManifest.name).toBe('CAILLOU™')
    expect(pwaManifest.display).toBe('standalone')
    expect(pwaManifest.start_url).toBe('/')
    expect(pwaManifest.scope).toBe('/')
    expect(pwaManifest.prefer_related_applications).toBe(false)
  })

  it('ships the current 192px and 512px install icons', () => {
    expect(pwaManifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512'])
    expect(pwaManifest.icons.every((icon) => icon.purpose === 'any maskable')).toBe(true)
  })
})
