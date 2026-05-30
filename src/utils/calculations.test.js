import { describe, it, expect } from 'vitest';
import { getBudgetSummary, getAccumulatedBalance, getMonthlySavingCapacity } from './calculations';

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
