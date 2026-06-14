import { describe, it, expect } from 'vitest';
import { getCategoryBreakdown, getBudgetUsage, getBudgetPace, getNetWorthSplit, getLiquidCash, getLiquidDelta } from './selectors';

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

describe('getBudgetPace', () => {
  const usage = (spent, budgeted, overBudget = spent > budgeted) => ({ spent, budgeted, overBudget, pct: Math.min(100, (spent / budgeted) * 100), estado: 'good' });

  it('mes pasado o sin presupuesto → null', () => {
    expect(getBudgetPace(usage(100, 1000), { isCurrentMonth: false, dayOfMonth: 10, daysInMonth: 30 })).toBeNull();
    expect(getBudgetPace(null, { isCurrentMonth: true, dayOfMonth: 10, daysInMonth: 30 })).toBeNull();
  });

  it('gasto por debajo del ritmo → ontrack con sobrante proyectado', () => {
    // Día 15 de 30 (50% del mes), gastado 40% del presupuesto.
    const r = getBudgetPace(usage(4000, 10000), { isCurrentMonth: true, dayOfMonth: 15, daysInMonth: 30 });
    expect(r.verdict).toBe('ontrack');
    expect(r.monthPct).toBeCloseTo(50);
    expect(r.projected).toBeCloseTo(8000); // 4000/15*30
    expect(r.leftover).toBeCloseTo(2000);
    expect(r.runOutDay).toBeNull();
  });

  it('gasto acelerado → fast con día estimado de agotamiento', () => {
    // Día 10 de 30, gastado 50%: proyección 15000 sobre 10000.
    const r = getBudgetPace(usage(5000, 10000), { isCurrentMonth: true, dayOfMonth: 10, daysInMonth: 30 });
    expect(r.verdict).toBe('fast');
    expect(r.projected).toBeCloseTo(15000);
    expect(r.runOutDay).toBe(20); // 10000 / (5000/10)
  });

  it('ya sobregirado → over', () => {
    const r = getBudgetPace(usage(12000, 10000), { isCurrentMonth: true, dayOfMonth: 20, daysInMonth: 30 });
    expect(r.verdict).toBe('over');
  });

  it('día 1 no divide por cero y clampa al rango del mes', () => {
    const r = getBudgetPace(usage(500, 10000), { isCurrentMonth: true, dayOfMonth: 0, daysInMonth: 30 });
    expect(r.verdict).toBe('fast'); // 500/1*30 = 15000 > 10000
    expect(r.runOutDay).toBe(20);
  });
});

describe('getLiquidCash', () => {
  it('sin transacciones → solo el saldo inicial', () => {
    expect(getLiquidCash([], 50000)).toBe(50000);
  });

  it('los ingresos suben el efectivo', () => {
    const txs = [tx('c1', 1000, 'income')];
    expect(getLiquidCash(txs, 0)).toBe(1000);
  });

  it('los gastos bajan el efectivo, netos de cashback', () => {
    // gasto 200 con 20 de cashback → resta 180
    const txs = [tx('c1', 200, 'variable_expense', 20)];
    expect(getLiquidCash(txs, 1000)).toBe(820);
  });

  it('los apartados a ahorro (savings) bajan el efectivo', () => {
    const txs = [tx('c1', 500, 'savings')];
    expect(getLiquidCash(txs, 1000)).toBe(500);
  });

  it('combina saldo inicial, ingresos, gastos y ahorros', () => {
    const txs = [
      tx('c1', 2000, 'income'),
      tx('c2', 300, 'variable_expense', 0),
      tx('c3', 150, 'fixed_expense', 0),
      tx('c4', 500, 'savings'),
    ];
    // 1000 + 2000 - 300 - 150 - 500 = 2050
    expect(getLiquidCash(txs, 1000)).toBe(2050);
  });

  it('saldo inicial inválido o ausente → tratado como 0', () => {
    expect(getLiquidCash([tx('c1', 100, 'income')], undefined)).toBe(100);
  });
});

describe('getLiquidDelta', () => {
  it('sin transacciones → 0', () => {
    expect(getLiquidDelta([])).toBe(0);
  });

  it('income − gastos netos − savings del mes', () => {
    const txs = [
      tx('c1', 5000, 'income'),
      tx('c2', 1200, 'variable_expense', 200), // neto 1000
      tx('c3', 500, 'savings'),
    ];
    // 5000 - 1000 - 500 = 3500
    expect(getLiquidDelta(txs)).toBe(3500);
  });

  it('mes negativo cuando se gasta más de lo que entra', () => {
    const txs = [tx('c1', 1000, 'income'), tx('c2', 1500, 'fixed_expense', 0)];
    expect(getLiquidDelta(txs)).toBe(-500);
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
