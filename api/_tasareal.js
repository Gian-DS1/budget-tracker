// FinTrack RD — Lógica compartida para obtener la tasa de VENTA (sell) del
// Banco Popular vía TasaReal. La usan tanto la función serverless de Vercel
// (api/rate.js) como el middleware del dev server de Vite (vite.config.js),
// para que la tasa real se muestre igual en producción y en local.
//
// El prefijo "_" hace que Vercel NO trate este archivo como una ruta/función.

const TASAREAL_URL =
  'https://tasareal.com/api/v1/rates?institution=popular&currency=USD';

/**
 * Devuelve la tasa de venta del Banco Popular: { rate, buy, source, updatedAt }.
 * Lanza un Error con `.code` ('missing_api_key' | 'upstream_error' | 'no_rate')
 * si algo falla, para que el llamante decida el status HTTP.
 */
export async function getPopularSellRate(apiKey) {
  if (!apiKey) {
    const e = new Error('Falta TASAREAL_API_KEY');
    e.code = 'missing_api_key';
    throw e;
  }

  const upstream = await fetch(TASAREAL_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!upstream.ok) {
    const e = new Error('Respuesta no OK de TasaReal');
    e.code = 'upstream_error';
    e.status = upstream.status;
    throw e;
  }

  const data = await upstream.json();
  const popular = Array.isArray(data?.rates)
    ? data.rates.find((x) => x.institution === 'popular') || data.rates[0]
    : null;

  const sell = popular ? Number(popular.sell) : NaN;
  if (!sell || isNaN(sell) || sell <= 0) {
    const e = new Error('Sin tasa de venta válida');
    e.code = 'no_rate';
    throw e;
  }

  return {
    rate: sell, // tasa de VENTA: la que paga el consumidor
    buy: popular.buy != null ? Number(popular.buy) : null,
    source: 'popular',
    updatedAt: popular.date || data.date || null,
  };
}
