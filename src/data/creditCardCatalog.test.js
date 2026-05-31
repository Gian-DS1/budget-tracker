import { describe, it, expect } from 'vitest';
import {
  CREDIT_CARD_CATALOG,
  CATALOG_CATEGORIES,
  DEFAULT_CATEGORY_KEYS,
  getCatalogBanks,
  getCatalogCardsByBank,
  getCatalogCard,
} from './creditCardCatalog';

describe('CREDIT_CARD_CATALOG — integridad', () => {
  it('tiene ids únicos', () => {
    const ids = CREDIT_CARD_CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada tarjeta tiene bank, name y al menos una regla', () => {
    for (const card of CREDIT_CARD_CATALOG) {
      expect(card.bank, card.id).toBeTruthy();
      expect(card.name, card.id).toBeTruthy();
      expect(Array.isArray(card.cashback), card.id).toBe(true);
      expect(card.cashback.length, card.id).toBeGreaterThan(0);
    }
  });

  it('cada regla usa una categoryKey válida y un % numérico', () => {
    const valid = new Set([
      'all',
      ...Object.keys(CATALOG_CATEGORIES),
      ...Object.keys(DEFAULT_CATEGORY_KEYS),
    ]);
    for (const card of CREDIT_CARD_CATALOG) {
      for (const r of card.cashback) {
        expect(valid.has(r.categoryKey), `${card.id}:${r.categoryKey}`).toBe(true);
        expect(typeof r.percentage, `${card.id}:${r.categoryKey}`).toBe('number');
      }
    }
  });

  it('helpers de navegación', () => {
    const banks = getCatalogBanks();
    expect(banks).toContain('Banco Popular Dominicano');
    expect(getCatalogCardsByBank('Banco Popular Dominicano').length).toBeGreaterThan(0);
    expect(getCatalogCard('popular-visa-isi')?.name).toBe('Visa ISI');
    expect(getCatalogCard('no-existe')).toBeNull();
  });
});
