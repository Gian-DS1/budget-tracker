import { describe, it, expect } from 'vitest';
import { getIncomeVsExpenseSeries, getCategoryTrend, getMonthComparison, getInsights } from './selectors';

// refDate fijo para tests deterministas: 15 jun 2026.
const REF = new Date(2026, 5, 15);
const cats = [
  { id: 'c1', name: 'Supermercado', color: '#aaa' },
  { id: 'c2', name: 'Transporte', color: '#bbb' },
];
// helper: transacción en un mes/año dado
const tx = (y, m, categoryId, amount, type = 'variable_expense', cashbackEarned = 0) =>
  ({ date: `${y}-${String(m + 1).padStart(2, '0')}-10`, categoryId, amount, type, cashbackEarned });

describe('getIncomeVsExpenseSeries', () => {
  it('devuelve un punto por mes del rango terminando en refDate', () => {
    const r = getIncomeVsExpenseSeries([], 6, REF);
    expect(r).toHaveLength(6);
    expect(r[5].label).toBe('Jun'); // último = mes de refDate
    expect(r[0]).toEqual({ label: 'Ene', income: 0, expense: 0 });
  });

  it('separa ingreso y gasto y resta cashback del gasto', () => {
    const txs = [
      tx(2026, 5, 'c1', 5000, 'income'),
      tx(2026, 5, 'c1', 1000, 'variable_expense', 100),
      tx(2026, 5, 'c2', 500, 'fixed_expense'),
    ];
    const r = getIncomeVsExpenseSeries(txs, 6, REF);
    const jun = r[5];
    expect(jun.income).toBe(5000);
    expect(jun.expense).toBe(1400); // (1000-100) + 500
  });

  it('respeta el largo del rango (12, 24)', () => {
    expect(getIncomeVsExpenseSeries([], 12, REF)).toHaveLength(12);
    expect(getIncomeVsExpenseSeries([], 24, REF)).toHaveLength(24);
  });
});

describe('getCategoryTrend', () => {
  it('sin gastos → series vacías', () => {
    const r = getCategoryTrend([], cats, 6, REF);
    expect(r.series).toEqual([]);
  });

  it('una serie por top categoría con un punto por mes', () => {
    const txs = [
      tx(2026, 4, 'c1', 1000), // may
      tx(2026, 5, 'c1', 2000), // jun
      tx(2026, 5, 'c2', 300),
    ];
    const r = getCategoryTrend(txs, cats, 6, REF, 5);
    expect(r.months).toHaveLength(6);
    const sm = r.series.find((s) => s.name === 'Supermercado');
    expect(sm).toBeTruthy();
    expect(sm.data).toHaveLength(6);
    expect(sm.data[4]).toBe(1000); // may
    expect(sm.data[5]).toBe(2000); // jun
  });

  it('limita a topN categorías por gasto total', () => {
    const txs = [tx(2026, 5, 'c1', 5000), tx(2026, 5, 'c2', 100)];
    const r = getCategoryTrend(txs, cats, 6, REF, 1);
    expect(r.series).toHaveLength(1);
    expect(r.series[0].name).toBe('Supermercado');
  });
});

describe('getMonthComparison', () => {
  it('calcula delta vs mes anterior por categoría', () => {
    const txs = [
      tx(2026, 4, 'c1', 1000), // may (anterior)
      tx(2026, 5, 'c1', 1500), // jun (actual)
    ];
    const r = getMonthComparison(txs, cats, REF);
    const sm = r.find((x) => x.name === 'Supermercado');
    expect(sm.current).toBe(1500);
    expect(sm.previous).toBe(1000);
    expect(sm.deltaPct).toBeCloseTo(50);
  });

  it('categoría nueva (sin mes anterior) → deltaPct null', () => {
    const txs = [tx(2026, 5, 'c2', 800)];
    const r = getMonthComparison(txs, cats, REF);
    const tr = r.find((x) => x.name === 'Transporte');
    expect(tr.previous).toBe(0);
    expect(tr.deltaPct).toBeNull();
  });

  it('ordena por magnitud de cambio absoluto desc', () => {
    const txs = [
      tx(2026, 4, 'c1', 1000), tx(2026, 5, 'c1', 1100), // delta 100
      tx(2026, 4, 'c2', 200), tx(2026, 5, 'c2', 900),  // delta 700
    ];
    const r = getMonthComparison(txs, cats, REF);
    expect(r[0].name).toBe('Transporte'); // mayor cambio absoluto primero
  });
});

describe('getInsights', () => {
  it('sin datos → valores seguros', () => {
    const r = getInsights([], cats, 6, REF);
    expect(r.avgMonthlyExpense).toBe(0);
    expect(r.topMonth).toBeNull();
    expect(r.topCategory).toBeNull();
    expect(r.avgSavingsRate).toBe(0);
  });

  it('promedio de gasto solo sobre meses con actividad + mes y categoría top', () => {
    const txs = [
      tx(2026, 4, 'c1', 1000, 'variable_expense'),
      tx(2026, 5, 'c1', 3000, 'variable_expense'),
      tx(2026, 5, 'c2', 500, 'fixed_expense'),
      tx(2026, 5, 'c1', 8000, 'income'),
    ];
    const r = getInsights(txs, cats, 6, REF);
    // meses con gasto: may (1000) y jun (3500) → promedio 2250
    expect(r.avgMonthlyExpense).toBeCloseTo(2250);
    expect(r.topMonth.label).toBe('Jun');
    expect(r.topMonth.amount).toBeCloseTo(3500);
    expect(r.topCategory.name).toBe('Supermercado'); // 1000+3000=4000 > 500
    expect(r.topCategory.amount).toBeCloseTo(4000);
  });
});
