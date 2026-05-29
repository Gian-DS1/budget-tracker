import { describe, it, expect } from 'vitest';
import { getBudgetSummary, getAccumulatedBalance } from './calculations';

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
