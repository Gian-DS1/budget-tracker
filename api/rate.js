// FinTrack — Función serverless (Vercel) que devuelve la tasa USD→DOP de
// VENTA del Banco Popular usando la API de TasaReal.
//
// Por qué del lado del servidor:
//   - Evita CORS (el navegador no puede pedirle directo a TasaReal/banco).
//   - Mantiene la API key oculta (variable de entorno, nunca en el bundle).
//   - Cachea en el edge de Vercel: pocas llamadas upstream sin importar cuántos
//     usuarios, para no agotar el plan gratis de TasaReal.
//
// Requiere la variable de entorno TASAREAL_API_KEY en el proyecto de Vercel.
// La lógica de fetch/parseo vive en ./_tasareal.js (compartida con el dev server).

import { getPopularSellRate } from './_tasareal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const data = await getPopularSellRate(process.env.TASAREAL_API_KEY);
    // Cachea la respuesta en el edge de Vercel 6h (revalida en segundo plano).
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json(data);
  } catch (e) {
    const status = e.code === 'missing_api_key' ? 500 : 502;
    res.status(status).json({ error: e.code || 'fetch_failed' });
  }
}
