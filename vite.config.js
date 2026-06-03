import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { getPopularSellRate } from './api/_tasareal.js'

// Plugin de desarrollo: implementa /api/rate en el dev server de Vite (que no
// ejecuta funciones serverless de Vercel). Así la tasa real del Banco Popular
// se ve igual en `npm run dev` y en producción. Lee TASAREAL_API_KEY del .env
// local (no se expone al cliente; corre solo en el proceso de Node del server).
function tasarealDevApi(apiKey) {
  return {
    name: 'tasareal-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/rate', async (_req, res) => {
        try {
          const data = await getPopularSellRate(apiKey)
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 200
          res.end(JSON.stringify(data))
        } catch (e) {
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = e.code === 'missing_api_key' ? 500 : 502
          res.end(JSON.stringify({ error: e.code || 'fetch_failed' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' como prefijo carga TODAS las variables del .env (incluida la que NO
  // lleva prefijo VITE_, que es server-only y nunca llega al bundle).
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), tasarealDevApi(env.TASAREAL_API_KEY)],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) return 'vendor-supabase';
              if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
                return 'vendor-react';
              }
            }
          },
        },
      },
    },
  }
})
