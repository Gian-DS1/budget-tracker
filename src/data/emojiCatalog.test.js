import { describe, it, expect } from 'vitest';
import { EMOJI_CATALOG, EMOJI_GROUPS, searchEmojis } from './emojiCatalog';

describe('emojiCatalog', () => {
  it('tiene al menos 100 emojis', () => {
    expect(EMOJI_CATALOG.length).toBeGreaterThanOrEqual(100);
  });

  it('cada entry tiene char, name, group y keywords array', () => {
    for (const e of EMOJI_CATALOG) {
      expect(typeof e.char, e.name).toBe('string');
      expect(e.char.length, e.name).toBeGreaterThan(0);
      expect(typeof e.name, e.char).toBe('string');
      expect(typeof e.group, e.char).toBe('string');
      expect(Array.isArray(e.keywords), e.char).toBe(true);
    }
  });

  it('no hay chars duplicados', () => {
    const chars = EMOJI_CATALOG.map((e) => e.char);
    expect(new Set(chars).size).toBe(chars.length);
  });

  it('cada group declarado en EMOJI_GROUPS tiene al menos un emoji', () => {
    for (const g of EMOJI_GROUPS) {
      expect(EMOJI_CATALOG.some((e) => e.group === g.id), g.id).toBe(true);
    }
  });

  it('searchEmojis filtra por nombre y keyword (case/acentos-insensible)', () => {
    const byName = searchEmojis('dinero');
    expect(byName.some((e) => e.char === '💰')).toBe(true);
    const byKeyword = searchEmojis('comida');
    expect(byKeyword.length).toBeGreaterThan(0);
    expect(searchEmojis('')).toEqual(EMOJI_CATALOG);
  });
});
