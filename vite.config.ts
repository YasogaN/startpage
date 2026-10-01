import { VitePWA } from 'vite-plugin-pwa'
import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/types.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
  plugins: [
    // Solid Refresh injects `if (import.meta.hot) { ... }` HMR code into test
    // transforms, which reports as uncovered branches. Tests don't need HMR.
    solid(mode === 'test' ? { hot: false } : {}),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'START',
        short_name: 'START',
        description: 'A minimalist brutalist startpage. Offline-first, no tracking.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the entire build output so the startpage is fully offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
}))
