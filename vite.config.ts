import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { pwaManifest } from './src/pwa/manifest.ts'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/pwa-192x192-provisional.png',
        'icons/pwa-512x512-provisional.png',
      ],
      manifest: pwaManifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}'],
        navigateFallback: 'index.html',
        // Rapier makes the production JS bundle ~3.7 MB raw (~1.25 MB gzip).
        // Keep the current offline contract until the dedicated cache/code-splitting pass in step 12.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
