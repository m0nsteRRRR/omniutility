import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // Raise warning threshold (Three.js is intentionally large)
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // rolldown (Vite 8) requires manualChunks as a function
        manualChunks(id) {
          if (id.includes('three'))         return 'three';
          if (id.includes('pdf-lib'))       return 'pdf-lib';
          if (id.includes('pdfjs-dist'))    return 'pdfjs';
          if (id.includes('qrcode'))        return 'qrcode';
          if (id.includes('jszip'))         return 'jszip';
          if (id.includes('react-dom'))     return 'react-vendor';
          if (id.includes('react-dropzone') || id.includes('lucide-react')) return 'utils';
        },
      },
    },
  },

  server: {
    port: 5173,
    // Proxy API calls to local backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
