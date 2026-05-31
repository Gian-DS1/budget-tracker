import { describe, it, expect } from 'vitest';
import {
  CREDIT_CARD_CATALOG,
  CATALOG_CATEGORIES,
  DEFAULT_CATEGORY_KEYS,
  getCatalogBanks,
  getCatalogCardsByBank,
  getCatalogCard,
  resolveCardCashback,
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

describe('resolveCardCashback', () => {
  const userCats = [
    { id: 'u-super', name: 'Supermercado', type: 'variable_expense' },
    { id: 'u-amazon', name: 'Amazon', type: 'variable_expense' },
    { id: 'u-combu', name: 'Combustible', type: 'variable_expense' },
  ];

  it("mantiene 'all' literal", async () => {
    const tpl = { cashback: [{ categoryKey: 'all', percentage: 1 }] };
    const rules = await resolveCardCashback(tpl, userCats, async () => 'x');
    expect(rules).toEqual([{ categoryId: 'all', percentage: 1 }]);
  });

  it('resuelve categoría por defecto por nombre+tipo (usuario sin slugs)', async () => {
    const tpl = { cashback: [{ categoryKey: 'supermercado', percentage: 5 }] };
    const rules = await resolveCardCashback(tpl, userCats, async () => 'x');
    expect(rules).toEqual([{ categoryId: 'u-super', percentage: 5 }]);
  });

  it('resuelve por slug cuando la categoría lo tiene (aunque el nombre difiera)', async () => {
    const cats = [{ id: 'u-1', name: 'Mi Súper', type: 'variable_expense', slug: 'supermercado' }];
    const tpl = { cashback: [{ categoryKey: 'supermercado', percentage: 5 }] };
    const rules = await resolveCardCashback(tpl, cats, async () => 'x');
    expect(rules).toEqual([{ categoryId: 'u-1', percentage: 5 }]);
  });

  it('crea la categoría de ecosistema bajo demanda si no existe', async () => {
    const created = [];
    const ensure = async (def) => { created.push(def.name); return 'u-bravo'; };
    const tpl = { cashback: [{ categoryKey: 'bravo', percentage: 7 }] };
    const rules = await resolveCardCashback(tpl, userCats, ensure);
    expect(created).toEqual(['Bravo']);
    expect(rules).toEqual([{ categoryId: 'u-bravo', percentage: 7 }]);
  });

  it('reutiliza la categoría de ecosistema existente (no la recrea)', async () => {
    const cats = [{ id: 'u-bravo', name: 'Bravo', type: 'variable_expense' }];
    let calls = 0;
    const ensure = async () => { calls++; return 'NUEVA'; };
    const tpl = { cashback: [{ categoryKey: 'bravo', percentage: 7 }] };
    const rules = await resolveCardCashback(tpl, cats, ensure);
    expect(calls).toBe(0);
    expect(rules).toEqual([{ categoryId: 'u-bravo', percentage: 7 }]);
  });

  it('omite la regla si la categoría por defecto fue borrada por el usuario', async () => {
    const tpl = { cashback: [{ categoryKey: 'mascotas', percentage: 5 }, { categoryKey: 'all', percentage: 1 }] };
    const rules = await resolveCardCashback(tpl, userCats, async () => 'x');
    expect(rules).toEqual([{ categoryId: 'all', percentage: 1 }]);
  });

  it('Premia: telecom genera dos reglas (internet + teléfono) con el mismo %', async () => {
    const cats = [
      { id: 'u-net', name: 'Internet', type: 'fixed_expense' },
      { id: 'u-tel', name: 'Teléfono', type: 'fixed_expense' },
    ];
    const tpl = getCatalogCard('bhd-visa-premia');
    const rules = await resolveCardCashback(tpl, cats, async () => 'x');
    expect(rules).toContainEqual({ categoryId: 'u-net', percentage: 5 });
    expect(rules).toContainEqual({ categoryId: 'u-tel', percentage: 5 });
  });
});
