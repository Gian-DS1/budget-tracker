// Valida que emojiCodepoint (conversión local) produce exactamente el mismo
// codepoint que emoji-toolkit (la librería que reemplazó; queda como devDep
// solo para este test). Corre sobre el catálogo curado completo + casos con
// tono de piel, ZWJ, banderas y keycaps.

import { describe, it, expect } from 'vitest';
import joypixels from 'emoji-toolkit';
import { EMOJI_CATALOG } from '../data/emojiCatalog';
import { emojiCodepoint } from './emojiCodepoint';

function joypixelsCodepoint(emoji) {
  try {
    const html = joypixels.toImage(emoji);
    const m = html.match(/\/([0-9a-f]+(?:-[0-9a-f]+)*)\.png/i);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

describe('emojiCodepoint', () => {
  // Timeout amplio: joypixels.toImage tarda ~60 ms por emoji (regex enormes).
  it('coincide con emoji-toolkit para todo el catálogo curado', { timeout: 30000 }, () => {
    for (const { char } of EMOJI_CATALOG) {
      const expected = joypixelsCodepoint(char);
      // Si joypixels no lo conoce, nuestro valor da igual (el PNG no existe y
      // el onError de <Emoji> cae al nativo); solo comparamos los conocidos.
      if (expected) {
        expect(emojiCodepoint(char), `emoji ${char}`).toBe(expected);
      }
    }
  });

  it('coincide en casos especiales (tonos, ZWJ, banderas, keycaps)', () => {
    const extras = ['👍🏽', '👨‍👩‍👦', '🇩🇴', '🇺🇸', '1️⃣', '#️⃣', '❤️', '☂️', '✈️'];
    for (const char of extras) {
      const expected = joypixelsCodepoint(char);
      if (expected) {
        expect(emojiCodepoint(char), `emoji ${char}`).toBe(expected);
      }
    }
  });

  it('devuelve null para strings que no son emoji', () => {
    expect(emojiCodepoint('A')).toBe(null);
    expect(emojiCodepoint('123')).toBe(null);
    expect(emojiCodepoint('')).toBe(null);
    expect(emojiCodepoint(null)).toBe(null);
  });
});
