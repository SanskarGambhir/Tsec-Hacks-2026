import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    // ✅ PWA plugin
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // allows PWA testing during dev (ngrok)
      },
      manifest: {
        name: 'My React PWA',
        short_name: 'ReactPWA',
        description: 'React + Vite Progressive Web App',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'image192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'image512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],

  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },

  server: {
    allowedHosts: [
      'b755-103-246-224-203.ngrok-free.app'
    ]
  }
})