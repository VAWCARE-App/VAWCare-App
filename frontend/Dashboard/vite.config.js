import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',   // required if using workbox options
      includeAssets: [
        'favicon.ico',
        'robots.txt',
        'apple-touch-icon.png'
      ],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 // 6MB
      }
    })
  ]
})
