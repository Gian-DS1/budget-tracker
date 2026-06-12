// Monedas ofrecidas al usuario (ISO 4217) — lista curada, foco LATAM+global.
// El nombre legible sale de Intl.DisplayNames en el idioma actual.
// Exportada: la landing la usa como prueba social ("funciona en tu moneda").
export const COMMON_CURRENCIES = ['USD', 'EUR', 'MXN', 'COP', 'ARS', 'PEN', 'CLP', 'BRL', 'DOP', 'GTQ', 'CRC', 'UYU', 'PYG', 'BOB', 'HNL', 'NIO', 'PAB', 'CAD', 'GBP'];

export function currencyOptions(locale) {
  let names = null;
  try { names = new Intl.DisplayNames([locale], { type: 'currency' }); } catch { /* códigos pelados */ }
  return COMMON_CURRENCIES.map((code) => {
    let label = code;
    try {
      const n = names?.of(code);
      if (n && n !== code) label = `${code} — ${n}`;
    } catch { /* código pelado */ }
    return { value: code, label };
  });
}
