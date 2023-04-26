import react from '@vitejs/plugin-react';
// import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    react()
    // VitePWA({
    //   manifest: './src/app.webmanifest',
    //   sw: './src/sw/sw-register.ts',
    //   strategies: 'injectManifest',
    //   injectRegister: false,
    //   workbox: {
    //     swSrc: './src/sw/sw-register.ts',
    //     swDest: 'sw.js'
    //   }
    // })
  ]
  // root: './public',
  // publicDir: 'public',
  // build: {
  // outDir: 'dist',
  // rollupOptions: {
  // input: {
  // main: 'public/index.html',
  // sw: 'src/sw/sw-register.ts'
  // }
  // }
  // }
};
