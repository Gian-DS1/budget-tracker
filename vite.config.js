import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Respeta PORT si el entorno lo asigna (p. ej. el preview de Claude Code
  // cuando 5173 está ocupado); sin PORT, Vite usa su 5173 de siempre.
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase';
            // Vendors pesados en chunks propios: cambian poco entre deploys,
            // así el hash (y la caché inmutable del CDN) sobrevive a cambios
            // de código de la app. Con las pantallas lazy, charts/emoji solo
            // se descargan cuando una ruta los usa.
            if (/[\\/](recharts|victory-vendor|d3-[^\\/]+)[\\/]/.test(id)) return 'vendor-charts';
            if (/[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'vendor-motion';
            if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
})
