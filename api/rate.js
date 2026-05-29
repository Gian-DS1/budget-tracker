// FinTrack RD — Función serverless (Vercel) que devuelve la tasa USD→DOP de
// venta del Banco Popular usando la API de TasaReal.
//
// Por qué del lado del servidor:
//   - Evita CORS (el navegador no puede pedirle directo a TasaReal/banco).
//   - Mantiene la API key oculta (variable de entorno, nunca en el bundle).
//   - Cachea en el edge de Vercel: 1 llamada upstream cada varias horas sin
//     importar cuántos usuarios, así no se agota el plan gratis (50 req/día).
//
// Requiere la variable de entorno TASAREAL_API_KEY en el proyecto de Vercel.

export default async function handler(req, res) {
  const key = process.env.TASAREAL_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'missing_api_key' });
    return;
  }

  try {
    const upstream = await fetch(
      'https://tasareal.com/api/v1/rates?institution=popular&currency=USD',
      { headers: { Authorization: `Bearer ${key}` } }
    );

    if (!upstream.ok) {
      res.status(502).json({ error: 'upstream_error', status: upstream.status });
      return;
    }

    const data = await upstream.json();
    const popular = Array.isArray(data?.rates)
      ? data.rates.find((x) => x.institution === 'popular') || data.rates[0]
      : null;

    const sell = popular ? Number(popular.sell) : NaN;
    if (!sell || isNaN(sell) || sell <= 0) {
      res.status(502).json({ error: 'no_rate' });
      return;
    }

    // Cachea la respuesta en el edge de Vercel 6h (revalida en segundo plano).
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json({
      rate: sell, // tasa de VENTA del Banco Popular (la que usamos para valorar USD)
      buy: popular.buy != null ? Number(popular.buy) : null,
      source: 'popular',
      updatedAt: popular.updated_at || data.date || null,
    });
  } catch (e) {
    res.status(502).json({ error: 'fetch_failed', message: String(e) });
  }
}
