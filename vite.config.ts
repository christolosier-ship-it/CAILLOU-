import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { pwaManifest } from './src/pwa/manifest'

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
      },
    }),
  ],
})
