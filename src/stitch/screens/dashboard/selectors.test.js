import { describe, it, expect } from 'vitest';
import { getCategoryBreakdown, getBudgetUsage, getNetWorthSplit } from './selectors';

const cats = [
  { id: 'c1', name: 'Supermercado', color: '#aaa' },
  { id: 'c2', name: 'Transporte', color: '#bbb' },
  { id: 'c3', name: 'Restaurantes', color: '#ccc' },
  { id: 'c4', name: 'Suscripciones', color: '#ddd' },
  { id: 'c5', name: 'Salud', color: '#eee' },
  { id: 'c6', name: 'Ropa', color: '#fff' },
  { id: 'c7', name: 'Otros gastos', color: '#111' },
];
const tx = (categoryId, amount, type = 'variable_expense', cashbackEarned = 0) => ({ categoryId, amount, type, cashbackEarned });

describe('getCategoryBreakdown', () => {
  it('sin gastos → arreglo vacío', () => {
    expect(getCategoryBreakdown([], cats)).toEqual([]);
  });

  it('ignora ingresos y ahorros; resta cashback', () => {
    const txs = [tx('c1', 1000, 'income'), tx('c1', 500, 'savings'), tx('c1', 200, 'variable_expense', 20)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Supermercado');
    expect(r[0].value).toBe(180); // 200 - 20 cashback
  });

  it('con ≤5 categorías no agrega "Otros"', () => {
    const txs = [tx('c1', 500), tx('c2', 400), tx('c3', 300)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r.map((x) => x.name)).toEqual(['Supermercado', 'Transporte', 'Restaurantes']);
    expect(r.some((x) => x.name === 'Otros')).toBe(false);
  });

  it('con >5 categorías deja top 5 y agrega "Otros" con el resto', () => {
    const txs = [tx('c1', 600), tx('c2', 500), tx('c3', 400), tx('c4', 300), tx('c5', 200), tx('c6', 100), tx('c7', 50)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r).toHaveLength(6); // top 5 + Otros
    expect(r[5].name).toBe('Otros');
    expect(r[5].value).toBe(150); // 100 + 50
  });

  it('ordena de mayor a menor', () => {
    const txs = [tx('c2', 100), tx('c1', 900)];
    const r = getCategoryBreakdown(txs, cats);
    expect(r[0].name).toBe('Supermercado');
    expect(r[0].value).toBe(900);
  });
});

describe('getBudgetUsage', () => {
  it('sin ingreso ni plan → null', () => {
    expect(getBudgetUsage({ estado: 'neutral', gastosFijosPlan: 0, gastosVariablesPlan: 0, ahorroPlan: 0, gastosFijosReal: 0, variableGastado: 0, ahorroReal: 0 })).toBeNull();
  });

  it('calcula gastado, presupuestado, pct y estado', () => {
    const r = getBudgetUsage({ estado: 'good', gastosFijosPlan: 20000, gastosVariablesPlan: 10000, ahorroPlan: 5000, gastosFijosReal: 18000, variableGastado: 7000, ahorroReal: 5000 });
    expect(r.budgeted).toBe(35000); // 20000+10000+5000
    expect(r.spent).toBe(30000);    // 18000+7000+5000
    expect(r.pct).toBeCloseTo((30000 / 35000) * 100);
    expect(r.estado).toBe('good');
    expect(r.overBudget).toBe(false);
  });

  it('marca sobregiro cuando gastado supera presupuestado', () => {
    const r = getBudgetUsage({ estado: 'danger', gastosFijosPlan: 10000, gastosVariablesPlan: 0, ahorroPlan: 0, gastosFijosReal: 12000, variableGastado: 0, ahorroReal: 0 });
    expect(r.overBudget).toBe(true);
    expect(r.pct).toBe(100); // tope visual
  });
});

describe('getNetWorthSplit', () => {
  it('sin datos → hasData false', () => {
    const r = getNetWorthSplit(0, 0);
    expect(r.hasData).toBe(false);
  });

  it('solo ahorro → 100% ahorro', () => {
    const r = getNetWorthSplit(50000, 0);
    expect(r.savedPct).toBe(100);
    expect(r.debtPct).toBe(0);
    expect(r.netWorth).toBe(50000);
    expect(r.hasData).toBe(true);
  });

  it('ahorro + deuda → proporciones y patrimonio neto', () => {
    const r = getNetWorthSplit(60000, 40000);
    expect(r.savedPct).toBeCloseTo(60);
    expect(r.debtPct).toBeCloseTo(40);
    expect(r.netWorth).toBe(20000);
  });
});
