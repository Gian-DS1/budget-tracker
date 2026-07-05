// Conversión emoji unicode → codepoint JoyPixels ("🏠" → "1f3e0"), para armar
// la URL del PNG en el CDN. Antes esto lo hacía emoji-toolkit, pero esa
// librería pesa ~490 kB minificada solo para este mapeo; la convención de
// nombres de JoyPixels es mecánica: codepoints en hex (mínimo 4 dígitos)
// unidos por "-", omitiendo el variation selector (fe0f) y el ZWJ (200d).
// Emoji.codepoints.test.js valida esta regla contra emoji-toolkit (devDep)
// sobre el catálogo completo; cualquier caso raro que se escape cae con
// gracia al emoji nativo vía el onError de <Emoji>.

// ¿Parece un emoji? Pictográficos, banderas (regional indicators) o keycaps
// (⃣). Evita pedir PNGs para strings comunes ("A", "12") que nunca existirán.
const EMOJI_RX = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

// Cache de codepoints resueltos (la resolución es pura; evita recalcular).
const cpCache = new Map();

// Devuelve el codepoint (ej. "1f3e0" o "1f1e9-1f1f4") de un emoji unicode, o
// null si no parece un emoji.
export function emojiCodepoint(emoji) {
  if (!emoji) return null;
  if (cpCache.has(emoji)) return cpCache.get(emoji);
  let cp = null;
  const str = String(emoji).trim();
  if (EMOJI_RX.test(str)) {
    cp = [...str]
      .map((ch) => ch.codePointAt(0).toString(16).padStart(4, '0'))
      .filter((hex) => hex !== 'fe0f' && hex !== '200d')
      .join('-') || null;
  }
  cpCache.set(emoji, cp);
  return cp;
}
