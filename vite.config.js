import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['/icons/favicon.ico', '/icons/apple-touch-icon.png'],

      manifest: {
        name: 'MetaCleaner, Remove Metadata from Images',
        description:
          'Easily remove metadata from your images with our online tool, MetaCleaner. Preserve your privacy by stripping out EXIF data from your photos in seconds.',
        short_name: 'Meta',
        start_url: '/',

        theme_color: '#CBD5E1',
        display: 'standalone',

        icons: [
          {
            src: '/icons/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/android-chrome-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
};
