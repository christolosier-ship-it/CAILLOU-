export const pwaManifest = {
  name: 'CAILLOU™',
  short_name: 'CAILLOU™',
  description: 'Une présence minérale de qualité.',
  lang: 'fr',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#f2efe9',
  theme_color: '#f2efe9',
  icons: [
    {
      src: '/icons/pwa-192x192-provisional.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/pwa-512x512-provisional.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
} as const
