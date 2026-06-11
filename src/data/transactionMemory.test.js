import { describe, it, expect } from 'vitest';
import { suggestFromHistory } from './transactionMemory';

// Transacción mínima del historial. cardId null = sin tarjeta.
const tx = (description, categoryId, cardId, currency, date) =>
  ({ description, categoryId, cardId, currency, date });

describe('suggestFromHistory', () => {
  it('match exacto devuelve categoría, tarjeta y moneda del historial', () => {
    const hist = [tx('Jumbo', 'super', 'cc1', 'DOP', '2026-05-01')];
    expect(suggestFromHistory('Jumbo', hist)).toEqual(
      { categoryId: 'super', cardId: 'cc1', source: 'exact' });
  });

  it('normaliza acentos y mayúsculas', () => {
    const hist = [tx('Café Atelier', 'resto', 'cc1', 'DOP', '2026-05-01')];
    expect(suggestFromHistory('cafe atelier', hist)?.categoryId).toBe('resto');
  });

  it('exacto gana sobre contención', () => {
    const hist = [
      tx('Uber', 'taxi', null, 'DOP', '2026-05-01'),
      tx('Uber Eats', 'resto', 'cc1', 'DOP', '2026-05-02'),
    ];
    const s = suggestFromHistory('Uber', hist);
    expect(s).toEqual({ categoryId: 'taxi', cardId: '', source: 'exact' });
  });

  it('contención: lo tecleado contiene a lo guardado', () => {
    const hist = [tx('Supermercado Nacional', 'super', 'cc1', 'DOP', '2026-05-01')];
    const s = suggestFromHistory('Supermercado Nacional Av. Lope', hist);
    expect(s).toEqual({ categoryId: 'super', cardId: 'cc1', source: 'partial' });
  });

  it('contención: lo guardado contiene a lo tecleado', () => {
    const hist = [tx('Jumbo Agora Mall', 'super', 'cc1', 'DOP', '2026-05-01')];
    expect(suggestFromHistory('Jumbo', hist)?.categoryId).toBe('super');
  });

  it('frecuencia gana; recencia desempata', () => {
    const hist = [
      tx('Jumbo', 'super', 'cc1', 'DOP', '2026-03-01'),
      tx('Jumbo', 'super', 'cc1', 'DOP', '2026-04-01'),
      tx('Jumbo', 'hogar', 'cc2', 'DOP', '2026-05-01'), // minoría, aunque reciente
    ];
    const s = suggestFromHistory('Jumbo', hist);
    expect(s.categoryId).toBe('super');
    expect(s.cardId).toBe('cc1');
    // Recencia desempata 1-1:
    const empate = [
      tx('Sirena', 'super', null, 'DOP', '2026-03-01'),
      tx('Sirena', 'hogar', null, 'DOP', '2026-05-01'),
    ];
    expect(suggestFromHistory('Sirena', empate).categoryId).toBe('hogar');
  });

  it('cada campo se decide por separado', () => {
    const hist = [
      tx('Amazon', 'ropa', 'cc1', 'USD', '2026-05-01'),
      tx('Amazon', 'ropa', 'cc2', 'USD', '2026-05-02'),
      tx('Amazon', 'hogar', 'cc2', 'USD', '2026-05-03'),
    ];
    const s = suggestFromHistory('Amazon', hist);
    expect(s.categoryId).toBe('ropa');   // 2 vs 1
    expect(s.cardId).toBe('cc2');        // 2 vs 1
  });

  it('"sin tarjeta" es un patrón: no rellena tarjeta', () => {
    const hist = [
      tx('Colmado Wilson', 'super', null, 'DOP', '2026-05-01'),
      tx('Colmado Wilson', 'super', null, 'DOP', '2026-05-02'),
      tx('Colmado Wilson', 'super', 'cc1', 'DOP', '2026-04-01'),
    ];
    expect(suggestFromHistory('Colmado Wilson', hist).cardId).toBe('');
  });

  it('transacciones sin categoría no enseñan categoría', () => {
    const hist = [tx('Pago Raro', '', 'cc1', 'DOP', '2026-05-01')];
    const s = suggestFromHistory('Pago Raro', hist);
    expect(s.categoryId).toBe('');
    expect(s.cardId).toBe('cc1');
  });

  it('descripción corta (<4 chars normalizados) → null', () => {
    const hist = [tx('Uber', 'taxi', null, 'DOP', '2026-05-01')];
    expect(suggestFromHistory('Ub', hist)).toBeNull();
    expect(suggestFromHistory('   ', hist)).toBeNull();
  });

  it('historial vacío o sin match → null', () => {
    expect(suggestFromHistory('Jumbo', [])).toBeNull();
    expect(suggestFromHistory('Jumbo', [tx('Netflix', 'subs', null, 'DOP', '2026-05-01')])).toBeNull();
  });
});
