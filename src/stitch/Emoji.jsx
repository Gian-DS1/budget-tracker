// <Emoji> — renderiza un emoji con el set JoyPixels v10 (2025) en vez del emoji
// nativo del sistema (que varía por SO/navegador y rompe la coherencia visual).
//
// Estrategia: emojiCodepoint (local, ver emojiCodepoint.js) resuelve el nombre
// de archivo JoyPixels. Con ese codepoint armamos la URL del PNG en el mirror
// público de JoyPixels (gh/joypixels/emoji-assets@10.0.0 en jsDelivr; el path
// "oficial" /joypixels/assets/ está detrás de licencia).
//
// Si la imagen falla (offline, 403, codepoint sin asset), cae con gracia al
// emoji nativo — así nunca queda un hueco roto.
//
// Uso: <Emoji e="🏠" size={18} />  ·  el size va en px (alto = ancho).

import { useState } from 'react';
import { emojiCodepoint } from './emojiCodepoint';

const JP_VERSION = '10.0.0';
const CDN = `https://cdn.jsdelivr.net/gh/joypixels/emoji-assets@${JP_VERSION}/png/64`;

export default function Emoji({ e, size = 18, className = '', alt }) {
  // Guardamos QUÉ emoji falló (no un booleano), así al cambiar el prop `e` el
  // fallback no se queda pegado del emoji anterior.
  const [failedFor, setFailedFor] = useState(null);
  const cp = emojiCodepoint(e);
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
