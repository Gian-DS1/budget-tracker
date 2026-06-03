import { describe, it, expect } from 'vitest';
import { getBudgetSummary, getBuckets503020, getAccumulatedBalance, getMonthlySavingCapacity, getBudgetSuggestions, getFinancialHealthScore } from './calculations';

const categories = [
  { id: 'inc', type: 'income' },
  { id: 'fix', type: 'fixed_expense' },
  { id: 'var', type: 'variable_expense' },
  { id: 'sav', type: 'savings' },
];

describe('getBudgetSummary', () => {
  it('calcula puedesGastar = ingresoRecibido - comprometido - variableGastado', () => {
    const r = getBudgetSummary({
      monthTransactions: [
        { categoryId: 'inc', amount: 50000 },
        { categoryId: 'var', amount: 3000 },
      ],
      monthBudgets: [
        { categoryId: 'fix', estimatedAmount: 20000 },
        { categoryId: 'sav', estimatedAmount: 5000 },
      ],
      categories,
      debtPlanned: 10000,
      debtPaid: 0,
    });
    expect(r.ingresoRecibido).toBe(50000);
    expect(r.comprometido).toBe(35000); // 20000 fijo + 10000 deuda + 5000 ahorro
    expect(r.variableGastado).toBe(3000);
    expect(r.puedesGastar).toBe(12000);
    expect(r.estado).toBe('good');
  });

  it('marca danger y puedesGastar 0 cuando lo comprometido supera el ingreso recibido', () => {
    const r = getBudgetSummary({
      monthTransactions: [{ categoryId: 'inc', amount: 30000 }],
      monthBudgets: [{ categoryId: 'fix', estimatedAmount: 35000 }],
      categories,
      debtPlanned: 0,
      debtPaid: 0,
    });
    expect(r.disponible).toBe(-5000);
    expect(r.puedesGastar).toBe(0);
    expect(r.estado).toBe('danger');
  });

  it('marca warning cuando el colchón es menor al 10% del ingreso recibido', () => {
    const r = getBudgetSummary({
      monthTransactions: [
        { categoryId: 'inc', amount: 50000 },
        { categoryId: 'var', amount: 1000 },
      ],
      monthBudgets: [{ categoryId: 'fix', estimatedAmount: 46000 }],
      categories,
      debtPlanned: 0,
      debtPaid: 0,
    });
    expect(r.disponible).toBe(3000); // < 5000 (10% de 50000)
    expect(r.estado).toBe('warning');
  });

  it('devuelve estado neutral cuando no hay ingreso recibido', () => {
    const r = getBudgetSummary({
      monthTransactions: [],
      monthBudgets: [{ categoryId: 'fix', estimatedAmount: 20000 }],
      categories,
      debtPlanned: 5000,
      debtPaid: 0,
    });
    expect(r.ingresoRecibido).toBe(0);
    expect(r.puedesGastar).toBe(0);
    expect(r.estado).toBe('neutral');
  });

  it('calcula porAsignar = ingresoEstimado - fijos - variables - ahorro - deuda', () => {
    const r = getBudgetSummary({
      monthTransactions: [],
      monthBudgets: [
        { categoryId: 'inc', estimatedAmount: 60000 },
        { categoryId: 'fix', estimatedAmount: 20000 },
        { categoryId: 'var', estimatedAmount: 15000 },
        { categoryId: 'sav', estimatedAmount: 5000 },
      ],
      categories,
      debtPlanned: 10000,
      debtPaid: 0,
    });
    expect(r.porAsignar).toBe(10000);
  });

  it('clasifica el gasto por el tipo de la categoría, no por transaction.type', () => {
    const r = getBudgetSummary({
      monthTransactions: [
        { categoryId: 'inc', amount: 40000 },
        { categoryId: 'var', amount: 2500, type: 'expense' }, // type genérico ignorado
      ],
      monthBudgets: [],
      categories,
      debtPlanned: 0,
      debtPaid: 0,
    });
    expect(r.variableGastado).toBe(2500);
  });

  it('expone el gastado real por tipo (gastosFijosReal, ahorroReal)', () => {
    const r = getBudgetSummary({
      monthTransactions: [
        { categoryId: 'inc', amount: 60000 },
        { categoryId: 'fix', amount: 18000 },
        { categoryId: 'var', amount: 7000 },
        { categoryId: 'sav', amount: 4000 },
      ],
      monthBudgets: [],
      categories,
      debtPlanned: 0,
      debtPaid: 0,
    });
    expect(r.gastosFijosReal).toBe(18000);
    expect(r.variableGastado).toBe(7000);
    expect(r.ahorroReal).toBe(4000);
  });
});

describe('getBuckets503020', () => {
  const summaryFor = (over) => getBudgetSummary({
    monthTransactions: [
      { categoryId: 'inc', amount: 100000 },
      { categoryId: 'fix', amount: over ? 60000 : 40000 }, // necesidades
      { categoryId: 'var', amount: 20000 },                // gustos
      { categoryId: 'sav', amount: 10000 },                // ahorro
    ],
    monthBudgets: [],
    categories,
    debtPlanned: 0,
    debtPaid: 5000, // se suma al balde ahorro/deuda
  });

  it('calcula límites 50/30/20 sobre el ingreso recibido', () => {
    const b = getBuckets503020(summaryFor(false));
    expect(b.income).toBe(100000);
    expect(b.necesidades.limit).toBe(50000);
    expect(b.gustos.limit).toBe(30000);
    expect(b.ahorroDeuda.limit).toBe(20000);
  });

  it('mapea el gastado real por balde (ahorro incluye el pago de deuda)', () => {
    const b = getBuckets503020(summaryFor(false));
    expect(b.necesidades.spent).toBe(40000);
    expect(b.gustos.spent).toBe(20000);
    expect(b.ahorroDeuda.spent).toBe(15000); // 10000 ahorro + 5000 deuda
    expect(b.necesidades.pct).toBe(80); // 40000/50000
  });

  it('pct supera 100 cuando un balde se sobregasta', () => {
    const b = getBuckets503020(summaryFor(true));
    expect(b.necesidades.spent).toBe(60000);
    expect(b.necesidades.pct).toBe(120); // 60000/50000
  });

  it('con ingreso 0 devuelve límites y pct en 0 (sin NaN ni Infinity)', () => {
    const b = getBuckets503020(getBudgetSummary({
      monthTransactions: [{ categoryId: 'var', amount: 3000 }],
      monthBudgets: [],
      categories,
      debtPlanned: 0,
      debtPaid: 0,
    }));
    expect(b.income).toBe(0);
    expect(b.necesidades.limit).toBe(0);
    expect(b.gustos.pct).toBe(0);
    expect(Number.isFinite(b.gustos.pct)).toBe(true);
  });
});

describe('getBudgetSummary — invariante anti doble-conteo de deuda', () => {
  it('un pago de deuda real (gasto fijo) NO reduce puedesGastar; solo lo hace el plan de deuda', () => {
    // El pago de deuda crea una transacción fixed_expense Y debtPlanned entra en
    // comprometido. puedesGastar debe restar SOLO el plan, nunca también el gasto
    // fijo real, o la deuda se contaría dos veces.
    const r = getBudgetSummary({
      monthTransactions: [
        { categoryId: 'inc', amount: 50000 },
        { categoryId: 'fix', amount: 8000 }, // pago de deuda real (gasto fijo)
      ],
      monthBudgets: [],
      categories,
      debtPlanned: 10000,
      debtPaid: 8000,
    });
    expect(r.comprometido).toBe(10000); // solo el plan de deuda
    expect(r.puedesGastar).toBe(40000); // 50000 - 10000, el 8000 fijo NO se resta
  });
});

describe('getAccumulatedBalance', () => {
  const budgets = [
    { categoryId: 'mar', year: 2026, month: 0, estimatedAmount: 1000 },
    { categoryId: 'mar', year: 2026, month: 1, estimatedAmount: 1000 },
    { categoryId: 'mar', year: 2026, month: 2, estimatedAmount: 1000 },
    { categoryId: 'mar', year: 2026, month: 3, estimatedAmount: 1000 },
    { categoryId: 'mar', year: 2026, month: 4, estimatedAmount: 1000 },
    { categoryId: 'otra', year: 2026, month: 0, estimatedAmount: 9999 },
  ];

  it('bote = presupuestado acumulado - gastado, desde el mes de inicio', () => {
    const r = getAccumulatedBalance({
      categoryId: 'mar',
      accumulationStart: '2026-01',
      budgets,
      transactions: [{ categoryId: 'mar', date: '2026-05-10', amount: 4000 }],
      uptoYear: 2026,
      uptoMonth: 4,
    });
    expect(r.budgeted).toBe(5000);
    expect(r.spent).toBe(4000);
    expect(r.available).toBe(1000);
  });

  it('ignora meses anteriores al inicio', () => {
    const r = getAccumulatedBalance({
      categoryId: 'mar',
      accumulationStart: '2026-03',
      budgets,
      transactions: [],
      uptoYear: 2026,
      uptoMonth: 4,
    });
    expect(r.budgeted).toBe(3000); // marzo, abril, mayo (month 2,3,4)
  });

  it('bote 0 si el inicio es futuro', () => {
    const r = getAccumulatedBalance({
      categoryId: 'mar',
      accumulationStart: '2026-12',
      budgets,
      transactions: [{ categoryId: 'mar', date: '2026-05-10', amount: 500 }],
      uptoYear: 2026,
      uptoMonth: 4,
    });
    expect(r.budgeted).toBe(0);
    expect(r.spent).toBe(0);
    expect(r.available).toBe(0);
  });

  it('permite sobregiro del bote (available negativo)', () => {
    const r = getAccumulatedBalance({
      categoryId: 'mar',
      accumulationStart: '2026-01',
      budgets,
      transactions: [{ categoryId: 'mar', date: '2026-02-10', amount: 5000 }],
      uptoYear: 2026,
      uptoMonth: 1,
    });
    expect(r.budgeted).toBe(2000); // ene + feb
    expect(r.spent).toBe(5000);
    expect(r.available).toBe(-3000);
  });
});

describe('getBudgetSummary — categorías acumulativas', () => {
  const cats = [
    { id: 'inc', type: 'income' },
    { id: 'var', type: 'variable_expense' },
    { id: 'mar', type: 'variable_expense', isAccumulative: true },
  ];

  it('reserva el aporte y excluye el gasto del bote de puedesGastar', () => {
    const r = getBudgetSummary({
      monthTransactions: [
        { categoryId: 'inc', amount: 50000 },
        { categoryId: 'var', amount: 2000 },
        { categoryId: 'mar', amount: 11000 },
      ],
      monthBudgets: [{ categoryId: 'mar', estimatedAmount: 1000 }],
      categories: cats,
      debtPlanned: 0,
      debtPaid: 0,
    });
    expect(r.accumulativePlan).toBe(1000);
    expect(r.accumulativeSpent).toBe(11000);
    expect(r.variableGastado).toBe(2000);
    expect(r.comprometido).toBe(1000);
    expect(r.puedesGastar).toBe(47000);
  });
});

describe('getMonthlySavingCapacity', () => {
  const ref = new Date('2026-05-15T00:00:00'); // mes en curso: mayo 2026

  it('promedia ingresos − gastos de los meses completos previos', () => {
    const txs = [
      // Febrero: +40000 / -20000
      { type: 'income', amount: 40000, date: '2026-02-10' },
      { type: 'expense', amount: 20000, date: '2026-02-12' },
      // Marzo: +40000 / -30000
      { type: 'income', amount: 40000, date: '2026-03-10' },
      { type: 'fixed_expense', amount: 30000, date: '2026-03-12' },
      // Abril: +40000 / -10000
      { type: 'income', amount: 40000, date: '2026-04-10' },
      { type: 'variable_expense', amount: 10000, date: '2026-04-12' },
    ];
    const r = getMonthlySavingCapacity(txs, ref, 3);
    expect(r.monthsCounted).toBe(3);
    // promedio neto = (20000 + 10000 + 30000) / 3 = 20000
    expect(r.capacity).toBe(20000);
  });

  it('excluye el mes en curso y los ahorros no cuentan como gasto', () => {
    const txs = [
      { type: 'income', amount: 40000, date: '2026-05-10' }, // mes en curso: ignorado
      { type: 'income', amount: 30000, date: '2026-04-10' },
      { type: 'savings', amount: 5000, date: '2026-04-11' }, // no resta
      { type: 'expense', amount: 10000, date: '2026-04-12' },
    ];
    const r = getMonthlySavingCapacity(txs, ref, 3);
    expect(r.monthsCounted).toBe(1); // solo abril tuvo actividad
    expect(r.capacity).toBe(20000); // 30000 - 10000
  });

  it('devuelve 0 cuando no hay actividad', () => {
    const r = getMonthlySavingCapacity([], ref, 3);
    expect(r.capacity).toBe(0);
    expect(r.monthsCounted).toBe(0);
  });
});

describe('getBudgetSuggestions', () => {
  const cats = [
    { id: 'super', isActive: true },
    { id: 'luz', isActive: true },
    { id: 'vieja', isActive: false },
  ];

  it('promedia los 3 meses anteriores al mes objetivo (mayo 2026)', () => {
    const txs = [
      // super: feb 3000, mar 3000, abr 3000 → promedio 3000
      { categoryId: 'super', amount: 3000, date: '2026-02-10' },
      { categoryId: 'super', amount: 3000, date: '2026-03-10' },
      { categoryId: 'super', amount: 3000, date: '2026-04-10' },
      // luz: solo abr 1500 → promedio 1500/3 = 500
      { categoryId: 'luz', amount: 1500, date: '2026-04-10' },
    ];
    const r = getBudgetSuggestions(txs, cats, 2026, 4, 3);
    const byId = Object.fromEntries(r.map((x) => [x.categoryId, x.amount]));
    expect(byId.super).toBe(3000);
    expect(byId.luz).toBe(500);
  });

  it('excluye el mes objetivo y meses fuera de la ventana, y categorías inactivas', () => {
    const txs = [
      { categoryId: 'super', amount: 9999, date: '2026-05-10' }, // mes objetivo: ignorado
      { categoryId: 'super', amount: 9999, date: '2026-01-10' }, // fuera de ventana (3 meses): ignorado
      { categoryId: 'vieja', amount: 6000, date: '2026-04-10' }, // categoría inactiva: ignorada
    ];
    const r = getBudgetSuggestions(txs, cats, 2026, 4, 3);
    expect(r).toEqual([]);
  });
});

describe('getFinancialHealthScore', () => {
  it('da score alto (Excelente) con buen ahorro y sin deuda', () => {
    const r = getFinancialHealthScore({ avgIncome: 50000, avgExpense: 30000, monthlyDebt: 0 });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.label).toBe('Excelente');
    expect(Math.round(r.savingsRate * 100)).toBe(40);
  });

  it('da score bajo cuando los gastos casi igualan los ingresos y hay deuda', () => {
    const r = getFinancialHealthScore({ avgIncome: 50000, avgExpense: 48000, monthlyDebt: 5000 });
    expect(r.score).toBeLessThan(40);
    expect(r.label).toBe('Necesita atención');
  });

  it('devuelve "Sin datos" si no hay ingresos', () => {
    const r = getFinancialHealthScore({ avgIncome: 0, avgExpense: 0, monthlyDebt: 0 });
    expect(r.score).toBe(0);
    expect(r.label).toBe('Sin datos');
  });

  it('está acotado entre 0 y 100', () => {
    const r = getFinancialHealthScore({ avgIncome: 100000, avgExpense: 0, monthlyDebt: 0 });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
