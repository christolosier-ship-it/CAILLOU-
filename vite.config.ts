import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import {
  CODE_CACHE_MAX_AGE_SECONDS,
  CODE_CACHE_MAX_ENTRIES,
  CODE_RUNTIME_CACHE,
  LAZY_CODE_RUNTIME_PATTERN,
  MODEL_CACHE_MAX_AGE_SECONDS,
  MODEL_CACHE_MAX_ENTRIES,
  MODEL_RUNTIME_CACHE,
  MODEL_RUNTIME_PATTERN,
  PREVIEW_CACHE_MAX_AGE_SECONDS,
  PREVIEW_CACHE_MAX_ENTRIES,
  PREVIEW_RUNTIME_CACHE,
  PREVIEW_RUNTIME_PATTERN,
} from './src/pwa/cachePolicy.ts'
import { pwaManifest } from './src/pwa/manifest.ts'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'icons/pwa-192x192-provisional.png',
        'icons/pwa-512x512-provisional.png',
      ],
      manifest: pwaManifest,
      workbox: {
        // Precache only the navigation shell. Heavy scene/physics chunks are learned at first use.
        globPatterns: ['index.html', 'assets/index-*.{js,css}', '**/*.woff2'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: LAZY_CODE_RUNTIME_PATTERN,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: CODE_RUNTIME_CACHE,
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: CODE_CACHE_MAX_ENTRIES,
                maxAgeSeconds: CODE_CACHE_MAX_AGE_SECONDS,
                purgeOnQuotaError: true,
              },
            },
          },
          {
            urlPattern: MODEL_RUNTIME_PATTERN,
            handler: 'CacheFirst',
            options: {
              cacheName: MODEL_RUNTIME_CACHE,
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: MODEL_CACHE_MAX_ENTRIES,
                maxAgeSeconds: MODEL_CACHE_MAX_AGE_SECONDS,
                purgeOnQuotaError: true,
              },
            },
          },
          {
            urlPattern: PREVIEW_RUNTIME_PATTERN,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: PREVIEW_RUNTIME_CACHE,
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: PREVIEW_CACHE_MAX_ENTRIES,
                maxAgeSeconds: PREVIEW_CACHE_MAX_AGE_SECONDS,
                purgeOnQuotaError: true,
              },
            },
          },
        ],
      },
    }),
  ],
})
