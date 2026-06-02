// <Emoji> — renderiza un emoji con el set JoyPixels v10 (2025) en vez del emoji
// nativo del sistema (que varía por SO/navegador y rompe la coherencia visual).
//
// Estrategia: emoji-toolkit resuelve el codepoint correcto (maneja secuencias
// ZWJ, variation selectors, skin tones, banderas). Con ese codepoint armamos la
// URL del PNG en el mirror público de JoyPixels (gh/joypixels/emoji-assets@10.0.0
// en jsDelivr; el path "oficial" /joypixels/assets/ está detrás de licencia).
//
// Si la imagen falla (offline, 403, codepoint sin asset), cae con gracia al
// emoji nativo — así nunca queda un hueco roto.
//
// Uso: <Emoji e="🏠" size={18} />  ·  el size va en px (alto = ancho).

import { useState } from 'react';
import joypixels from 'emoji-toolkit';

const JP_VERSION = '10.0.0';
const CDN = `https://cdn.jsdelivr.net/gh/joypixels/emoji-assets@${JP_VERSION}/png/64`;

// Cache de codepoints resueltos (la resolución es pura; evita recalcular).
const cpCache = new Map();

// Devuelve el codepoint (ej. "1f3e0" o "1f1e9-1f1f4") de un emoji unicode, o
// null si no es un emoji conocido por JoyPixels.
function codepointOf(emoji) {
  if (!emoji) return null;
  if (cpCache.has(emoji)) return cpCache.get(emoji);
  let cp;
  try {
    // toImage genera <img ... src=".../<cp>.png"/>; extraemos el filename. Es la
    // vía más robusta porque reutiliza el mapeo interno de JoyPixels.
    const html = joypixels.toImage(emoji);
    const m = html.match(/\/([0-9a-f]+(?:-[0-9a-f]+)*)\.png/i);
    cp = m ? m[1].toLowerCase() : null;
  } catch {
    cp = null;
  }
  cpCache.set(emoji, cp);
  return cp;
}

export default function Emoji({ e, size = 18, className = '', alt }) {
  // Guardamos QUÉ emoji falló (no un booleano), así al cambiar el prop `e` el
  // fallback no se queda pegado del emoji anterior.
  const [failedFor, setFailedFor] = useState(null);
  const cp = codepointOf(e);
  const failed = failedFor === e;

  // Sin codepoint o tras un error de carga: emoji nativo (degradación elegante).
  if (!cp || failed) {
    return (
      <span
        className={className}
        style={{ fontSize: size, lineHeight: 1 }}
        role="img"
        aria-label={alt || e}
      >
        {e}
      </span>
    );
  }

  return (
    <img
      src={`${CDN}/${cp}.png`}
      alt={alt || e}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailedFor(e)}
      // inline-block + vertical-align para que se alinee como texto junto a labels.
      className={`inline-block align-[-0.15em] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
